import { NextRequest, NextResponse } from "next/server";

import type { RecommendationDomain } from "@life/shared-types";

import { cacheHeaders } from "../_lib/external-api";
import { resolveRecommendationImageCore } from "../_lib/image-resolver";

const IMAGE_CACHE = cacheHeaders({ revalidate: 86400, stale: 43200 });

export async function GET(request: NextRequest) {
  const target = request.nextUrl.searchParams.get("target");
  const title = request.nextUrl.searchParams.get("title") || "";
  const location = request.nextUrl.searchParams.get("location") || "";
  const neighborhood = request.nextUrl.searchParams.get("neighborhood") || "";
  const city = request.nextUrl.searchParams.get("city") || "Sao Paulo";
  const domainParam = request.nextUrl.searchParams.get("domain") || "";
  const domain = (domainParam || "events_exhibitions") as RecommendationDomain;
  const id = request.nextUrl.searchParams.get("id") || "";

  const respond = (payload: { url: string | null; source: string | null }) =>
    NextResponse.json(payload, {
      status: 200,
      headers: payload.url ? IMAGE_CACHE : cacheHeaders({ revalidate: 300, stale: 120 }),
    });

  const resolved = await resolveRecommendationImageCore({
    id,
    title,
    description: "",
    category: "editorial",
    domain,
    city,
    location: location || neighborhood || city,
    neighborhood: neighborhood || location || null,
    tags: [],
    source: "editorial-image",
    url: target,
    booking_url: target,
  });

  return respond(resolved);
}
