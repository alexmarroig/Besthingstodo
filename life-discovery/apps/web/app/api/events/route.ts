import { fetchExternalJson, jsonFallback, jsonWithCache } from "../_lib/external-api";
import { loadDailySource } from "../_lib/data-hub";
import { fetchAllLocalEvents } from "../_lib/event-providers";
import { enrichRecommendationImagesAsync } from "../_lib/recommendation-images";
import { isSportsEvent, localizeRecommendation } from "../_lib/labels-pt";
import { loadLocalEvents } from "../_lib/local-data";
import { dedupeRecommendations } from "../_lib/recommendation-mapper";
import type { RecommendationPayload } from "../_lib/recommendation-mapper";

function mapEvent(event: any): RecommendationPayload {
  const images = event.images || [];
  const bestImage = images.find((img: any) => img.ratio === "16_9" && img.width > 500) || images[0];
  const classifications = event.classifications || [];
  const tags: string[] = [];
  for (const c of classifications) {
    if (c.genre?.name && c.genre.name !== "Undefined") tags.push(c.genre.name);
    if (c.subGenre?.name && c.subGenre.name !== "Undefined") tags.push(c.subGenre.name);
    if (c.segment?.name && c.segment.name !== "Undefined") tags.push(c.segment.name);
  }
  const venue = event._embedded?.venues?.[0];
  const priceRange = event.priceRanges?.[0];

  return {
    id: `evt-${event.id}`,
    title: event.name || "Evento",
    description: event.info || event.pleaseNote || "",
    category: "event",
    domain: "events_exhibitions",
    city: venue?.city?.name || "São Paulo",
    location: venue?.name || "",
    neighborhood: venue?.city?.name || null,
    image_url: bestImage?.url || null,
    tags,
    source: "Ticketmaster",
    editorial_source: "Ticketmaster",
    url: event.url || null,
    score: null,
    price: priceRange?.min ?? null,
    start_time: event.dates?.start?.dateTime || event.dates?.start?.localDate || null,
    latitude: venue?.location?.latitude ? parseFloat(venue.location.latitude) : null,
    longitude: venue?.location?.longitude ? parseFloat(venue.location.longitude) : null,
    personalization_label: null,
    related_favorite: null,
    quality_score: null,
    profile_signals: [],
  };
}

async function fetchTicketmasterEvents(options: {
  apiKey: string;
  city: string;
  size: string;
  presetKeyword: string;
}) {
  const params = new URLSearchParams({
    apikey: options.apiKey,
    countryCode: "BR",
    city: options.city,
    size: options.size,
    sort: "date,asc",
    locale: "*",
  });
  if (options.presetKeyword) params.set("keyword", options.presetKeyword);

  const now = new Date();
  params.set("startDateTime", now.toISOString().replace(/\.\d{3}Z$/, "Z"));

  const url = `https://app.ticketmaster.com/discovery/v2/events.json?${params.toString()}`;
  const data = await fetchExternalJson<any>(url, { revalidate: 900 });
  return (data._embedded?.events || []).map(mapEvent);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const city = searchParams.get("city") || "Sao Paulo";
  const keyword = searchParams.get("keyword") || "";
  const preset = searchParams.get("preset") || "";
  const size = searchParams.get("size") || "12";
  const apiKey = process.env.TICKETMASTER_API_KEY;

  const presetKeyword =
    preset === "gastro"
      ? "gastronomia festival food"
      : preset === "wine"
        ? "wine vinho"
        : preset === "restaurant_week"
          ? "restaurant week"
          : keyword;

  const [localEvents, snapshotEvents, aggregatedLocal] = await Promise.all([
    loadLocalEvents(),
    loadDailySource("events", city),
    fetchAllLocalEvents({ limit: 24, gastroOnly: preset === "gastro" }),
  ]);

  try {
    let ticketmasterEvents: RecommendationPayload[] = [];
    if (apiKey) {
      ticketmasterEvents = await fetchTicketmasterEvents({ apiKey, city, size, presetKeyword });
      if (!preset) {
        ticketmasterEvents = ticketmasterEvents.filter((item) => !isSportsEvent(item));
      }
    }

    let merged = dedupeRecommendations([
      ...snapshotEvents,
      ...localEvents,
      ...aggregatedLocal,
      ...ticketmasterEvents,
    ])
      .sort((a, b) => {
        const sourceBoost = (item: RecommendationPayload) => {
          const label = (item.source || "").toLowerCase();
          if (label.includes("sympla")) return 4;
          if (label.includes("masp") || label.includes("pinacoteca") || label.includes("ccbb") || label.includes("mis")) return 4;
          if (label.includes("itau") || label.includes("itaú")) return 4;
          if (label.includes("ims") || label.includes("sesc") || label.includes("planet")) return 3;
          if (label.includes("ticketmaster")) return 3;
          if (label.includes("fever")) return 2;
          if (label.includes("timeout")) return 2;
          if (label.includes("catraca")) return 2;
          return 0;
        };
        return (b.quality_score || 0) + sourceBoost(b) - ((a.quality_score || 0) + sourceBoost(a));
      })
      .slice(0, Number(size));

    const localized = await enrichRecommendationImagesAsync(merged.map((item) => localizeRecommendation(item)));
    return jsonWithCache(localized, { revalidate: 900, stale: 300 });
  } catch {
    const fallback = await enrichRecommendationImagesAsync(
      dedupeRecommendations([...snapshotEvents, ...localEvents, ...aggregatedLocal]).map((item) =>
        localizeRecommendation(item)
      )
    );
    return jsonFallback(fallback, { revalidate: 900, fallbackMaxAge: 60 });
  }
}
