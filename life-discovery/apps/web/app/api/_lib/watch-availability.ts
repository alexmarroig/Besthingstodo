import { fetchExternalJson } from "./external-api";
import { buildTmdbRequest } from "./tmdb-client";
import { matchCinemaMovie, normalizeCinemaSessions, normalizeMovieTitle, normalizeProviders, safeWatchUrl } from "@/shared/watch-availability";
import type { CinemaMovie, WatchAvailability } from "@/shared/watch-availability";

const INGRESSO = "https://api-content.ingresso.com/v0";

export async function fetchCinemaCatalog(): Promise<CinemaMovie[]> {
  const data = await fetchExternalJson<{ items?: CinemaMovie[] }>(`${INGRESSO}/events/city/1/partnership/home`, {
    revalidate: 300, timeoutMs: 5000,
  });
  return (data.items || []).filter(movie => /^\d+$/.test(String(movie.id)) && movie.title && (movie.isPlaying || movie.inPreSale));
}

export async function getWatchAvailability(input: {
  title: string; media: "movie" | "tv"; tmdbId?: string; cinemaId?: string; year?: number; city: string;
}): Promise<WatchAvailability> {
  const result: WatchAvailability = {
    region: "BR", city: input.city, checkedAt: new Date().toISOString(),
    streaming: { status: "unavailable", groups: [], url: null },
    cinema: { status: input.media === "tv" || normalizeMovieTitle(input.city) !== "sao paulo" ? "unsupported" : "unavailable", url: null, sessions: [] },
  };

  // Query both sources independently: a provider outage must not hide cinema sessions.
  const catalogTask = result.cinema.status === "unsupported" ? Promise.resolve(null) : fetchCinemaCatalog().catch(() => null);
  const detailsTask = (async () => {
    let id = input.tmdbId;
    if (!id) {
      const search = buildTmdbRequest(`/search/${input.media}`, {
        query: input.title, language: "pt-BR", include_adult: "false",
        ...(input.year ? { [input.media === "tv" ? "first_air_date_year" : "year"]: String(input.year) } : {}),
      });
      if (!search) return null;
      const data = await fetchExternalJson<{ results?: any[] }>(search.url, { headers: search.headers, revalidate: 3600, timeoutMs: 4000 });
      const exact = (data.results || []).filter(row => {
        const release = row.release_date || row.first_air_date;
        if (input.year && release && Number(release.slice(0, 4)) !== input.year) return false;
        return [row.title, row.name, row.original_title, row.original_name].some(t => t && normalizeMovieTitle(t) === normalizeMovieTitle(input.title));
      });
      if (exact.length !== 1) return null;
      id = String(exact[0].id);
    }
    const request = buildTmdbRequest(`/${input.media}/${id}`, { language: "pt-BR", append_to_response: "watch/providers" });
    if (!request) return null;
    return fetchExternalJson<any>(request.url, { headers: request.headers, revalidate: 3600, timeoutMs: 5000 });
  })().catch(() => null);

  const [catalog, details] = await Promise.all([catalogTask, detailsTask]);
  if (details?.["watch/providers"]?.results) {
    result.streaming = { status: "ok", ...normalizeProviders(details["watch/providers"]) };
  }
  if (catalog) {
    const release = details?.release_date || details?.first_air_date;
    const movie = input.cinemaId ? catalog.find(m => String(m.id) === input.cinemaId) : matchCinemaMovie(catalog, {
      title: details?.title || input.title, originalTitle: details?.original_title,
      year: input.year || (release ? Number(release.slice(0, 4)) : undefined),
    });
    result.cinema.status = "ok";
    if (movie) {
      result.cinema.url = safeWatchUrl(movie.siteURL, ["ingresso.com"]);
      try {
        const sessions = await fetchExternalJson<any[]>(`${INGRESSO}/sessions/city/1/event/${movie.id}/partnership/home`, { revalidate: 120, timeoutMs: 5000 });
        result.cinema.sessions = normalizeCinemaSessions(sessions);
      } catch { result.cinema.status = "unavailable"; }
    }
  }
  return result;
}
