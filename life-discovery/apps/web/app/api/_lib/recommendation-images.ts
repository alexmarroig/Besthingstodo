import { normalizeRecommendationImageUrl } from "@/shared/recommendation-images";

import { fetchGooglePlacePhotoForVenue } from "./google-places";
import { resolveKnownVenueImage } from "./known-venue-images";
import { fetchOgImageFromUrl, fetchWikipediaThumbnail } from "./og-image";
import { fetchTmdbPosterByTitle } from "./tmdb-client";
import type { RecommendationPayload } from "./recommendation-mapper";

export { normalizeRecommendationImageUrl, isGenericPlaceholderImage } from "@/shared/recommendation-images";

type ImageCandidate = RecommendationPayload & {
  latitude?: number | null;
  longitude?: number | null;
};

export async function resolveRecommendationImageUrlAsync(item: ImageCandidate): Promise<string | null> {
  const existing = normalizeRecommendationImageUrl(item.image_url);
  if (existing) return existing;

  const knownImage = resolveKnownVenueImage(item.id);
  if (knownImage) return knownImage;

  if (item.domain === "dining_out" || item.domain === "delivery") {
    const googlePhoto = await fetchGooglePlacePhotoForVenue(item.title, {
      neighborhood: item.neighborhood,
      city: item.city || "São Paulo",
    });
    if (googlePhoto) return googlePhoto;
  }

  const pageTarget = item.booking_url || item.url;
  if (pageTarget) {
    const ogImage = await fetchOgImageFromUrl(pageTarget);
    if (ogImage) return ogImage;
  }

  if (item.domain === "movies_series") {
    const tmdbImage = await fetchTmdbPosterByTitle(item.title);
    if (tmdbImage) return tmdbImage;
  }

  if (item.domain === "dining_out" || item.domain === "events_exhibitions" || item.domain === "delivery") {
    const wikiQuery = [item.title, item.neighborhood, item.city || "São Paulo"].filter(Boolean).join(" ");
    const wikiImage = await fetchWikipediaThumbnail(wikiQuery);
    if (wikiImage) return wikiImage;
  }

  return null;
}

export function resolveRecommendationImageUrl(item: ImageCandidate): string | null {
  return normalizeRecommendationImageUrl(item.image_url);
}

export function enrichRecommendationImages<T extends RecommendationPayload>(items: T[]): T[] {
  return items.map((item) => ({
    ...item,
    image_url: resolveRecommendationImageUrl(item),
  }));
}

export async function enrichRecommendationImagesAsync<T extends RecommendationPayload>(
  items: T[],
  _options?: { maxOgLookups?: number }
): Promise<T[]> {
  const batchSize = 4;
  const enriched: T[] = [];

  for (let index = 0; index < items.length; index += batchSize) {
    const batch = items.slice(index, index + batchSize);
    const resolved = await Promise.all(
      batch.map(async (item) => {
        if (normalizeRecommendationImageUrl(item.image_url)) return item;
        const image_url = await resolveRecommendationImageUrlAsync(item);
        return { ...item, image_url };
      })
    );
    enriched.push(...resolved);
  }

  return enriched;
}
