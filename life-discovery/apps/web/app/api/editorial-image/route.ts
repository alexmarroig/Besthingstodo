import { NextRequest, NextResponse } from "next/server";

import { fetchGooglePlacePhotoForVenue } from "../_lib/google-places";
import { resolveKnownVenueImage } from "../_lib/known-venue-images";
import { fetchOgImageFromUrl, fetchWikipediaThumbnail } from "../_lib/og-image";
import { fetchTmdbPosterByTitle } from "../_lib/tmdb-client";

export async function GET(request: NextRequest) {
  const target = request.nextUrl.searchParams.get("target");
  const title = request.nextUrl.searchParams.get("title") || "";
  const location = request.nextUrl.searchParams.get("location") || "";
  const neighborhood = request.nextUrl.searchParams.get("neighborhood") || "";
  const city = request.nextUrl.searchParams.get("city") || "Sao Paulo";
  const domain = request.nextUrl.searchParams.get("domain") || "";
  const id = request.nextUrl.searchParams.get("id") || "";

  const knownImage = resolveKnownVenueImage(id);
  if (knownImage) {
    return NextResponse.json({ url: knownImage, source: "curated" }, { status: 200 });
  }

  if (target) {
    const ogImage = await fetchOgImageFromUrl(target);
    if (ogImage) {
      return NextResponse.json({ url: ogImage, source: "og" }, { status: 200 });
    }
  }

  if (domain === "dining_out" || domain === "delivery" || !domain) {
    const googlePhoto = await fetchGooglePlacePhotoForVenue(title, {
      neighborhood: neighborhood || location,
      city,
    });
    if (googlePhoto) {
      return NextResponse.json({ url: googlePhoto, source: "google_places" }, { status: 200 });
    }
  }

  if (domain === "movies_series" && title) {
    const tmdbImage = await fetchTmdbPosterByTitle(title);
    if (tmdbImage) {
      return NextResponse.json({ url: tmdbImage, source: "tmdb" }, { status: 200 });
    }
  }

  if (title) {
    const wikiImage = await fetchWikipediaThumbnail(
      [title, neighborhood || location, city].filter(Boolean).join(" ")
    );
    if (wikiImage) {
      return NextResponse.json({ url: wikiImage, source: "wikipedia" }, { status: 200 });
    }
  }

  return NextResponse.json({ url: null, source: null }, { status: 200 });
}
