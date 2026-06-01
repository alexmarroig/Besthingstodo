import { resolveThemeImageUrl } from "@/shared/recommendation-images";

import { fetchOgImageFromUrl, fetchWikipediaThumbnail } from "./og-image";
import type { RecommendationPayload } from "./recommendation-mapper";

export { resolveThemeImageUrl } from "@/shared/recommendation-images";

export function buildGeoapifyMapImage(lat: number, lng: number, apiKey: string) {
  return `https://maps.geoapify.com/v1/staticmap?style=osm-bright&width=800&height=500&center=lonlat:${lng},${lat}&zoom=16&marker=lonlat:${lng},${lat};color:%23f97352;size:medium&apiKey=${apiKey}`;
}

type ImageCandidate = RecommendationPayload & {
  latitude?: number | null;
  longitude?: number | null;
};

export async function resolveRecommendationImageUrlAsync(item: ImageCandidate): Promise<string> {
  if (item.image_url) return item.image_url;

  const pageTarget = item.booking_url || item.url;
  if (pageTarget) {
    const ogImage = await fetchOgImageFromUrl(pageTarget);
    if (ogImage) return ogImage;
  }

  if (item.domain === "dining_out" || item.domain === "events_exhibitions") {
    const wikiQuery = [item.title, item.neighborhood, item.city || "São Paulo"].filter(Boolean).join(" ");
    const wikiImage = await fetchWikipediaThumbnail(wikiQuery);
    if (wikiImage) return wikiImage;
  }

  const apiKey = process.env.GEOAPIFY_API_KEY;
  if (apiKey && item.latitude != null && item.longitude != null) {
    return buildGeoapifyMapImage(item.latitude, item.longitude, apiKey);
  }

  return resolveThemeImageUrl(item);
}

/** Versão síncrona — só tema/mapa, sem rede. */
export function resolveRecommendationImageUrl(item: ImageCandidate): string {
  if (item.image_url) return item.image_url;

  const apiKey = process.env.GEOAPIFY_API_KEY;
  if (apiKey && item.latitude != null && item.longitude != null) {
    return buildGeoapifyMapImage(item.latitude, item.longitude, apiKey);
  }

  return resolveThemeImageUrl(item);
}

export function enrichRecommendationImages<T extends RecommendationPayload>(items: T[]): T[] {
  return items.map((item) => ({
    ...item,
    image_url: resolveRecommendationImageUrl(item),
  }));
}

export async function enrichRecommendationImagesAsync<T extends RecommendationPayload>(
  items: T[],
  options?: { maxOgLookups?: number }
): Promise<T[]> {
  const maxOgLookups = options?.maxOgLookups ?? 14;
  let ogLookups = 0;

  const enrichOne = async (item: T): Promise<T> => {
    if (item.image_url) return item;

    const needsNetwork =
      Boolean(item.booking_url || item.url) ||
      item.domain === "dining_out" ||
      item.domain === "events_exhibitions";

    if (!needsNetwork) {
      return { ...item, image_url: resolveRecommendationImageUrl(item) };
    }

    if (ogLookups >= maxOgLookups) {
      return { ...item, image_url: resolveRecommendationImageUrl(item) };
    }

    if (item.booking_url || item.url || item.domain === "dining_out" || item.domain === "events_exhibitions") {
      ogLookups += 1;
    }
    const image_url = await resolveRecommendationImageUrlAsync(item);
    return { ...item, image_url };
  };

  const batchSize = 5;
  const enriched: T[] = [];
  for (let index = 0; index < items.length; index += batchSize) {
    const batch = items.slice(index, index + batchSize);
    const resolved = await Promise.all(batch.map(enrichOne));
    enriched.push(...resolved);
  }

  return enriched;
}
