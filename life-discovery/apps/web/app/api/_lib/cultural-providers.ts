import { dedupeRecommendations, mapScrapedEventToRecommendation, type RecommendationPayload } from "./recommendation-mapper";

const FETCH_HEADERS = {
  "User-Agent": "RoteiroADois/1.0 (+https://besthingstodo-plum.vercel.app)",
  Accept: "application/json,text/html",
  "Accept-Language": "pt-BR,pt;q=0.9",
};

const SESC_CULTURAL_CATEGORY_IDS = [682, 230, 225, 241, 245];

type WpPost = {
  id: number;
  link: string;
  date: string;
  title?: { rendered?: string };
  excerpt?: { rendered?: string };
  _embedded?: {
    "wp:featuredmedia"?: Array<{ source_url?: string }>;
  };
};

type MuseumScrapeConfig = {
  pages: string[];
  baseUrl: string;
  hrefPattern: RegExp;
  hrefExclude?: RegExp;
  listingEndsWith?: string;
  source: string;
  venue: string;
  descriptionPrefix: string;
  tags: string[];
  qualityScore: number;
  contentTier: "signature" | "curated";
  category?: string;
  defaultPrice?: number | null;
};

function stripHtml(value: string) {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

function slugToTitle(url: string) {
  const slug = url.replace(/\/$/, "").split("/").pop() || "";
  return decodeHtmlEntities(slug.replace(/-/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()));
}

function parsePrice(text: string): number | null {
  if (/gratu[ií]to|gratuita|entrada livre|acesso gratuito/i.test(text)) return 0;
  const match = text.match(/R\$\s*(\d+[\.,]?\d*)/i);
  if (match) return Number(match[1].replace(",", "."));
  return null;
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

function extractJsonLdEvents(html: string, allowedTypes: Set<string>) {
  const scripts = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || [];
  const events: Array<Record<string, unknown>> = [];

  for (const block of scripts) {
    const payload = block.replace(/<\/?script[^>]*>/gi, "").trim();
    if (!payload) continue;
    try {
      const parsed = JSON.parse(payload);
      const nodes = Array.isArray(parsed) ? parsed : parsed["@graph"] ? parsed["@graph"] : [parsed];
      for (const node of nodes) {
        if (!node || typeof node !== "object") continue;
        const type = String((node as Record<string, unknown>)["@type"] || "");
        if (allowedTypes.has(type)) events.push(node as Record<string, unknown>);
      }
    } catch {
      continue;
    }
  }

  return events;
}

function mapJsonLdExhibition(
  item: Record<string, unknown>,
  config: MuseumScrapeConfig
): RecommendationPayload | null {
  const title = String(item.name || "").trim();
  if (title.length < 6) return null;

  let url = String(item.url || "").trim();
  if (url && !url.startsWith("http")) url = new URL(url, config.baseUrl).toString();
  if (!url) return null;

  const description = String(item.description || `${config.descriptionPrefix} — ${title}`).slice(0, 420);
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
    source: config.source,
    venue: config.venue,
    city: "São Paulo",
    date: String(item.startDate || item.startTime || item.datePublished || "") || null,
    price: parsePrice(description) ?? config.defaultPrice ?? null,
    category: config.category || "exhibition",
    tags: config.tags,
    image_url,
    quality_score: config.qualityScore,
    content_tier: config.contentTier,
  });
}

async function fetchMuseumExhibitions(config: MuseumScrapeConfig, limit = 16): Promise<RecommendationPayload[]> {
  const merged: RecommendationPayload[] = [];
  const seen = new Set<string>();
  const allowedTypes = new Set(["Event", "ExhibitionEvent", "VisualArtwork", "TheaterEvent", "ScreeningEvent"]);

  for (const pageUrl of config.pages) {
    const html = await fetchHtml(pageUrl);
    if (!html) continue;

    for (const node of extractJsonLdEvents(html, allowedTypes)) {
      const mapped = mapJsonLdExhibition(node, config);
      if (!mapped?.url) continue;
      const key = mapped.url.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(mapped);
      if (merged.length >= limit) return merged;
    }

    const anchorRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
    for (const match of html.matchAll(anchorRegex)) {
      let href = match[1];
      if (!config.hrefPattern.test(href)) continue;
      if (config.hrefExclude?.test(href)) continue;

      if (href.startsWith("/")) href = new URL(href, config.baseUrl).toString();
      href = href.split("#")[0].replace(/\/$/, "");
      if (config.listingEndsWith && href.endsWith(config.listingEndsWith)) continue;
      if (seen.has(href)) continue;

      const inner = match[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      const title = inner.length >= 5 ? inner.slice(0, 140) : slugToTitle(href);
      if (title.length < 5) continue;
      seen.add(href);

      const imgMatch = match[2].match(/<img[^>]+src=["']([^"']+)["']/i);
      const image_url = imgMatch?.[1] ? new URL(imgMatch[1], config.baseUrl).toString() : null;

      merged.push(
        mapScrapedEventToRecommendation({
          title,
          description: `${config.descriptionPrefix} — ${title}`,
          url: href,
          source: config.source,
          venue: config.venue,
          city: "São Paulo",
          category: config.category || "exhibition",
          tags: config.tags,
          image_url,
          price: parsePrice(inner) ?? config.defaultPrice ?? null,
          quality_score: config.qualityScore,
          content_tier: config.contentTier,
        })
      );

      if (merged.length >= limit) return merged;
    }
  }

  return merged;
}

export async function fetchSescSpEvents(limit = 18): Promise<RecommendationPayload[]> {
  const params = new URLSearchParams({
    per_page: String(Math.min(limit, 20)),
    categories: SESC_CULTURAL_CATEGORY_IDS.join(","),
    orderby: "date",
    order: "desc",
    _embed: "1",
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(`https://www.sescsp.org.br/wp-json/wp/v2/posts?${params.toString()}`, {
      headers: FETCH_HEADERS,
      signal: controller.signal,
      next: { revalidate: 1800 },
    });
    if (!res.ok) return [];

    const posts = (await res.json()) as WpPost[];
    return posts
      .map((post) => {
        const title = stripHtml(decodeHtmlEntities(post.title?.rendered || ""));
        if (title.length < 8) return null;

        const description = stripHtml(decodeHtmlEntities(post.excerpt?.rendered || "")).slice(0, 420);
        const image_url = post._embedded?.["wp:featuredmedia"]?.[0]?.source_url || null;

        return mapScrapedEventToRecommendation({
          title,
          description: description || `Programação cultural Sesc SP — ${title}`,
          url: post.link,
          source: "Sesc SP",
          venue: "Sesc SP",
          city: "São Paulo",
          date: post.date,
          price: /gratuit|grátis|entrada livre/i.test(`${title} ${description}`) ? 0 : null,
          category: "cultural",
          tags: ["sesc", "cultural", "sao paulo", "gratuito"],
          image_url,
          quality_score: 84,
          content_tier: "curated",
        });
      })
      .filter(Boolean) as RecommendationPayload[];
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

const MASP_CONFIG: MuseumScrapeConfig = {
  pages: ["https://masp.org.br/exposicoes"],
  baseUrl: "https://masp.org.br",
  hrefPattern: /\/exposicoes\//i,
  listingEndsWith: "/exposicoes",
  source: "MASP",
  venue: "MASP",
  descriptionPrefix: "Exposição no MASP",
  tags: ["masp", "exposição", "arte", "museu", "cultural"],
  qualityScore: 86,
  contentTier: "signature",
};

const PINACOTECA_CONFIG: MuseumScrapeConfig = {
  pages: [
    "https://pinacoteca.org.br/programacao/",
    "https://pinacoteca.org.br/visita/exposicoes-em-cartaz/",
  ],
  baseUrl: "https://pinacoteca.org.br",
  hrefPattern: /pinacoteca\.org\.br\/(programacao|visita|exposic)/i,
  hrefExclude: /\/programacao\/?$|\/visita\/?$|\/exposicoes-em-cartaz\/?$/,
  source: "Pinacoteca",
  venue: "Pinacoteca do Estado",
  descriptionPrefix: "Exposição na Pinacoteca",
  tags: ["pinacoteca", "exposição", "arte", "museu", "cultural"],
  qualityScore: 85,
  contentTier: "signature",
};

const CCBB_CONFIG: MuseumScrapeConfig = {
  pages: [
    "https://culturabancodobrasil.com.br/portal/sao-paulo/",
    "https://culturabancodobrasil.com.br/portal/sao-paulo/programacao/",
  ],
  baseUrl: "https://culturabancodobrasil.com.br",
  hrefPattern: /culturabancodobrasil\.com\.br\/portal\/sao-paulo\//i,
  hrefExclude: /\/portal\/sao-paulo\/?$|\/programacao\/?$/,
  source: "CCBB SP",
  venue: "CCBB São Paulo",
  descriptionPrefix: "Programação no CCBB",
  tags: ["ccbb", "exposição", "cultural", "gratuito", "arte"],
  qualityScore: 84,
  contentTier: "signature",
  defaultPrice: 0,
};

const IMS_CONFIG: MuseumScrapeConfig = {
  pages: ["https://ims.com.br/programacao/sao-paulo/"],
  baseUrl: "https://ims.com.br",
  hrefPattern: /ims\.com\.br\//i,
  hrefExclude: /\/programacao\/sao-paulo\/?$/,
  source: "IMS Paulista",
  venue: "IMS Paulista",
  descriptionPrefix: "Programação no IMS Paulista",
  tags: ["ims", "exposição", "cultural", "fotografia", "quiet"],
  qualityScore: 83,
  contentTier: "curated",
};

export async function fetchMaspEvents(limit = 16) {
  return fetchMuseumExhibitions(MASP_CONFIG, limit);
}

export async function fetchPinacotecaEvents(limit = 16) {
  return fetchMuseumExhibitions(PINACOTECA_CONFIG, limit);
}

export async function fetchCcbbEvents(limit = 16) {
  return fetchMuseumExhibitions(CCBB_CONFIG, limit);
}

export async function fetchImsEvents(limit = 16) {
  return fetchMuseumExhibitions(IMS_CONFIG, limit);
}

export async function fetchMuseumAndCulturalEvents(limit = 20) {
  const perVenue = Math.max(6, Math.ceil(limit / 4));
  const results = await Promise.allSettled([
    fetchMaspEvents(perVenue),
    fetchPinacotecaEvents(perVenue),
    fetchCcbbEvents(perVenue),
    fetchImsEvents(perVenue),
    fetchSescSpEvents(perVenue),
  ]);

  const merged: RecommendationPayload[] = [];
  for (const result of results) {
    if (result.status === "fulfilled") merged.push(...result.value);
  }

  return dedupeRecommendations(merged).slice(0, limit);
}
