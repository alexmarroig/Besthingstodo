import { readFile } from "node:fs/promises";
import path from "node:path";

import { loadDailySource } from "../../_lib/data-hub";
import { enrichRecommendationImagesAsync } from "../../_lib/recommendation-images";
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
    image_url: "/images/venues/sp-evvai.jpg",
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
    const feedTasks = GASTRO_EDITORIAL_SOURCES.flatMap((source) =>
      (source.feeds || []).map(async (feedUrl) => {
        const feedItems = await fetchRssFeed(feedUrl, 2500);
        return feedItems.slice(0, 10).map((item) =>
          mapRssItemToRecommendation(item, {
            sourceLabel: source.label,
            domain: source.domain,
            contentTier: source.contentTier,
            baseTags: source.tags,
            qualityScore: source.contentTier === "signature" ? 88 : 78,
          })
        );
      })
    );

    const [snapshotHubItems, snapshotItems, ...feedBatches] = await Promise.all([
      loadDailySource("gastro", "São Paulo"),
      loadSnapshot(),
      ...feedTasks,
    ]);

    const liveItems = feedBatches.flat();
    const merged = dedupeRecommendations([...snapshotHubItems, ...liveItems, ...snapshotItems]);
    const filtered = await enrichRecommendationImagesAsync(filterByTopic(merged, topic).slice(0, limit), {
      maxOgLookups: 4,
    });

    if (filtered.length === 0) {
      return jsonFallback(await enrichRecommendationImagesAsync(filterByTopic(FALLBACK, topic), { maxOgLookups: 0 }), {
        revalidate: 900,
        fallbackMaxAge: 120,
      });
    }

    return jsonWithCache(filtered, { revalidate: 1800, stale: 600 });
  } catch {
    return jsonFallback(filterByTopic(FALLBACK, topic), { revalidate: 900, fallbackMaxAge: 120 });
  }
}
