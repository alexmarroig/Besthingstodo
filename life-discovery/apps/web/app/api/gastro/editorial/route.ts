import { readFile } from "node:fs/promises";
import path from "node:path";

import { loadDailySource } from "../../_lib/data-hub";
import { jsonFallback, jsonWithCache } from "../../_lib/external-api";
import {
  dedupeRecommendations,
  filterByTopic,
  mapRssItemToRecommendation,
  mapSnapshotItem,
} from "../../_lib/recommendation-mapper";
import { fetchRssFeed } from "../../_lib/rss";
import { GASTRO_EDITORIAL_SOURCES } from "../../_lib/source-registry";

const FALLBACK = [
  mapSnapshotItem({
    id: "fallback-gastro-1",
    title: "Paladar: novas casas para acompanhar em São Paulo",
    description: "Seleção editorial sobre aberturas, críticas e tendências da cena gastronômica paulistana.",
    category: "opening",
    domain: "dining_out",
    content_tier: "signature",
    city: "São Paulo",
    location: "São Paulo",
    tags: ["paladar", "abertura", "critica"],
    source: "Estadão Paladar",
    editorial_source: "Estadão Paladar",
    url: "https://www.estadao.com.br/paladar/",
    quality_score: 85,
  }),
];

async function loadSnapshot() {
  try {
    const filePath = path.join(process.cwd(), "public", "data", "gastro-editorial.json");
    const raw = await readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as Array<Record<string, unknown>>;
    return parsed.map((item) => mapSnapshotItem(item));
  } catch {
    return [];
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const topic = searchParams.get("topic") || "all";
  const limit = Math.min(Number(searchParams.get("limit") || "24"), 40);

  try {
    const liveItems = [];
    const snapshotHubItems = await loadDailySource("gastro", "São Paulo");

    for (const source of GASTRO_EDITORIAL_SOURCES) {
      for (const feedUrl of source.feeds || []) {
        const feedItems = await fetchRssFeed(feedUrl, 12);
        for (const item of feedItems.slice(0, 12)) {
          liveItems.push(
            mapRssItemToRecommendation(item, {
              sourceLabel: source.label,
              domain: source.domain,
              contentTier: source.contentTier,
              baseTags: source.tags,
              qualityScore: source.contentTier === "signature" ? 88 : 78,
            })
          );
        }
      }
    }

    const snapshotItems = await loadSnapshot();
    const merged = dedupeRecommendations([...snapshotHubItems, ...liveItems, ...snapshotItems]);
    const filtered = filterByTopic(merged, topic).slice(0, limit);

    if (filtered.length === 0) {
      return jsonFallback(filterByTopic(FALLBACK, topic), { revalidate: 900, fallbackMaxAge: 120 });
    }

    return jsonWithCache(filtered, { revalidate: 1800, stale: 600 });
  } catch {
    return jsonFallback(filterByTopic(FALLBACK, topic), { revalidate: 900, fallbackMaxAge: 120 });
  }
}
