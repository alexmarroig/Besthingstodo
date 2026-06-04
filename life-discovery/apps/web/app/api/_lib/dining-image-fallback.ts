import type { ImageCandidate, ImageResolveContext } from "./image-resolver";
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

function hostnameFromUrl(value: string): string | null {
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

/** Tenta OG do site oficial e variações comuns de página de cardápio/galeria. */
export async function fetchVenueWebsiteImages(item: ImageCandidate): Promise<string[]> {
  const targets = uniqueQueries([item.booking_url, item.url]);
  const images: string[] = [];

  for (const target of targets) {
    const og = await fetchOgImageFromUrl(target);
    if (og) images.push(og);

    try {
      const base = new URL(target);
      const host = base.hostname;
      const extras = [`${base.origin}/`, `${base.origin}/sobre`];
      for (const extra of extras) {
        if (extra === target) continue;
        const extraHost = hostnameFromUrl(extra);
        if (extraHost !== host) continue;
        const extraOg = await fetchOgImageFromUrl(extra);
        if (extraOg) images.push(extraOg);
      }
    } catch {
      continue;
    }
  }

  return Array.from(new Set(images));
}

/** Wikipedia com várias queries — melhor cobertura sem Google Places. */
export async function fetchWikipediaDiningImage(item: ImageCandidate): Promise<string | null> {
  const city = item.city || "São Paulo";
  const neighborhood = item.neighborhood || item.location || "";
  const primary = item.title.trim().split(/[+—–-]/)[0]?.trim() || item.title.trim();

  const queries = uniqueQueries([
    primary,
    `${primary} restaurante ${city}`,
    `${primary} ${neighborhood}`,
    `${primary} ${city}`,
    item.category === "cafe" ? `${primary} cafeteria ${city}` : null,
    item.category === "bar" ? `${primary} bar ${city}` : null,
  ]);

  for (const query of queries) {
    const image = await fetchWikipediaThumbnail(query, {
      validateAgainst: primary,
      city,
    });
    if (image) return image;
  }

  return null;
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
