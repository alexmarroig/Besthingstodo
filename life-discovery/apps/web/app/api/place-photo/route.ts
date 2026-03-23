import { NextRequest, NextResponse } from "next/server";

type CommonsPage = {
  title?: string;
  imageinfo?: Array<{
    thumburl?: string;
    url?: string;
    descriptionurl?: string;
  }>;
};

type WikipediaPage = {
  title?: string;
  thumbnail?: { source?: string };
};

const STOPWORDS = new Set([
  "de",
  "do",
  "da",
  "das",
  "dos",
  "em",
  "no",
  "na",
  "e",
  "the",
  "of",
  "a",
  "o"
]);

const ALLOWED_HOSTS = new Set(["pt.wikipedia.org", "commons.wikimedia.org"]);

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(value: string) {
  return normalizeText(value)
    .split(" ")
    .filter((x) => x.length > 2 && !STOPWORDS.has(x));
}

function scoreMatch(target: string, queryTokens: string[]) {
  if (!queryTokens.length) return 0;
  const text = normalizeText(target);
  let score = 0;
  for (const tk of queryTokens) {
    if (text.includes(tk)) score += 1;
  }

  if (text.includes("car") || text.includes("street") || text.includes("traffic")) {
    score -= 1;
  }

  return score;
}

async function fetchJson(url: string) {
  const parsed = new URL(url);
  if (!ALLOWED_HOSTS.has(parsed.hostname)) {
    return null;
  }
  const res = await fetch(url, {
    headers: { "User-Agent": "LifeDiscovery/1.0 (image-discovery)" },
    next: { revalidate: 21600 }
  });
  if (!res.ok) return null;
  return res.json();
}

async function wikipediaImageBySearch(query: string, queryTokens: string[]) {
  const searchUrl =
    "https://pt.wikipedia.org/w/api.php?action=query&list=search&utf8=1&format=json&srlimit=6" +
    `&srsearch=${encodeURIComponent(query)}`;

  const searchData = await fetchJson(searchUrl);
  const results: Array<{ title?: string }> = searchData?.query?.search || [];
  const titles = results
    .map((x) => x.title || "")
    .filter(Boolean)
    .filter((title) => scoreMatch(title, queryTokens) >= Math.max(1, Math.floor(queryTokens.length * 0.4)))
    .slice(0, 4);

  if (!titles.length) return null;

  const pagesUrl =
    "https://pt.wikipedia.org/w/api.php?action=query&format=json&prop=pageimages&piprop=thumbnail&pithumbsize=1200" +
    `&titles=${encodeURIComponent(titles.join("|"))}`;

  const pagesData = await fetchJson(pagesUrl);
  const pages: Record<string, WikipediaPage> = pagesData?.query?.pages || {};

  let best: { url: string; score: number; title: string } | null = null;
  for (const page of Object.values(pages)) {
    const img = page.thumbnail?.source;
    if (!img || !page.title) continue;
    const score = scoreMatch(page.title, queryTokens);
    if (!best || score > best.score) {
      best = { url: img, score, title: page.title };
    }
  }

  if (!best || best.score < Math.max(1, Math.floor(queryTokens.length * 0.4))) return null;

  return {
    url: best.url,
    source: "wikipedia",
    title: best.title
  };
}

function pickFromCommons(pages: Record<string, CommonsPage> | undefined, queryTokens: string[]) {
  if (!pages) return null;

  let best: { url: string; score: number; title: string; pageUrl: string } | null = null;

  for (const page of Object.values(pages)) {
    const img = page.imageinfo?.[0];
    const url = img?.thumburl || img?.url;
    const title = page.title || "";
    if (!url || !title) continue;

    const score = scoreMatch(title, queryTokens);
    if (!best || score > best.score) {
      best = {
        url,
        score,
        title,
        pageUrl: img?.descriptionurl || ""
      };
    }
  }

  if (!best || best.score < Math.max(1, Math.floor(queryTokens.length * 0.4))) {
    return null;
  }

  return {
    url: best.url,
    source: "wikimedia",
    title: best.title,
    page_url: best.pageUrl
  };
}

export async function GET(request: NextRequest) {
  const title = request.nextUrl.searchParams.get("title") || "";
  const location = request.nextUrl.searchParams.get("location") || "";
  const city = request.nextUrl.searchParams.get("city") || "Sao Paulo";

  const primaryQuery = [location, city].filter(Boolean).join(" ").trim();
  const secondaryQuery = [title, location, city].filter(Boolean).join(" ").trim();

  const queryTokens = tokenize([title, location, city].join(" "));

  try {
    if (primaryQuery) {
      const wikiPick = await wikipediaImageBySearch(primaryQuery, queryTokens);
      if (wikiPick) return NextResponse.json(wikiPick);
    }

    if (secondaryQuery) {
      const wikiPick = await wikipediaImageBySearch(secondaryQuery, queryTokens);
      if (wikiPick) return NextResponse.json(wikiPick);

      const commonsUrl =
        "https://commons.wikimedia.org/w/api.php?action=query&generator=search" +
        `&gsrsearch=${encodeURIComponent(secondaryQuery)}` +
        "&gsrnamespace=6&gsrlimit=12&prop=imageinfo&iiprop=url" +
        "&iiurlwidth=1200&format=json";

      const commonsData = await fetchJson(commonsUrl);
      const commonsPick = pickFromCommons(commonsData?.query?.pages, queryTokens);
      if (commonsPick) return NextResponse.json(commonsPick);
    }

    return NextResponse.json({ url: null, source: null });
  } catch {
    return NextResponse.json({ url: null, source: null });
  }
}
