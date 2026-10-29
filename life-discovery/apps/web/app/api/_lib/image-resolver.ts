import { isLocalVenueImage, normalizeRecommendationImageUrl } from "@/shared/recommendation-images";
import { resolveContextualLocalImage, resolveKnownVenueImageForItem } from "@/shared/known-venue-images";

import {
  fetchVenueWebsiteImages,
  fetchWikipediaVenueImage,
  isGooglePlacesEnabled,
} from "./dining-image-fallback";
import { fetchGooglePlacePhotoForVenue } from "./google-places";
import type { RecommendationPayload } from "./recommendation-mapper";
import { buildTmdbPosterUrl, cleanTitleForTmdbSearch, fetchTmdbPosterByTitle } from "./tmdb-client";

export type ImageCandidate = RecommendationPayload & {
  latitude?: number | null;
  longitude?: number | null;
};

export type ImageResolveContext = {
  usedUrls?: Map<string, number>;
  domainOgUrls?: Map<string, Set<string>>;
};

export type ResolvedImage = {
  url: string | null;
  source: string | null;
};

const serverImageCache = new Map<string, ResolvedImage>();
const MAX_CACHE_ENTRIES = 400;

function setServerCache(key: string, value: ResolvedImage) {
  if (!key || !value.url) return;
  if (serverImageCache.size >= MAX_CACHE_ENTRIES) {
    const firstKey = serverImageCache.keys().next().value;
    if (firstKey) serverImageCache.delete(firstKey);
  }
  serverImageCache.set(key, value);
}

function hostnameFromUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

export function acceptUniqueImageUrl(url: string | null, ctx?: ImageResolveContext): string | null {
  const normalized = normalizeRecommendationImageUrl(url);
  if (!normalized) return null;

  if (isLocalVenueImage(normalized)) {
    return normalized;
  }

  const used = ctx?.usedUrls?.get(normalized) ?? 0;
  if (used >= 1) return null;

  ctx?.usedUrls?.set(normalized, used + 1);
  return normalized;
}

function rejectDomainOgDuplicate(imageUrl: string, pageTarget: string, ctx?: ImageResolveContext): boolean {
  const host = hostnameFromUrl(pageTarget);
  if (!host || !ctx?.domainOgUrls) return false;

  const seen = ctx.domainOgUrls.get(host) || new Set<string>();
  if (seen.has(imageUrl) && seen.size >= 1) return true;

  seen.add(imageUrl);
  ctx.domainOgUrls.set(host, seen);
  return false;
}

async function tryWebsiteOgImages(item: ImageCandidate, ctx?: ImageResolveContext): Promise<ResolvedImage | null> {
  const pageTarget = item.booking_url || item.url;
  if (!pageTarget) return null;

  const images = await fetchVenueWebsiteImages(item);
  for (const ogImage of images) {
    if (rejectDomainOgDuplicate(ogImage, pageTarget, ctx)) continue;
    const accepted = acceptUniqueImageUrl(ogImage, ctx);
    if (accepted) return { url: accepted, source: "og" };
  }

  return null;
}

export async function resolveRecommendationImageCore(
  item: ImageCandidate,
  ctx?: ImageResolveContext
): Promise<ResolvedImage> {
  const nativePhoto = normalizeRecommendationImageUrl(item.image_url);
  if (nativePhoto && !isLocalVenueImage(nativePhoto)) {
    const accepted = acceptUniqueImageUrl(nativePhoto, ctx);
    if (accepted) return { url: accepted, source: "native" };
  }
  // Prefer the restaurant's own photography over the generic local fallback.
  if (item.domain === "dining_out" && (item.booking_url || item.url)) {
    const photoKey = `dining|${item.id}|${item.booking_url || item.url}`;
    const cachedPhoto = serverImageCache.get(photoKey);
    if (cachedPhoto?.url) return cachedPhoto;
    const websitePhoto = await tryWebsiteOgImages(item, ctx);
    if (websitePhoto) { setServerCache(photoKey, websitePhoto); return websitePhoto; }
  }
  const knownImage = resolveKnownVenueImageForItem(item.id, item.title, item.location);
  if (knownImage) {
    return { url: knownImage, source: "local_curated" };
  }

  const existing = normalizeRecommendationImageUrl(item.image_url);
  if (existing) {
    const accepted = acceptUniqueImageUrl(existing, ctx);
    if (accepted) return { url: accepted, source: "native" };
  }

  const cacheKey = `${item.id || ""}|${item.title}|${item.booking_url || item.url || ""}`;
  const cached = serverImageCache.get(cacheKey);
  if (cached?.url) {
    const accepted = acceptUniqueImageUrl(cached.url, ctx);
    if (accepted) return cached;
  }

  const ogResult = await tryWebsiteOgImages(item, ctx);
  if (ogResult) {
    setServerCache(cacheKey, ogResult);
    return ogResult;
  }

  if (isGooglePlacesEnabled() && (item.domain === "dining_out" || item.domain === "delivery")) {
    const googlePhoto = await fetchGooglePlacePhotoForVenue(item.title, {
      neighborhood: item.neighborhood,
      city: item.city || "São Paulo",
      latitude: item.latitude,
      longitude: item.longitude,
    });
    if (googlePhoto) {
      const accepted = acceptUniqueImageUrl(googlePhoto, ctx);
      if (accepted) {
        const res = { url: accepted, source: "google_places" };
        setServerCache(cacheKey, res);
        return res;
      }
    }
  }

  if (item.domain === "movies_series") {
    const cleanedTitle = cleanTitleForTmdbSearch(item.title);
    const tmdbImage = cleanedTitle ? await fetchTmdbPosterByTitle(cleanedTitle) : null;
    if (tmdbImage) {
      const accepted = acceptUniqueImageUrl(tmdbImage, ctx);
      if (accepted) {
        const res = { url: accepted, source: "tmdb" };
        setServerCache(cacheKey, res);
        return res;
      }
    }
  }

  if (item.domain === "dining_out" || item.domain === "events_exhibitions" || item.domain === "delivery") {
    const wikiImage = await fetchWikipediaVenueImage(item);
    if (wikiImage) {
      const accepted = acceptUniqueImageUrl(wikiImage, ctx);
      if (accepted) {
        const res = { url: accepted, source: "wikipedia" };
        setServerCache(cacheKey, res);
        return res;
      }
    }
  }

  // Fallback to contextual local asset so no card is left without an image
  const contextualLocal = resolveContextualLocalImage(item);
  return { url: contextualLocal, source: "local_contextual" };
}

export function buildTmdbPosterFromPath(posterPath?: string | null): string | null {
  if (!posterPath) return null;
  return buildTmdbPosterUrl(posterPath);
}
