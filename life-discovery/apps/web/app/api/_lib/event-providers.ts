import {
  dedupeRecommendations,
  mapRssItemToRecommendation,
  mapScrapedEventToRecommendation,
  mapSnapshotItem,
  type RecommendationPayload,
} from "./recommendation-mapper";
import { fetchRssFeed } from "./rss";
import { LOCAL_EVENT_SOURCES } from "./source-registry";

const FETCH_HEADERS = {
  "User-Agent": "RoteiroADois/1.0 (+https://besthingstodo-plum.vercel.app)",
  Accept: "text/html,application/xhtml+xml,application/xml",
  "Accept-Language": "pt-BR,pt;q=0.9",
};

const SKIP_TITLE_KEYWORDS = ["brasil", "nacional", "internacional", "politica", "política", "eleição"];

function parsePrice(text: string): number | null {
  if (/gratu[ií]to|free|gratuita|entrada livre|sem cobran/i.test(text)) return 0;
  const match = text.match(/R\$\s*(\d+[\.,]?\d*)/i);
  if (match) return Number(match[1].replace(",", "."));
  return null;
}

function enrichTags(title: string, base: string[]) {
  const text = title.toLowerCase();
  const tags = new Set(base.map((tag) => tag.toLowerCase()));
  const dictionary: Record<string, string[]> = {
    gratuito: ["gratuito", "gratis", "de graça", "livre"],
    música: ["show", "concerto", "música", "musica", "jazz", "rock"],
    gastronomia: ["gastronomia", "food", "degustação", "vinho", "feira"],
    cultura: ["exposição", "exposicao", "museu", "teatro", "cultural"],
    casal: ["casal", "romântico", "romantico", "date"],
  };
  for (const [tag, keywords] of Object.entries(dictionary)) {
    if (keywords.some((keyword) => text.includes(keyword))) tags.add(tag);
  }
  return Array.from(tags);
}

async function fetchHtml(url: string, timeoutMs = 12000): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: FETCH_HEADERS,
      signal: controller.signal,
      redirect: "follow",
      next: { revalidate: 1800 },
    });
    if (!res.ok) return null;
    return res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function extractJsonLdNodes(html: string): Record<string, unknown>[] {
  const scripts = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || [];
  const nodes: Record<string, unknown>[] = [];

  for (const block of scripts) {
    const payload = block.replace(/<\/?script[^>]*>/gi, "").trim();
    if (!payload) continue;
    try {
      const parsed = JSON.parse(payload);
      const items = Array.isArray(parsed) ? parsed : parsed["@graph"] ? parsed["@graph"] : [parsed];
      for (const item of items) {
        if (item && typeof item === "object") nodes.push(item as Record<string, unknown>);
      }
    } catch {
      continue;
    }
  }

  return nodes;
}

function readLocationName(location: unknown): string {
  if (!location || typeof location !== "object") return "São Paulo";
  const loc = location as Record<string, unknown>;
  if (typeof loc.name === "string" && loc.name.trim()) return loc.name.trim();
  const address = loc.address;
  if (address && typeof address === "object") {
    const street = (address as Record<string, unknown>).streetAddress;
    if (typeof street === "string" && street.trim()) return street.trim();
  }
  return "São Paulo";
}

function readOfferPrice(offers: unknown): number | null {
  if (!offers) return null;
  if (Array.isArray(offers)) return readOfferPrice(offers[0]);
  if (typeof offers === "object") {
    const price = (offers as Record<string, unknown>).price;
    if (typeof price === "number") return price;
    if (typeof price === "string") return parsePrice(price);
  }
  return null;
}

function mapJsonLdEvent(item: Record<string, unknown>, source: string, qualityScore: number): RecommendationPayload | null {
  const title = String(item.name || "").trim();
  if (title.length < 6) return null;

  let url = String(item.url || "").trim();
  if (url && !url.startsWith("http")) url = `https://${url.replace(/^\/+/, "")}`;
  if (!url) return null;

  const description = String(item.description || `Evento em São Paulo — ${title}`).slice(0, 420);
  const date = String(item.startDate || item.startTime || item.datePublished || "") || null;
  const image = item.image;
  const image_url =
    typeof image === "string"
      ? image
      : image && typeof image === "object" && typeof (image as { url?: string }).url === "string"
        ? (image as { url: string }).url
        : null;

  return mapScrapedEventToRecommendation({
    title,
    description,
    url,
    source,
    venue: readLocationName(item.location),
    city: "São Paulo",
    date,
    price: readOfferPrice(item.offers) ?? parsePrice(`${title} ${description}`),
    category: "event",
    tags: enrichTags(title, [source.toLowerCase(), "sao paulo"]),
    image_url,
    quality_score: qualityScore,
  });
}

function extractJsonLdEvents(html: string, source: string, qualityScore: number, allowedTypes = new Set(["Event"])) {
  const events: RecommendationPayload[] = [];
  const seen = new Set<string>();

  for (const node of extractJsonLdNodes(html)) {
    const type = String(node["@type"] || "");
    if (!allowedTypes.has(type)) continue;
    const mapped = mapJsonLdEvent(node, source, qualityScore);
    if (!mapped) continue;
    const key = `${mapped.title}|${mapped.url}`;
    if (seen.has(key)) continue;
    seen.add(key);
    events.push(mapped);
  }

  return events;
}

function extractLinkCards(
  html: string,
  options: {
    source: string;
    qualityScore: number;
    hrefPattern: RegExp;
    baseUrl: string;
    titlePattern?: RegExp;
    maxItems?: number;
  }
) {
  const events: RecommendationPayload[] = [];
  const seen = new Set<string>();
  const anchorRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;

  for (const match of html.matchAll(anchorRegex)) {
    const href = match[1];
    const inner = match[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (!href || !options.hrefPattern.test(href)) continue;

    const url = href.startsWith("http") ? href : `${options.baseUrl}${href.startsWith("/") ? href : `/${href}`}`;
    if (seen.has(url)) continue;

    const title = inner.split("|")[0].trim().slice(0, 140);
    if (title.length < 8) continue;
    if (SKIP_TITLE_KEYWORDS.some((keyword) => title.toLowerCase().includes(keyword))) continue;

    seen.add(url);
    events.push(
      mapScrapedEventToRecommendation({
        title,
        description: `Evento em São Paulo — ${title}`,
        url,
        source: options.source,
        venue: "São Paulo",
        city: "São Paulo",
        category: "event",
        tags: enrichTags(title, [options.source.toLowerCase(), "sao paulo"]),
        quality_score: options.qualityScore,
      })
    );

    if (events.length >= (options.maxItems || 20)) break;
  }

  return events;
}

export async function fetchRssLocalEvents(limitPerSource = 12): Promise<RecommendationPayload[]> {
  const items: RecommendationPayload[] = [];

  for (const source of LOCAL_EVENT_SOURCES) {
    for (const feedUrl of source.feeds || []) {
      const feedItems = await fetchRssFeed(feedUrl, 12);
      for (const item of feedItems.slice(0, limitPerSource)) {
        if (SKIP_TITLE_KEYWORDS.some((keyword) => item.title.toLowerCase().includes(keyword))) continue;
        items.push(
          mapRssItemToRecommendation(item, {
            sourceLabel: source.label,
            domain: "events_exhibitions",
            contentTier: source.contentTier,
            baseTags: source.tags,
            categoryFallback: "event",
            qualityScore: 74 + Math.floor(source.curationBoost / 3),
          })
        );
      }
    }
  }

  return items;
}

export async function fetchCatracaLivreAgenda(limit = 18): Promise<RecommendationPayload[]> {
  const html = await fetchHtml("https://catracalivre.com.br/sp/agenda/");
  if (!html) return [];

  const fromJsonLd = extractJsonLdEvents(html, "Catraca Livre", 80);
  if (fromJsonLd.length >= 8) return fromJsonLd.slice(0, limit);

  const fromLinks = extractLinkCards(html, {
    source: "Catraca Livre",
    qualityScore: 78,
    hrefPattern: /catracalivre\.com\.br/i,
    baseUrl: "https://catracalivre.com.br",
    maxItems: limit,
  });

  return dedupeRecommendations([...fromJsonLd, ...fromLinks]).slice(0, limit);
}

export async function fetchTimeoutSpEvents(limit = 16): Promise<RecommendationPayload[]> {
  const pages = [
    "https://www.timeout.com.br/sao-paulo/coisas-para-fazer/o-que-fazer-em-sao-paulo-este-fim-de-semana",
    "https://www.timeout.com.br/sao-paulo/museus/melhores-museus-sao-paulo",
  ];

  const merged: RecommendationPayload[] = [];
  for (const pageUrl of pages) {
    const html = await fetchHtml(pageUrl);
    if (!html) continue;

    const allowed = new Set(["Event", "TouristAttraction", "Museum"]);
    const fromJsonLd = extractJsonLdEvents(html, "Time Out SP", 79, allowed);
    const fromLinks = extractLinkCards(html, {
      source: "Time Out SP",
      qualityScore: 77,
      hrefPattern: /timeout\.com\.br\/sao-paulo/i,
      baseUrl: "https://www.timeout.com.br",
      maxItems: 12,
    });
    merged.push(...fromJsonLd, ...fromLinks);
  }

  return dedupeRecommendations(merged).slice(0, limit);
}

export async function fetchSymplaEvents(limit = 20): Promise<RecommendationPayload[]> {
  const html = await fetchHtml("https://www.sympla.com.br/eventos/sao-paulo-sp");
  if (!html) return [];

  const fromJsonLd = extractJsonLdEvents(html, "Sympla", 82);
  if (fromJsonLd.length >= 8) return fromJsonLd.slice(0, limit);

  return extractLinkCards(html, {
    source: "Sympla",
    qualityScore: 80,
    hrefPattern: /\/evento\//i,
    baseUrl: "https://www.sympla.com.br",
    maxItems: limit,
  });
}

export async function fetchFeverEvents(limit = 16): Promise<RecommendationPayload[]> {
  const html = await fetchHtml("https://feverup.com/pt/sao-paulo");
  if (!html) return [];

  const fromJsonLd = extractJsonLdEvents(html, "Fever", 80);
  const fromLinks = extractLinkCards(html, {
    source: "Fever",
    qualityScore: 78,
    hrefPattern: /feverup\.com\/pt\/sao-paulo\//i,
    baseUrl: "https://feverup.com",
    maxItems: limit,
  });

  return dedupeRecommendations([...fromJsonLd, ...fromLinks]).slice(0, limit);
}

export async function fetchLiveEventProviders(options?: { limit?: number }) {
  const limit = options?.limit ?? 20;
  const results = await Promise.allSettled([
    fetchCatracaLivreAgenda(limit),
    fetchTimeoutSpEvents(limit),
    fetchSymplaEvents(limit),
    fetchFeverEvents(limit),
  ]);

  const merged: RecommendationPayload[] = [];
  for (const result of results) {
    if (result.status === "fulfilled") merged.push(...result.value);
  }

  return dedupeRecommendations(merged).slice(0, limit * 2);
}

export async function fetchAllLocalEvents(options?: {
  limit?: number;
  includeSnapshots?: boolean;
  gastroOnly?: boolean;
}) {
  const limit = options?.limit ?? 24;
  const [rssItems, liveItems] = await Promise.all([
    fetchRssLocalEvents(10),
    fetchLiveEventProviders({ limit: 18 }),
  ]);

  const snapshots: RecommendationPayload[] = [];
  if (options?.includeSnapshots !== false) {
    try {
      const { readFile } = await import("node:fs/promises");
      const path = await import("node:path");
      const symplaRaw = await readFile(path.join(process.cwd(), "public", "data", "sympla-events.json"), "utf8");
      snapshots.push(...(JSON.parse(symplaRaw) as Array<Record<string, unknown>>).map((item) => mapSnapshotItem(item)));
      if (options?.gastroOnly !== false) {
        const gastroRaw = await readFile(path.join(process.cwd(), "public", "data", "gastro-events.json"), "utf8");
        snapshots.push(...(JSON.parse(gastroRaw) as Array<Record<string, unknown>>).map((item) => mapSnapshotItem(item)));
      }
    } catch {
      // snapshots optional
    }
  }

  return dedupeRecommendations([...liveItems, ...rssItems, ...snapshots]).slice(0, limit);
}
