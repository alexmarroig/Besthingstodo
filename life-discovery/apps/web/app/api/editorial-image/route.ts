import { NextRequest, NextResponse } from "next/server";

import { cacheHeaders } from "../_lib/external-api";
import { fetchGooglePlacePhotoForVenue } from "../_lib/google-places";
import { resolveKnownVenueImage } from "../_lib/known-venue-images";
import { fetchOgImageFromUrl, fetchWikipediaThumbnail } from "../_lib/og-image";
import { fetchTmdbPosterByTitle } from "../_lib/tmdb-client";

const IMAGE_CACHE = cacheHeaders({ revalidate: 86400, stale: 43200 });

export async function GET(request: NextRequest) {
  const target = request.nextUrl.searchParams.get("target");
  const title = request.nextUrl.searchParams.get("title") || "";
  const location = request.nextUrl.searchParams.get("location") || "";
  const neighborhood = request.nextUrl.searchParams.get("neighborhood") || "";
  const city = request.nextUrl.searchParams.get("city") || "Sao Paulo";
  const domain = request.nextUrl.searchParams.get("domain") || "";
  const id = request.nextUrl.searchParams.get("id") || "";

  const respond = (payload: { url: string | null; source: string | null }) =>
    NextResponse.json(payload, { status: 200, headers: payload.url ? IMAGE_CACHE : cacheHeaders({ revalidate: 300, stale: 120 }) });

  const knownImage = resolveKnownVenueImage(id);
  if (knownImage) {
    return respond({ url: knownImage, source: "curated" });
  }

  if (target) {
    const ogImage = await fetchOgImageFromUrl(target);
    if (ogImage) {
      return respond({ url: ogImage, source: "og" });
    }
  }

  if (domain === "dining_out" || domain === "delivery" || !domain) {
    const googlePhoto = await fetchGooglePlacePhotoForVenue(title, {
      neighborhood: neighborhood || location,
      city,
    });
    if (googlePhoto) {
      return respond({ url: googlePhoto, source: "google_places" });
    }
  }

  if (domain === "movies_series" && title) {
    const tmdbImage = await fetchTmdbPosterByTitle(title);
    if (tmdbImage) {
      return respond({ url: tmdbImage, source: "tmdb" });
    }
  }

  if (title) {
    const wikiImage = await fetchWikipediaThumbnail(
      [title, neighborhood || location, city].filter(Boolean).join(" ")
    );
    if (wikiImage) {
      return respond({ url: wikiImage, source: "wikipedia" });
    }
  }

  return respond({ url: null, source: null });
}
