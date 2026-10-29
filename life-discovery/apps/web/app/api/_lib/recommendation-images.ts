import { isLocalVenueImage, normalizeRecommendationImageUrl } from "@/shared/recommendation-images";
import { resolveContextualLocalImage, resolveKnownVenueImageForItem } from "@/shared/known-venue-images";

import {
  type ImageCandidate,
  type ImageResolveContext,
  acceptUniqueImageUrl,
  resolveRecommendationImageCore,
} from "./image-resolver";
import type { RecommendationPayload } from "./recommendation-mapper";

export { normalizeRecommendationImageUrl, isGenericPlaceholderImage } from "@/shared/recommendation-images";

function sortByImagePriority<T extends RecommendationPayload>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const scoreA = a.quality_score ?? 0;
    const scoreB = b.quality_score ?? 0;
    if (scoreB !== scoreA) return scoreB - scoreA;
    const hasImageA = normalizeRecommendationImageUrl(a.image_url) ? 1 : 0;
    const hasImageB = normalizeRecommendationImageUrl(b.image_url) ? 1 : 0;
    return hasImageB - hasImageA;
  });
}

function applyKnownImages<T extends RecommendationPayload>(items: T[]): T[] {
  return items.map((item) => {
    const known = resolveKnownVenueImageForItem(item.id, item.title, item.location);
    if (known) return item.image_url === known ? item : { ...item, image_url: known };
    if (normalizeRecommendationImageUrl(item.image_url)) return item;
    return item;
  });
}

function needsRemoteLookup(item: RecommendationPayload): boolean {
  if (resolveKnownVenueImageForItem(item.id, item.title, item.location)) return false;
  if (normalizeRecommendationImageUrl(item.image_url)) return false;
  return Boolean(item.booking_url || item.url);
}

export async function resolveRecommendationImageUrlAsync(
  item: ImageCandidate,
  ctx?: ImageResolveContext
): Promise<string | null> {
  const resolved = await resolveRecommendationImageCore(item, ctx);
  return resolved.url;
}

export function resolveRecommendationImageUrl(item: ImageCandidate): string | null {
  return (
    resolveKnownVenueImageForItem(item.id, item.title, item.location) ||
    normalizeRecommendationImageUrl(item.image_url) ||
    resolveContextualLocalImage(item)
  );
}

export function enrichRecommendationImages<T extends RecommendationPayload>(items: T[]): T[] {
  return applyKnownImages(items).map((item) => ({
    ...item,
    image_url: resolveRecommendationImageUrl(item),
  }));
}

export async function enrichRecommendationImagesAsync<T extends RecommendationPayload>(
  items: T[],
  options?: { maxOgLookups?: number }
): Promise<T[]> {
  const batchSize = 4;
  const withKnown = applyKnownImages(items);
  const prioritized = sortByImagePriority(withKnown);
  const enrichedById = new Map<string, T>();
  const ctx: ImageResolveContext = {
    usedUrls: new Map<string, number>(),
    domainOgUrls: new Map<string, Set<string>>(),
  };

  // Keep remote lookups fast and bounded (max 4 per API call) so endpoints respond in < 1.5s
  let lookupsRemaining = Math.min(options?.maxOgLookups ?? 4, 4);

  for (let index = 0; index < prioritized.length; index += batchSize) {
    const batch = prioritized.slice(index, index + batchSize);
    const resolved = await Promise.all(
      batch.map(async (item) => {
        const known = resolveKnownVenueImageForItem(item.id, item.title, item.location);
        if (known) {
          return { ...item, image_url: known };
        }

        const existing = normalizeRecommendationImageUrl(item.image_url);
        if (existing) {
          if (isLocalVenueImage(existing)) return { ...item, image_url: existing };
          const accepted = acceptUniqueImageUrl(existing, ctx);
          return { ...item, image_url: accepted || resolveContextualLocalImage(item) };
        }

        if (!needsRemoteLookup(item) || lookupsRemaining <= 0) {
          return { ...item, image_url: resolveContextualLocalImage(item) };
        }

        lookupsRemaining -= 1;
        const image_url = await resolveRecommendationImageUrlAsync(item, ctx);
        return { ...item, image_url: image_url || resolveContextualLocalImage(item) };
      })
    );

    for (const item of resolved) {
      enrichedById.set(item.id, item);
    }
  }

  return withKnown.map((item) => enrichedById.get(item.id) || { ...item, image_url: resolveContextualLocalImage(item) });
}
