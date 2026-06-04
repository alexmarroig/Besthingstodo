import { fetchExternalJson, jsonFallback, jsonWithCache } from "../../_lib/external-api";
import { localizeRecommendation } from "../../_lib/labels-pt";
import { loadLocalRestaurants } from "../../_lib/local-data";
import { filterValidPlaces, mergePlaces } from "../../_lib/places-utils";
import { enrichRecommendationImagesAsync } from "../../_lib/recommendation-images";
import { searchGooglePlaces } from "../../_lib/google-places";

const SP_LAT = -23.5489;
const SP_LNG = -46.6388;

function mapGeoapifyDelivery(feature: any) {
  const p = feature.properties || {};
  const name = (p.name || "").trim();
  if (!name || /^(rua|av\.?|avenida)\b/i.test(name)) return null;

  return {
    id: `delivery-${p.place_id || crypto.randomUUID()}`,
    title: name,
    description: [p.suburb || p.district, p.city].filter(Boolean).join(" · ") || "Delivery em São Paulo",
    category: "delivery",
    domain: "delivery",
    city: p.city || "São Paulo",
    location: p.suburb || p.district || p.city || "",
    neighborhood: p.suburb || p.district || null,
    image_url: null,
    tags: ["delivery", ...(p.categories || []).map((c: string) => c.split(".").pop()).filter(Boolean)].slice(0, 5),
    source: "Geoapify",
    url: p.website || null,
    booking_url: p.website || null,
    availability_kind: "delivery",
    quality_score: 75,
    score: 7.5,
    latitude: feature.geometry?.coordinates?.[1] ?? null,
    longitude: feature.geometry?.coordinates?.[0] ?? null,
    profile_signals: [],
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get("limit") || "12"), 20);

  try {
    const localDelivery = (await loadLocalRestaurants()).filter(
      (item) => item.availability_kind === "delivery" || item.domain === "delivery"
    );

    let remoteResults: any[] = [];
    const googleKey = process.env.GOOGLE_PLACES_API_KEY;

    if (googleKey) {
      const googleResults = await searchGooglePlaces({
        textQuery: "restaurante delivery sao paulo",
        maxResultCount: limit,
        includedType: "restaurant",
        servesDelivery: true,
      });
      if (googleResults.length > 0) {
        remoteResults = filterValidPlaces(googleResults);
      }
    }

    const apiKey = process.env.GEOAPIFY_API_KEY;
    if (remoteResults.length === 0 && apiKey) {
      const url = `https://api.geoapify.com/v2/places?categories=catering.restaurant,catering.fast_food&filter=circle:${SP_LNG},${SP_LAT},7000&limit=${limit}&apiKey=${apiKey}`;
      const data = await fetchExternalJson<any>(url, { revalidate: 900 });
      remoteResults = (data.features || []).map(mapGeoapifyDelivery).filter(Boolean);
    }

    const merged = await enrichRecommendationImagesAsync(
      mergePlaces(localDelivery, remoteResults, limit).map((item) => localizeRecommendation(item)),
      { maxOgLookups: 8 }
    );
    return jsonWithCache(merged, { revalidate: 900, stale: 300 });
  } catch {
    const fallback = await enrichRecommendationImagesAsync(
      (await loadLocalRestaurants())
        .filter((item) => item.domain === "delivery")
        .map((item) => localizeRecommendation(item)),
      { maxOgLookups: 6 }
    );
    return jsonFallback(fallback, { revalidate: 900, fallbackMaxAge: 120 });
  }
}
