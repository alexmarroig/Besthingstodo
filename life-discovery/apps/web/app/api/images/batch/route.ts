export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";

import { cacheHeaders } from "../../_lib/external-api";
import { resolveRecommendationImageCore } from "../../_lib/image-resolver";
import type { BatchImageItem } from "@/shared/batch-image-item";

const BATCH_CACHE = cacheHeaders({ revalidate: 86400, stale: 43200 });
const MAX_ITEMS = 32;
const CONCURRENCY = 6;

function asDomain(value?: string | null) {
  if (value === "dining_out" || value === "delivery" || value === "movies_series" || value === "events_exhibitions") {
    return value;
  }
  return "events_exhibitions";
}

async function mapWithConcurrency<T, R>(items: T[], mapper: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await mapper(items[index]);
    }
  }

  const workers = Array.from({ length: Math.min(CONCURRENCY, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

export async function POST(request: NextRequest) {
  let body: { items?: BatchImageItem[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ images: {} }, { status: 400 });
  }

  const items = (body.items || [])
    .filter((item) => item?.id && item?.title)
    .slice(0, MAX_ITEMS)
    .sort((a, b) => (b.quality_score ?? 0) - (a.quality_score ?? 0));

  const ctx = {
    usedUrls: new Map<string, number>(),
    domainOgUrls: new Map<string, Set<string>>(),
  };

  const resolvedList = await mapWithConcurrency(items, async (item) => {
    const result = await resolveRecommendationImageCore(
      {
        id: item.id,
        title: item.title,
        description: "",
        category: "editorial",
        domain: asDomain(item.domain),
        city: item.city || "São Paulo",
        location: item.location || item.neighborhood || item.city || "São Paulo",
        neighborhood: item.neighborhood || null,
        tags: [],
        source: "batch-image",
        url: item.url || null,
        booking_url: item.booking_url || null,
        image_url: item.image_url || null,
        latitude: item.latitude ?? null,
        longitude: item.longitude ?? null,
      },
      ctx
    );
    return [item.id, result.url] as const;
  });

  const images: Record<string, string | null> = {};
  for (const [id, url] of resolvedList) {
    images[id] = url;
  }

  return NextResponse.json({ images }, { status: 200, headers: BATCH_CACHE });
}
