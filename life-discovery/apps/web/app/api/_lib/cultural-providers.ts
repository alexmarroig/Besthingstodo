import { mapScrapedEventToRecommendation, type RecommendationPayload } from "./recommendation-mapper";

const FETCH_HEADERS = {
  "User-Agent": "RoteiroADois/1.0 (+https://besthingstodo-plum.vercel.app)",
  Accept: "application/json,text/html",
  "Accept-Language": "pt-BR,pt;q=0.9",
};

/** Cinema, dança, artes visuais, música, teatro no WordPress do Sesc SP. */
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

export async function fetchMaspEvents(limit = 20): Promise<RecommendationPayload[]> {
  const html = await fetchHtml("https://masp.org.br/exposicoes");
  if (!html) return [];

  const events: RecommendationPayload[] = [];
  const seen = new Set<string>();
  const anchorRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;

  for (const match of html.matchAll(anchorRegex)) {
    let href = match[1];
    const inner = match[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

    if (!href.includes("/exposicoes/")) continue;
    if (href.startsWith("/")) href = `https://masp.org.br${href}`;
    href = href.split("#")[0].replace(/\/$/, "");
    if (href.endsWith("/exposicoes") || seen.has(href)) continue;

    const title = inner.length >= 5 ? inner.slice(0, 140) : slugToTitle(href);
    if (title.length < 5) continue;
    seen.add(href);

    const imgMatch = match[2].match(/<img[^>]+src=["']([^"']+)["']/i);
    const image_url = imgMatch?.[1] ? new URL(imgMatch[1], "https://masp.org.br").toString() : null;

    events.push(
      mapScrapedEventToRecommendation({
        title,
        description: `Exposição no MASP — ${title}`,
        url: href,
        source: "MASP",
        venue: "MASP",
        city: "São Paulo",
        category: "exhibition",
        tags: ["masp", "exposição", "arte", "museu", "cultural"],
        image_url,
        quality_score: 86,
        content_tier: "signature",
      })
    );

    if (events.length >= limit) break;
  }

  return events;
}
