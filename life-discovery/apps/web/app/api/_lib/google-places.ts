import type { RecommendationPayload } from "./recommendation-mapper";

const PLACES_BASE = "https://places.googleapis.com/v1/places:searchText";

type GoogleSearchOptions = {
  textQuery: string;
  maxResultCount?: number;
  includedType?: string;
  openNow?: boolean;
  servesDelivery?: boolean;
};

function priceLevelToBand(level?: string | number | null) {
  const numeric = typeof level === "string" ? Number(level.replace("PRICE_LEVEL_", "")) : level;
  if (numeric === 1) return "$";
  if (numeric === 2) return "$$";
  if (numeric === 3) return "$$$";
  if (numeric === 4) return "$$$$";
  return null;
}

function mapGooglePlace(place: any): RecommendationPayload {
  const reviews = place.reviews || [];
  const topReview = reviews[0];
  const location = place.location || {};
  const primaryType = (place.primaryType || place.types?.[0] || "restaurant").replace(/_/g, " ");

  return {
    id: `gplace-${place.id || crypto.randomUUID()}`,
    title: place.displayName?.text || place.name || "Restaurante",
    description:
      place.editorialSummary?.text ||
      [place.formattedAddress, topReview?.text?.text].filter(Boolean).join(" — ").slice(0, 420) ||
      place.formattedAddress ||
      "",
    category: primaryType.includes("cafe") ? "cafe" : primaryType.includes("bar") ? "bar" : "restaurant",
    domain: "dining_out",
    content_tier: (place.rating || 0) >= 4.5 ? "curated" : "discovery",
    city: "São Paulo",
    location: place.shortFormattedAddress || place.formattedAddress || "São Paulo",
    neighborhood: place.addressComponents?.find((c: any) => c.types?.includes("sublocality"))?.longText || null,
    image_url: place.photos?.[0]?.name
      ? `https://places.googleapis.com/v1/${place.photos[0].name}/media?maxHeightPx=600&key=${process.env.GOOGLE_PLACES_API_KEY}`
      : null,
    tags: (place.types || []).slice(0, 6).map((type: string) => type.replace(/_/g, " ")),
    source: "Google Places",
    url: place.googleMapsUri || place.websiteUri || null,
    booking_url: place.googleMapsUri || null,
    availability_kind: place.delivery ? "delivery" : "venue",
    quality_score: place.rating ? Math.round(place.rating * 20) : null,
    score: place.rating || null,
    rating: place.rating || null,
    review_snippet: topReview?.text?.text?.slice(0, 180) || null,
    price_band: priceLevelToBand(place.priceLevel),
    latitude: location.latitude ?? null,
    longitude: location.longitude ?? null,
    profile_signals: [],
    personalization_label: null,
    related_favorite: null,
  };
}

export async function searchGooglePlaces(options: GoogleSearchOptions): Promise<RecommendationPayload[]> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return [];

  const body: Record<string, unknown> = {
    textQuery: options.textQuery,
    maxResultCount: options.maxResultCount || 12,
    languageCode: "pt-BR",
    regionCode: "BR",
    locationBias: {
      circle: {
        center: { latitude: -23.5505, longitude: -46.6333 },
        radius: 18000,
      },
    },
  };

  if (options.includedType) body.includedType = options.includedType;
  if (options.openNow) body.openNow = true;

  const fieldMask = [
    "places.id",
    "places.displayName",
    "places.formattedAddress",
    "places.shortFormattedAddress",
    "places.location",
    "places.rating",
    "places.userRatingCount",
    "places.priceLevel",
    "places.types",
    "places.primaryType",
    "places.googleMapsUri",
    "places.websiteUri",
    "places.editorialSummary",
    "places.reviews",
    "places.photos",
    "places.delivery",
    "places.addressComponents",
  ].join(",");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(PLACES_BASE, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": fieldMask,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
      next: { revalidate: 900 },
    });

    if (!res.ok) return [];
    const data = await res.json();
    let places: RecommendationPayload[] = (data.places || []).map(mapGooglePlace);
    if (options.servesDelivery) {
      places = places.filter((place: RecommendationPayload) => place.availability_kind === "delivery");
    }
    return places;
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchGooglePlacePhotoForVenue(
  title: string,
  options?: { neighborhood?: string | null; city?: string }
): Promise<string | null> {
  const city = options?.city || "São Paulo";
  const neighborhood = options?.neighborhood || "";
  const textQuery = `${title} restaurante ${neighborhood} ${city}`.replace(/\s+/g, " ").trim();
  const results = await searchGooglePlaces({ textQuery, maxResultCount: 1, includedType: "restaurant" });
  if (results[0]?.image_url) return results[0].image_url;

  const cafeResults = await searchGooglePlaces({ textQuery: `${title} ${city}`, maxResultCount: 1, includedType: "cafe" });
  return cafeResults[0]?.image_url || null;
}
