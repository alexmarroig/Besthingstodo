export const runtime = "nodejs";

import { jsonFallback, jsonWithCache } from "../../_lib/external-api";
import { fetchAllLocalEvents } from "../../_lib/event-providers";
import { enrichRecommendationImagesAsync } from "../../_lib/recommendation-images";
import { localizeRecommendation } from "../../_lib/labels-pt";
import { mapSnapshotItem } from "../../_lib/recommendation-mapper";

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
    image_url: "/images/venues/largo-da-batata.jpg",
    tags: ["gastronomia", "feira", "food truck"],
    source: "Catraca Livre",
    editorial_source: "Catraca Livre",
    url: "https://catracalivre.com.br/",
    availability_kind: "event",
    quality_score: 80,
  }),
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get("limit") || "24"), 40);
  const gastroOnly = searchParams.get("gastro") !== "false";

  try {
    const merged = await fetchAllLocalEvents({ limit, gastroOnly, includeSnapshots: true });
    if (merged.length === 0) {
      return jsonFallback(FALLBACK, { revalidate: 900, fallbackMaxAge: 120 });
    }

    const enriched = await enrichRecommendationImagesAsync(
      merged.map((item) => localizeRecommendation(item)),
      { maxOgLookups: 4 }
    );

    return jsonWithCache(enriched, { revalidate: 1800, stale: 600 });
  } catch {
    return jsonFallback(FALLBACK, { revalidate: 900, fallbackMaxAge: 120 });
  }
}
