import { fetchExternalJson, jsonFallback, jsonWithCache } from "../_lib/external-api";
import { loadDailySource } from "../_lib/data-hub";
import { searchGooglePlaces } from "../_lib/google-places";
import { localizeRecommendation } from "../_lib/labels-pt";
import { loadLocalRestaurants } from "../_lib/local-data";
import {
  buildPlaceDescription,
  filterValidPlaces,
  isValidPlaceName,
  mergePlaces,
} from "../_lib/places-utils";
import { PLACE_INTENT_QUERIES } from "../_lib/source-registry";
import type { RecommendationPayload } from "../_lib/recommendation-mapper";

const SP_LAT = -23.5489;
const SP_LNG = -46.6388;

function mapPlace(feature: any): RecommendationPayload | null {
  const p = feature.properties || {};
  const name = (p.name || "").trim();
  if (!isValidPlaceName(name)) return null;

  const cat = (p.categories || []).join(",");
  let category = "restaurant";
  if (cat.includes("cafe")) category = "cafe";
  else if (cat.includes("bar")) category = "bar";
  else if (cat.includes("fast_food")) category = "fast_food";

  return {
    id: `place-${p.place_id || crypto.randomUUID()}`,
    title: name,
    description: buildPlaceDescription(name, p),
    category,
    domain: "dining_out",
    city: p.city || "São Paulo",
    location: p.suburb || p.district || p.city || "",
    neighborhood: p.suburb || p.district || null,
    image_url: null,
    tags: (p.categories || [])
      .map((c: string) => c.split(".").pop())
      .filter(Boolean)
      .slice(0, 4),
    source: "Geoapify",
    url: p.website || null,
    score: null,
    price: null,
    latitude: feature.geometry?.coordinates?.[1] ?? null,
    longitude: feature.geometry?.coordinates?.[0] ?? null,
    personalization_label: null,
    related_favorite: null,
    quality_score: 72,
    profile_signals: [],
    rating: null,
    review_snippet: null,
    price_band: null,
  };
}

function filterByNeighborhood<T extends { neighborhood?: string | null; location?: string; title?: string; description?: string }>(
  items: T[],
  neighborhood?: string | null
) {
  if (!neighborhood) return items;
  const needle = neighborhood.toLowerCase();
  return items.filter((item) =>
    [item.neighborhood, item.location, item.title, item.description]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(needle))
  );
}

function filterByCategory(items: RecommendationPayload[], categories: string) {
  if (categories.includes("cafe")) {
    return items.filter((item) => item.category === "cafe" || (item.tags || []).some((tag) => tag.includes("caf")));
  }
  if (categories.includes("restaurant")) {
    return items.filter((item) => item.category !== "cafe");
  }
  return items;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");
  const radius = searchParams.get("radius") || "8000";
  const categories = searchParams.get("categories") || "catering.restaurant";
  const city = searchParams.get("city") || "Sao Paulo";
  const intent = searchParams.get("intent") || "";
  const neighborhood = searchParams.get("neighborhood") || "";
  const apiKey = process.env.GEOAPIFY_API_KEY;
  const googleKey = process.env.GOOGLE_PLACES_API_KEY;

  const localRestaurants = filterByCategory(await loadLocalRestaurants(), categories);
  const snapshotRestaurants = filterByCategory(await loadDailySource("places", city), categories);
  let remoteResults: RecommendationPayload[] = [];

  if (googleKey) {
    try {
      const intentConfig = PLACE_INTENT_QUERIES[intent];
      const textQuery = intentConfig
        ? `${intentConfig.query}${neighborhood ? ` ${neighborhood}` : ""}`
        : `${categories.includes("cafe") ? "cafeteria" : "restaurante"} sao paulo${neighborhood ? ` ${neighborhood}` : ""}`;

      remoteResults = filterValidPlaces(
        await searchGooglePlaces({
          textQuery,
          maxResultCount: 15,
          includedType: categories.includes("cafe") ? "cafe" : "restaurant",
        })
      );
    } catch {
      remoteResults = [];
    }
  }

  if (remoteResults.length === 0 && apiKey) {
    try {
      let useLat = lat ? parseFloat(lat) : SP_LAT;
      let useLng = lng ? parseFloat(lng) : SP_LNG;

      if (!lat && !lng && city && city.toLowerCase() !== "sao paulo") {
        const geoData = await fetchExternalJson<any>(
          `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(city)}&limit=1&apiKey=${apiKey}`,
          { revalidate: 3600 }
        );
        const firstResult = geoData.features?.[0]?.properties;
        if (firstResult) {
          useLat = firstResult.lat;
          useLng = firstResult.lon;
        }
      }

      const url = `https://api.geoapify.com/v2/places?categories=${encodeURIComponent(categories)}&filter=circle:${useLng},${useLat},${radius}&limit=20&apiKey=${apiKey}`;
      const data = await fetchExternalJson<any>(url, { revalidate: 900 });
      remoteResults = (data.features || [])
        .map(mapPlace)
        .filter(Boolean) as RecommendationPayload[];
    } catch {
      remoteResults = [];
    }
  }

  const merged = mergePlaces([...snapshotRestaurants, ...localRestaurants], remoteResults, 18);
  const filtered = filterByNeighborhood(merged, neighborhood).map((item) => localizeRecommendation(item));

  if (filtered.length === 0) {
    const fallback = filterByNeighborhood([...snapshotRestaurants, ...localRestaurants], neighborhood).map((item) =>
      localizeRecommendation(item)
    );
    return jsonWithCache(fallback, { revalidate: 900, stale: 300 });
  }

  try {
    return jsonWithCache(filtered, { revalidate: 900, stale: 300 });
  } catch {
    return jsonFallback(filtered, { revalidate: 900, fallbackMaxAge: 60 });
  }
}
