import type { ImageCandidate } from "./image-resolver";
import { fetchOgImageFromUrl, fetchWikipediaThumbnail } from "./og-image";

export function isGooglePlacesEnabled(): boolean {
  return Boolean(process.env.GOOGLE_PLACES_API_KEY?.trim());
}

function uniqueQueries(values: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const trimmed = (value || "").replace(/\s+/g, " ").trim();
    if (trimmed.length < 3 || seen.has(trimmed.toLowerCase())) continue;
    seen.add(trimmed.toLowerCase());
    out.push(trimmed);
  }
  return out;
}

/** Tenta OG apenas da página alvo direta para evitar cascata lenta de HTTP. */
export async function fetchVenueWebsiteImages(item: ImageCandidate): Promise<string[]> {
  const targets = uniqueQueries([item.booking_url, item.url]).slice(0, 1);
  const images: string[] = [];

  for (const target of targets) {
    const og = await fetchOgImageFromUrl(target, 1800);
    if (og) images.push(og);
  }

  return images;
}

/** Wikipedia com consulta única rápida. */
export async function fetchWikipediaDiningImage(item: ImageCandidate): Promise<string | null> {
  const city = item.city || "São Paulo";
  const primary = item.title.trim().split(/[+—–-]/)[0]?.trim() || item.title.trim();

  return fetchWikipediaThumbnail(`${primary} ${city}`, {
    validateAgainst: primary,
    city,
  });
}

export async function fetchWikipediaVenueImage(item: ImageCandidate): Promise<string | null> {
  if (item.domain === "dining_out" || item.domain === "delivery") {
    return fetchWikipediaDiningImage(item);
  }

  return fetchWikipediaThumbnail(item.title, {
    validateAgainst: item.title,
    city: item.city || "São Paulo",
  });
}
