import { readFile } from "node:fs/promises";
import path from "node:path";

import { jsonFallback, jsonWithCache } from "../../_lib/external-api";
import {
  dedupeRecommendations,
  mapRssItemToRecommendation,
  mapSnapshotItem,
} from "../../_lib/recommendation-mapper";
import { fetchRssFeed } from "../../_lib/rss";
import { LOCAL_EVENT_SOURCES } from "../../_lib/source-registry";

const FALLBACK = [
  mapSnapshotItem({
    id: "fallback-local-event-1",
    title: "Feira gastronômica noturna em São Paulo",
    description: "Evento com food trucks, chefs convidados e experiências ao ar livre.",
    category: "gastro_event",
    domain: "events_exhibitions",
    content_tier: "curated",
    city: "São Paulo",
    location: "Largo da Batata",
    tags: ["gastronomia", "feira", "food truck"],
    source: "Catraca Livre",
    editorial_source: "Catraca Livre",
    url: "https://catracalivre.com.br/",
    availability_kind: "event",
    quality_score: 80,
  }),
];

async function loadJsonSnapshot(fileName: string) {
  try {
    const filePath = path.join(process.cwd(), "public", "data", fileName);
    const raw = await readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as Array<Record<string, unknown>>;
    return parsed.map((item) => mapSnapshotItem(item));
  } catch {
    return [];
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get("limit") || "20"), 40);
  const gastroOnly = searchParams.get("gastro") !== "false";

  try {
    const liveItems = [];
    for (const source of LOCAL_EVENT_SOURCES) {
      for (const feedUrl of source.feeds || []) {
        const feedItems = await fetchRssFeed(feedUrl, 15);
        for (const item of feedItems.slice(0, 15)) {
          liveItems.push(
            mapRssItemToRecommendation(item, {
              sourceLabel: source.label,
              domain: "events_exhibitions",
              contentTier: source.contentTier,
              baseTags: source.tags,
              categoryFallback: "event",
              qualityScore: 76,
            })
          );
        }
      }
    }

    const snapshots = [
      ...(await loadJsonSnapshot("sympla-events.json")),
      ...(gastroOnly ? await loadJsonSnapshot("gastro-events.json") : []),
    ];

    const merged = dedupeRecommendations([...liveItems, ...snapshots]).slice(0, limit);
    if (merged.length === 0) {
      return jsonFallback(FALLBACK, { revalidate: 900, fallbackMaxAge: 120 });
    }

    return jsonWithCache(merged, { revalidate: 1800, stale: 600 });
  } catch {
    return jsonFallback(FALLBACK, { revalidate: 900, fallbackMaxAge: 120 });
  }
}
