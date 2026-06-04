import type { Recommendation } from "@life/shared-types";

import { resolveKnownVenueImageForItem } from "./known-venue-images";

const LOW_QUALITY_PATTERNS = [
  "images.unsplash.com",
  "source.unsplash.com",
  "maps.geoapify.com/v1/staticmap",
  "/favicon",
  "favicon.ico",
  "apple-touch-icon",
  "/logo.",
  "/logos/",
  "logo-catraca",
  "catracalivre.com.br/wp-content/uploads/2020", // OG genérico antigo do portal
  "placeholder",
  "default-og",
  "opengraph-image.png",
  "og-image.png",
  "share-image",
  "social-share",
  "1x1.",
  "pixel.",
  "spacer.",
  "blank.",
  "avatar.",
  "/icon-",
  "/icons/",
  "emoji",
  "gravatar.com",
];

/** URLs genéricas ou de baixa qualidade — tratamos como ausência de foto. */
export function isGenericPlaceholderImage(url: string | null | undefined): boolean {
  if (!url) return false;
  const normalized = url.toLowerCase();
  return LOW_QUALITY_PATTERNS.some((pattern) => normalized.includes(pattern));
}

/** Rejeita imagens muito pequenas pela URL (ex.: thumb 32px). */
export function isLikelyLowResolutionImage(url: string | null | undefined): boolean {
  if (!url) return false;
  const normalized = url.toLowerCase();
  if (/(?:^|[?&/_-])(?:w|width|h|height)=(?:[1-9]|[1-9]\d)(?:&|$|[/"'])/.test(normalized)) return true;
  if (/\/(\d{1,2}x\d{1,2})(?:[./_-]|$)/.test(normalized)) return true;
  return false;
}

export function isUsableRecommendationImage(url: string | null | undefined): boolean {
  if (!url) return false;
  if (isGenericPlaceholderImage(url)) return false;
  if (isLikelyLowResolutionImage(url)) return false;
  return true;
}

export function normalizeRecommendationImageUrl(url: string | null | undefined): string | null {
  if (!url || !isUsableRecommendationImage(url)) return null;
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
  const known = resolveKnownVenueImageForItem(item.id, item.title);
  const image_url = normalizeRecommendationImageUrl(item.image_url || known);
  if (image_url === item.image_url) return item;
  return { ...item, image_url };
}

export function attachRecommendationImages<T extends Recommendation>(items: T[]): T[] {
  return items.map(attachRecommendationImage);
}
