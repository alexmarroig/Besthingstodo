const TMDB_BASE = "https://api.themoviedb.org/3";

const TMDB_NOISE_PATTERNS = [
  /\bem casa\b/gi,
  /\bnoite\b/gi,
  /\bjantar\b/gi,
  /\bcafe\b/gi,
  /\bcafé\b/gi,
  /\bconversa\b/gi,
  /\bdepois\b/gi,
  /\bpedir\b/gi,
  /\bassistir\b/gi,
  /\bstreaming\b/gi,
  /\bsof[aá]\b/gi,
  /\bprograma\b/gi,
  /\+.*/g,
  /\(.+\)/g,
];

export function getTmdbApiKey(): string | null {
  const key = process.env.TMDB_API_KEY?.trim();
  return key || null;
}

/** TMDB aceita API Key v3 (query) ou Read Access Token v4 (Bearer JWT). */
export function buildTmdbRequest(path: string, params: Record<string, string> = {}) {
  const key = getTmdbApiKey();
  if (!key) return null;

  const url = new URL(`${TMDB_BASE}${path.startsWith("/") ? path : `/${path}`}`);
  for (const [name, value] of Object.entries(params)) {
    url.searchParams.set(name, value);
  }

  const isBearerToken = key.startsWith("eyJ");
  const headers: Record<string, string> = { Accept: "application/json" };
  if (isBearerToken) {
    headers.Authorization = `Bearer ${key}`;
  } else {
    url.searchParams.set("api_key", key);
  }

  return { url: url.toString(), headers };
}

export async function fetchTmdbJson<T>(path: string, params: Record<string, string> = {}): Promise<T | null> {
  const request = buildTmdbRequest(path, params);
  if (!request) return null;

  const res = await fetch(request.url, {
    headers: request.headers,
    next: { revalidate: 86400 },
  });
  if (!res.ok) return null;
  return res.json() as Promise<T>;
}

export function buildTmdbPosterUrl(posterPath: string, size: "w500" | "w780" = "w780"): string {
  const normalized = posterPath.startsWith("/") ? posterPath : `/${posterPath}`;
  return `https://image.tmdb.org/t/p/${size}${normalized}`;
}

export function cleanTitleForTmdbSearch(title: string): string {
  let cleaned = title.trim();
  for (const pattern of TMDB_NOISE_PATTERNS) {
    cleaned = cleaned.replace(pattern, " ");
  }
  cleaned = cleaned.replace(/\s+/g, " ").trim();
  if (cleaned.length < 2) return title.trim().split(/[+—–-]/)[0]?.trim() || title.trim();
  return cleaned;
}

function scoreTmdbHit(title: string, hit: { title?: string; name?: string; original_title?: string; media_type?: string }) {
  const query = cleanTitleForTmdbSearch(title).toLowerCase();
  const candidates = [hit.title, hit.name, hit.original_title].filter(Boolean).map((value) => String(value).toLowerCase());
  if (!candidates.length) return 0;

  let score = 0;
  for (const candidate of candidates) {
    if (candidate === query) score += 100;
    if (candidate.includes(query) || query.includes(candidate)) score += 40;
    const queryTokens = query.split(/\s+/).filter((token) => token.length >= 3);
    const matched = queryTokens.filter((token) => candidate.includes(token)).length;
    score += matched * 12;
  }
  if (hit.media_type === "movie" || hit.media_type === "tv") score += 8;
  return score;
}

export async function fetchTmdbPosterByTitle(title: string): Promise<string | null> {
  const cleaned = cleanTitleForTmdbSearch(title);
  if (!cleaned.trim()) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);

  try {
    const request = buildTmdbRequest("/search/multi", {
      query: cleaned,
      language: "pt-BR",
      include_adult: "false",
    });
    if (!request) return null;

    const res = await fetch(request.url, {
      headers: request.headers,
      signal: controller.signal,
      next: { revalidate: 86400 },
    });
    if (!res.ok) return null;

    const data = await res.json();
    const results = (data.results || []) as Array<{
      poster_path?: string;
      title?: string;
      name?: string;
      original_title?: string;
      media_type?: string;
    }>;

    const ranked = results
      .filter((row) => row.poster_path)
      .map((row) => ({ row, score: scoreTmdbHit(title, row) }))
      .sort((a, b) => b.score - a.score);

    const hit = ranked[0]?.row;
    if (!hit?.poster_path) return null;
    return buildTmdbPosterUrl(hit.poster_path);
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
