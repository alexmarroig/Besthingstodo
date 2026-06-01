import { NextRequest, NextResponse } from "next/server";

import { fetchOgImageFromUrl, fetchWikipediaThumbnail } from "../_lib/og-image";

export async function GET(request: NextRequest) {
  const target = request.nextUrl.searchParams.get("target");
  const title = request.nextUrl.searchParams.get("title") || "";
  const location = request.nextUrl.searchParams.get("location") || "";
  const city = request.nextUrl.searchParams.get("city") || "Sao Paulo";

  if (target) {
    const ogImage = await fetchOgImageFromUrl(target);
    if (ogImage) {
      return NextResponse.json({ url: ogImage, source: "og" }, { status: 200 });
    }
  }

  if (title) {
    const wikiImage = await fetchWikipediaThumbnail([title, location, city].filter(Boolean).join(" "));
    if (wikiImage) {
      return NextResponse.json({ url: wikiImage, source: "wikipedia" }, { status: 200 });
    }
  }

  return NextResponse.json({ url: null, source: null }, { status: 200 });
}
