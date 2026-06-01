const TMDB_BASE = "https://api.themoviedb.org/3";

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

export async function fetchTmdbPosterByTitle(title: string): Promise<string | null> {
  if (!title.trim()) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);

  try {
    const request = buildTmdbRequest("/search/multi", {
      query: title,
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
    const hit =
      (data.results || []).find((row: { poster_path?: string }) => row.poster_path) || data.results?.[0];
    if (!hit?.poster_path) return null;
    return `https://image.tmdb.org/t/p/w500${hit.poster_path}`;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
