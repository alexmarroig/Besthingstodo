import { fetchCinemaCatalog } from "../../_lib/watch-availability";
import { jsonWithCache, jsonFallback } from "../../_lib/external-api";
import { safeWatchUrl } from "@/shared/watch-availability";

export async function GET() {
  try {
    const movies = await fetchCinemaCatalog();
    return jsonWithCache(movies.map(movie => ({
      id: `ingresso-${movie.id}`, title: movie.title, description: movie.synopsis || "",
      category: "movie", domain: "movies_series", city: "São Paulo", location: "Cinemas de São Paulo",
      image_url: safeWatchUrl(movie.images?.find(img => img.type === "PosterPortrait")?.url, ["akamaihd.net", "ingresso.com"]),
      tags: movie.genres || [], source: "Ingresso.com", availability_kind: "venue",
      url: safeWatchUrl(movie.siteURL, ["ingresso.com"]), booking_url: safeWatchUrl(movie.siteURL, ["ingresso.com"]),
      release_year: movie.releaseYear, original_title: movie.originalTitle,
      // Session availability is checked separately when opening the film.
    })), { revalidate: 300, stale: 60 });
  } catch { return jsonFallback([], { revalidate: 300, fallbackMaxAge: 30 }); }
}
