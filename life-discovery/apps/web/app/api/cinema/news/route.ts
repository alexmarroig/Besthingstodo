import { jsonFallback, jsonWithCache } from "../../_lib/external-api";
import { enrichRecommendationImagesAsync } from "../../_lib/recommendation-images";
import {
  dedupeRecommendations,
  mapRssItemToRecommendation,
} from "../../_lib/recommendation-mapper";
import { fetchRssFeed } from "../../_lib/rss";
import { CINEMA_NEWS_SOURCES } from "../../_lib/source-registry";

const FALLBACK = [
  {
    id: "cinema-news-fallback-1",
    title: "Estreias da semana em São Paulo",
    description: "Panorama editorial de cinema e séries com destaques nacionais e internacionais.",
    category: "news",
    domain: "movies_series",
    content_tier: "curated",
    city: "São Paulo",
    location: "São Paulo",
    tags: ["cinema", "estreias", "series"],
    source: "Omelete",
    editorial_source: "Omelete",
    url: "https://www.omelete.com.br/",
    availability_kind: "streaming",
    quality_score: 78,
    score: 7.8,
  },
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get("limit") || "16"), 30);

  try {
    const items = [];
    for (const source of CINEMA_NEWS_SOURCES) {
      for (const feedUrl of source.feeds || []) {
        const feedItems = await fetchRssFeed(feedUrl, 10);
        for (const item of feedItems.slice(0, 10)) {
          items.push(
            mapRssItemToRecommendation(item, {
              sourceLabel: source.label,
              domain: "movies_series",
              contentTier: source.contentTier,
              baseTags: source.tags,
              categoryFallback: "news",
              qualityScore: 76,
            })
          );
        }
      }
    }

    const merged = dedupeRecommendations(items).slice(0, limit);
    if (merged.length === 0) {
      return jsonFallback(FALLBACK, { revalidate: 900, fallbackMaxAge: 120 });
    }

    const enriched = await enrichRecommendationImagesAsync(merged, { maxOgLookups: 12 });
    return jsonWithCache(enriched, { revalidate: 1800, stale: 600 });
  } catch {
    return jsonFallback(FALLBACK, { revalidate: 900, fallbackMaxAge: 120 });
  }
}
