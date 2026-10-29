import type { Recommendation } from "@life/shared-types";

import {
  resolveContextualLocalImage,
  resolveKnownVenueImageForItem,
} from "./known-venue-images";

const LOW_QUALITY_PATTERNS = [
  "images.unsplash.com",
  "source.unsplash.com",
  "maps.geoapify.com/v1/staticmap",
  "res.cloudinary.com/the-infatuation",
  "/favicon",
  "favicon.ico",
  "apple-touch-icon",
  "/logo.",
  "/logo_",
  "/logo-",
  "/logos/",
  "logo-catraca",
  "catracalivre.com.br/wp-content/uploads/2020",
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

export function isLocalVenueImage(url: string | null | undefined): boolean {
  if (!url) return false;
  return url.trim().startsWith("/images/");
}

/** URLs genéricas ou de baixa qualidade — tratamos como ausência de foto. */
export function isGenericPlaceholderImage(url: string | null | undefined): boolean {
  if (!url) return false;
  if (isLocalVenueImage(url)) return false;
  const normalized = url.toLowerCase();
  return LOW_QUALITY_PATTERNS.some((pattern) => normalized.includes(pattern));
}

/** Rejeita imagens muito pequenas pela URL (ex.: thumb 32px). */
export function isLikelyLowResolutionImage(url: string | null | undefined): boolean {
  if (!url) return false;
  if (isLocalVenueImage(url)) return false;
  const normalized = url.toLowerCase();
  if (/(?:^|[?&/_-])(?:w|width|h|height)=(?:[1-9]|[1-9]\d)(?:&|$|[/"'])/.test(normalized)) return true;
  if (/\/(\d{1,2}x\d{1,2})(?:[./_-]|$)/.test(normalized)) return true;
  return false;
}

export function isUsableRecommendationImage(url: string | null | undefined): boolean {
  if (!url) return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (isLocalVenueImage(trimmed)) return true;
  if (isGenericPlaceholderImage(trimmed)) return false;
  if (isLikelyLowResolutionImage(trimmed)) return false;
  return true;
}

export function normalizeRecommendationImageUrl(url: string | null | undefined): string | null {
  if (!url || !isUsableRecommendationImage(url)) return null;
  return url.trim();
}

/** Resolve imagem local por contexto/tema quando não há foto dedicada. */
export function resolveThemeImageUrl(item: {
  id?: string | null;
  title?: string | null;
  description?: string | null;
  category?: string | null;
  domain?: string | null;
  location?: string | null;
  neighborhood?: string | null;
  tags?: string[] | null;
  source?: string | null;
}): string {
  return resolveContextualLocalImage(item);
}

export function attachRecommendationImage<T extends Recommendation>(item: T): T {
  const photo = normalizeRecommendationImageUrl(item.image_url);
  if (photo && !isLocalVenueImage(photo)) return item;
  const known = resolveKnownVenueImageForItem(item.id, item.title, item.location);
  if (known) {
    return item.image_url === known ? item : { ...item, image_url: known };
  }

  const existing = normalizeRecommendationImageUrl(item.image_url);
  if (existing) {
    return item.image_url === existing ? item : { ...item, image_url: existing };
  }

  const fallbackLocal = resolveContextualLocalImage(item);
  return item.image_url === fallbackLocal ? item : { ...item, image_url: fallbackLocal };
}

export function attachRecommendationImages<T extends Recommendation>(items: T[]): T[] {
  const usedRemoteUrls = new Set<string>();

  return items.map((item) => {
    const withKnown = attachRecommendationImage(item);
    const url = normalizeRecommendationImageUrl(withKnown.image_url);
    if (!url) {
      return { ...withKnown, image_url: resolveContextualLocalImage(withKnown) };
    }
    if (isLocalVenueImage(url)) {
      return withKnown;
    }
    if (usedRemoteUrls.has(url)) {
      return { ...withKnown, image_url: resolveContextualLocalImage(withKnown) };
    }
    usedRemoteUrls.add(url);
    return withKnown;
  });
}
