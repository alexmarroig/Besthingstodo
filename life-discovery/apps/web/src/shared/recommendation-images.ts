import type { Recommendation } from "@life/shared-types";

/** URLs genéricas que não representam o item — tratamos como ausência de foto. */
export function isGenericPlaceholderImage(url: string | null | undefined): boolean {
  if (!url) return false;
  const normalized = url.toLowerCase();
  return (
    normalized.includes("images.unsplash.com") ||
    normalized.includes("maps.geoapify.com/v1/staticmap") ||
    normalized.includes("source.unsplash.com")
  );
}

export function normalizeRecommendationImageUrl(url: string | null | undefined): string | null {
  if (!url || isGenericPlaceholderImage(url)) return null;
  return url;
}

/** Mantido para compatibilidade — não injeta mais Unsplash. */
export function resolveThemeImageUrl(_item: {
  title?: string;
  description?: string;
  category?: string;
  domain?: string;
  tags?: string[];
}): null {
  return null;
}

export function attachRecommendationImage<T extends Recommendation>(item: T): T {
  const image_url = normalizeRecommendationImageUrl(item.image_url);
  if (image_url === item.image_url) return item;
  return { ...item, image_url };
}

export function attachRecommendationImages<T extends Recommendation>(items: T[]): T[] {
  return items.map(attachRecommendationImage);
}
