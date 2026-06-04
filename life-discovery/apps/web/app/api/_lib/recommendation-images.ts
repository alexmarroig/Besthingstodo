import { normalizeRecommendationImageUrl } from "@/shared/recommendation-images";
import { resolveKnownVenueImageForItem } from "@/shared/known-venue-images";

import {
  type ImageCandidate,
  type ImageResolveContext,
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
    if (normalizeRecommendationImageUrl(item.image_url)) return item;
    const known = resolveKnownVenueImageForItem(item.id, item.title);
    return known ? { ...item, image_url: known } : item;
  });
}

function needsRemoteLookup(item: RecommendationPayload): boolean {
  if (normalizeRecommendationImageUrl(item.image_url)) return false;
  if (resolveKnownVenueImageForItem(item.id, item.title)) return false;
  return true;
}

export async function resolveRecommendationImageUrlAsync(
  item: ImageCandidate,
  ctx?: ImageResolveContext
): Promise<string | null> {
  const resolved = await resolveRecommendationImageCore(item, ctx);
  return resolved.url;
}

export function resolveRecommendationImageUrl(item: ImageCandidate): string | null {
  return normalizeRecommendationImageUrl(item.image_url);
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

  let lookupsRemaining = options?.maxOgLookups ?? prioritized.filter(needsRemoteLookup).length;

  for (let index = 0; index < prioritized.length; index += batchSize) {
    const batch = prioritized.slice(index, index + batchSize);
    const resolved = await Promise.all(
      batch.map(async (item) => {
        if (normalizeRecommendationImageUrl(item.image_url)) {
          const url = item.image_url!;
          const used = ctx.usedUrls?.get(url) ?? 0;
          ctx.usedUrls?.set(url, used + 1);
          return item;
        }

        if (!needsRemoteLookup(item)) {
          const known = resolveKnownVenueImageForItem(item.id, item.title);
          return known ? { ...item, image_url: known } : item;
        }

        if (lookupsRemaining <= 0) return item;
        lookupsRemaining -= 1;

        const image_url = await resolveRecommendationImageUrlAsync(item, ctx);
        return image_url ? { ...item, image_url } : item;
      })
    );

    for (const item of resolved) {
      enrichedById.set(item.id, item);
    }
  }

  return withKnown.map((item) => enrichedById.get(item.id) || item);
}
