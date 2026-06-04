import { normalizeRecommendationImageUrl } from "@/shared/recommendation-images";
import { resolveKnownVenueImageForItem } from "@/shared/known-venue-images";

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

function hostnameFromUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function acceptResolvedUrl(url: string | null, ctx?: ImageResolveContext): string | null {
  const normalized = normalizeRecommendationImageUrl(url);
  if (!normalized) return null;

  const used = ctx?.usedUrls?.get(normalized) ?? 0;
  if (used >= 2) return null;

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
    const accepted = acceptResolvedUrl(ogImage, ctx);
    if (accepted) return { url: accepted, source: "og" };
  }

  return null;
}

export async function resolveRecommendationImageCore(
  item: ImageCandidate,
  ctx?: ImageResolveContext
): Promise<ResolvedImage> {
  const existing = normalizeRecommendationImageUrl(item.image_url);
  if (existing) {
    const accepted = acceptResolvedUrl(existing, ctx);
    if (accepted) return { url: accepted, source: "native" };
  }

  const knownImage = resolveKnownVenueImageForItem(item.id, item.title);
  if (knownImage) {
    const accepted = acceptResolvedUrl(knownImage, ctx);
    if (accepted) return { url: accepted, source: "curated" };
  }

  const ogResult = await tryWebsiteOgImages(item, ctx);
  if (ogResult) return ogResult;

  if (isGooglePlacesEnabled() && (item.domain === "dining_out" || item.domain === "delivery")) {
    const googlePhoto = await fetchGooglePlacePhotoForVenue(item.title, {
      neighborhood: item.neighborhood,
      city: item.city || "São Paulo",
      latitude: item.latitude,
      longitude: item.longitude,
    });
    if (googlePhoto) {
      const accepted = acceptResolvedUrl(googlePhoto, ctx);
      if (accepted) return { url: accepted, source: "google_places" };
    }
  }

  if (item.domain === "movies_series") {
    const cleanedTitle = cleanTitleForTmdbSearch(item.title);
    const tmdbImage = cleanedTitle ? await fetchTmdbPosterByTitle(cleanedTitle) : null;
    if (tmdbImage) {
      const accepted = acceptResolvedUrl(tmdbImage, ctx);
      if (accepted) return { url: accepted, source: "tmdb" };
    }
  }

  if (item.domain === "dining_out" || item.domain === "events_exhibitions" || item.domain === "delivery") {
    const wikiImage = await fetchWikipediaVenueImage(item);
    if (wikiImage) {
      const accepted = acceptResolvedUrl(wikiImage, ctx);
      if (accepted) return { url: accepted, source: "wikipedia" };
    }
  }

  return { url: null, source: null };
}

export function buildTmdbPosterFromPath(posterPath?: string | null): string | null {
  if (!posterPath) return null;
  return buildTmdbPosterUrl(posterPath);
}
