import "server-only";
import { fetchExternalJson } from "../../app/api/_lib/external-api";
import { fetchRssFeed } from "../../app/api/_lib/rss";
import { GASTRO_EDITORIAL_SOURCES, CINEMA_NEWS_SOURCES, LOCAL_EVENT_SOURCES } from "../../app/api/_lib/source-registry";
import { mapRssItemToRecommendation } from "../../app/api/_lib/recommendation-mapper";
import { fetchCinemaCatalog } from "../../app/api/_lib/watch-availability";
import { buildTmdbRequest } from "../../app/api/_lib/tmdb-client";
import { searchGooglePlaces } from "../../app/api/_lib/google-places";
import { fetchCatracaLivreAgenda, fetchTimeoutSpEvents, fetchSymplaEvents, fetchFeverEvents } from "../../app/api/_lib/event-providers";
import { fetchMaspEvents, fetchPinacotecaEvents, fetchCcbbEvents, fetchImsEvents, fetchMisEvents, fetchItauCulturalEvents, fetchPlanetarioEvents, fetchSescSpEvents, fetchSescUnitEvents } from "../../app/api/_lib/cultural-providers";

export type CollectedItem = Record<string, any> & { id: string; title: string };
export type CatalogCollector = { key: string; domain: string; city: string; collect: () => Promise<CollectedItem[]> };
const city = "São Paulo";

export function catalogCollectors(): CatalogCollector[] {
  const rss = [...GASTRO_EDITORIAL_SOURCES, ...CINEMA_NEWS_SOURCES, ...LOCAL_EVENT_SOURCES].flatMap(source =>
    (source.feeds || []).map((url, index) => ({
      key: `${source.domain}:${source.id}:rss:${index}`, domain: source.domain, city,
      collect: async () => (await fetchRssFeed(url, 5000)).filter(item => {
        if (source.domain === "movies_series") return true;
        return /s[aã]o paulo|\bsp\b|gastronom|restaurante|caf[eé]|exposi|museu|cinema/i.test(`${item.title} ${item.description}`);
      }).slice(0, 30).map(item => mapRssItemToRecommendation(item, { sourceLabel: source.label, domain: source.domain, contentTier: source.contentTier, baseTags: source.tags })),
    })));
  const events: Array<[string, (limit: number) => Promise<any[]>]> = [
    ["catraca", fetchCatracaLivreAgenda], ["timeout", fetchTimeoutSpEvents], ["sympla", fetchSymplaEvents], ["fever", fetchFeverEvents],
    ["masp", fetchMaspEvents], ["pinacoteca", fetchPinacotecaEvents], ["ccbb", fetchCcbbEvents], ["ims", fetchImsEvents],
    ["mis", fetchMisEvents], ["itau-cultural", fetchItauCulturalEvents], ["planetario", fetchPlanetarioEvents],
    ["sesc", fetchSescSpEvents], ["sesc-unidades", fetchSescUnitEvents],
  ];
  return [
    ...rss,
    ...events.map(([key, collect]) => ({ key: `events:${key}`, domain: "events_exhibitions", city, collect: () => collect(16) })),
    { key: "cinema:ingresso", domain: "movies_series", city, collect: async () => (await fetchCinemaCatalog()).map(movie => ({
      id: `ingresso-${movie.id}`, title: movie.title, description: movie.synopsis || "", category: "movie", domain: "movies_series", city,
      location: "Cinemas de São Paulo", source: "Ingresso.com", image_url: movie.images?.find(img => img.type === "PosterPortrait")?.url || null,
      tags: movie.genres || [], url: movie.siteURL, booking_url: movie.siteURL, release_year: movie.releaseYear, original_title: movie.originalTitle,
    })) },
    { key: "movies:tmdb", domain: "movies_series", city, collect: async () => {
      const request = buildTmdbRequest("/trending/all/week", { language: "pt-BR" });
      if (!request) throw new Error("missing_configuration");
      const data = await fetchExternalJson<{ results?: any[] }>(request.url, { headers: request.headers, revalidate: 600, timeoutMs: 5000 });
      return (data.results || []).filter(x => x.media_type === "movie" || x.media_type === "tv").slice(0, 30).map(x => ({
        id: `tmdb-${x.id}`, title: x.title || x.name, category: x.media_type === "movie" ? "movie" : "series", domain: "movies_series", city,
        location: "Brasil", description: x.overview || "", image_url: x.poster_path ? `https://image.tmdb.org/t/p/w500${x.poster_path}` : null,
        source: "TMDB", tags: [], url: `https://www.themoviedb.org/${x.media_type}/${x.id}`, release_year: Number((x.release_date || x.first_air_date || "").slice(0, 4)) || null,
      }));
    } },
    { key: "places:restaurants", domain: "dining_out", city, collect: async () => {
      if (process.env.GOOGLE_PLACES_API_KEY) {
        const rows = await searchGooglePlaces({ textQuery: "Restaurantes e cafés em São Paulo", maxResultCount: 20 });
        // Google photo URLs may contain a server credential: never persist or expose them.
        return rows.map(row => ({ ...row, image_url: row.image_url?.includes("key=") ? null : row.image_url }));
      }
      if (!process.env.GEOAPIFY_API_KEY) throw new Error("missing_configuration");
      const url = new URL("https://api.geoapify.com/v2/places");
      url.search = new URLSearchParams({ categories: "catering.restaurant,catering.cafe", filter: "circle:-46.6333,-23.5505,18000", limit: "40", apiKey: process.env.GEOAPIFY_API_KEY }).toString();
      const data = await fetchExternalJson<{ features?: any[] }>(url.href, { revalidate: 900, timeoutMs: 6000 });
      return (data.features || []).map(feature => {
        const p = feature.properties || {};
        return { id: `geo-${p.place_id}`, title: p.name, description: p.formatted || "", category: p.categories?.some((x: string) => x.includes("cafe")) ? "cafe" : "restaurant",
          domain: "dining_out", city, location: p.suburb || city, neighborhood: p.suburb || null, tags: p.categories || [], source: "Geoapify",
          url: p.datasource?.raw?.website || p.website || null, image_url: null, latitude: feature.geometry?.coordinates?.[1], longitude: feature.geometry?.coordinates?.[0] };
      }).filter(row => row.title);
    } },
    ...(process.env.TICKETMASTER_API_KEY ? [{ key: "events:ticketmaster", domain: "events_exhibitions", city, collect: async () => {
      const url = new URL("https://app.ticketmaster.com/discovery/v2/events.json");
      url.search = new URLSearchParams({ apikey: process.env.TICKETMASTER_API_KEY!, city, countryCode: "BR", size: "30" }).toString();
      const data = await fetchExternalJson<any>(url.href, { revalidate: 900, timeoutMs: 6000 });
      return (data._embedded?.events || []).map((x: any) => ({ id: `tm-${x.id}`, title: x.name, description: x.info || "", category: "event", domain: "events_exhibitions", city,
        location: x._embedded?.venues?.[0]?.name || city, source: "Ticketmaster", tags: [], url: x.url, booking_url: x.url,
        image_url: x.images?.find((i: any) => i.width >= 640)?.url || null, start_time: x.dates?.start?.dateTime || null }));
    } }] : []),
  ];
}
