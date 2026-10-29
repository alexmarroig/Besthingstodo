import type { QueryClient } from "@tanstack/react-query";

import { buildFallbackContext, buildHomeRails, curateRecommendations } from "@/features/catalog/curation";
import { getFeedbackHistory } from "@/shared/storage";
import { RECOMMENDATION_POOL_LIMIT } from "@/shared/api/config";
import { dedupeImageAssignments } from "@/shared/known-venue-images";
import { normalizeRecommendationImageUrl, attachRecommendationImage } from "@/shared/recommendation-images";
import { preloadImageUrls, setCachedImageUrls } from "@/shared/image-cache";
import type { CoupleSnapshot, ExperienceContext, Recommendation } from "@life/shared-types";

const VISIBLE_PER_RAIL = 6;

function collectVisibleItems(curated: Recommendation[]) {
  const rails = buildHomeRails(curated, []);
  const seen = new Set<string>();
  const visible: Recommendation[] = [];

  const push = (item?: Recommendation | null) => {
    if (!item || seen.has(item.id)) return;
    seen.add(item.id);
    visible.push(item);
  };

  push(rails.hero);
  push(rails.forYou[0]);

  for (const list of [
    rails.forYou,
    rails.romantic,
    rails.restaurants,
    rails.movies,
    rails.events,
    rails.editorial,
    rails.nearby,
  ]) {
    for (const item of list.slice(0, VISIBLE_PER_RAIL)) push(item);
  }

  return visible;
}

function mergeImagesIntoSources(sources: Recommendation[], images: Record<string, string | null>) {
  return sources.map((source) => {
    if (Object.prototype.hasOwnProperty.call(images, source.id)) {
      const url = images[source.id];
      if (!url) return attachRecommendationImage(source);
      return source.image_url === url ? source : { ...source, image_url: url };
    }
    return attachRecommendationImage(source);
  });
}

export async function prefetchVisibleHomeImages(
  queryClient: QueryClient,
  options: {
    userId: string;
    city: string;
    couple?: CoupleSnapshot | null;
    context?: ExperienceContext | null;
  }
) {
  const { userId, city, couple, context } = options;
  const queryKey = ["recommendation-sources", userId, city] as const;

  const rawSources = queryClient.getQueryData<Recommendation[]>(queryKey) || [];
  if (!rawSources.length) return;

  const sources = rawSources.map((item) => attachRecommendationImage(item));
  const resolvedContext = context || buildFallbackContext(city);

  const curated = curateRecommendations(sources, {
    context: resolvedContext,
    couple: couple || undefined,
    feedback: getFeedbackHistory(),
    limit: RECOMMENDATION_POOL_LIMIT,
  });

  const visible = collectVisibleItems(curated);
  const knownImages: Record<string, string | null> = {};
  for (const item of visible) {
    const url = normalizeRecommendationImageUrl(item.image_url);
    if (url) knownImages[item.id] = url;
  }

  const allImages = dedupeImageAssignments(visible, knownImages);
  setCachedImageUrls(allImages);
  queryClient.setQueryData(queryKey, mergeImagesIntoSources(sources, allImages));

  preloadImageUrls(
    visible.slice(0, 8).map((item) => allImages[item.id] || item.image_url),
    8
  );
}
