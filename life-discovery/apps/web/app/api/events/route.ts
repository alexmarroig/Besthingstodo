import { fetchExternalJson, jsonFallback, jsonWithCache } from "../_lib/external-api";
import { loadDailySource } from "../_lib/data-hub";
import { fetchAllLocalEvents } from "../_lib/event-providers";
import { enrichRecommendationImagesAsync } from "../_lib/recommendation-images";
import { isSportsEvent, localizeRecommendation } from "../_lib/labels-pt";
import { loadLocalEvents } from "../_lib/local-data";
import { dedupeRecommendations } from "../_lib/recommendation-mapper";
import type { RecommendationPayload } from "../_lib/recommendation-mapper";

const FALLBACK_EVENTS: RecommendationPayload[] = [
  {
    id: "evt-1",
    title: "Festival de Jazz no Parque",
    description: "Noite de jazz ao ar livre com artistas locais e internacionais no Parque Ibirapuera.",
    category: "event",
    domain: "events_exhibitions",
    city: "São Paulo",
    location: "Parque Ibirapuera",
    tags: ["jazz", "música", "ao ar livre"],
    source: "Agenda SP",
    quality_score: 82,
    start_time: new Date(Date.now() + 86400000 * 3).toISOString(),
    latitude: -23.5874,
    longitude: -46.6576,
    profile_signals: [],
  },
  {
    id: "evt-2",
    title: "Exposição Imersiva: Van Gogh",
    description: "Mergulhe nas obras de Van Gogh com projeções 360° e trilha sonora envolvente.",
    category: "event",
    domain: "events_exhibitions",
    city: "São Paulo",
    location: "MIS Experience",
    tags: ["arte", "exposição", "imersivo"],
    source: "Agenda SP",
    quality_score: 85,
    price: 80,
    start_time: new Date(Date.now() + 86400000 * 5).toISOString(),
    latitude: -23.5710,
    longitude: -46.6895,
    profile_signals: [],
  },
  {
    id: "evt-3",
    title: "Stand-Up Comedy: Humor a Dois",
    description: "Noite de stand-up com os melhores comediantes de São Paulo. Perfeito para casais.",
    category: "event",
    domain: "events_exhibitions",
    city: "São Paulo",
    location: "Teatro Comedians",
    tags: ["comédia", "stand-up", "casal"],
    source: "Agenda SP",
    quality_score: 80,
    price: 60,
    start_time: new Date(Date.now() + 86400000 * 2).toISOString(),
    latitude: -23.5633,
    longitude: -46.6544,
    profile_signals: [],
  },
  {
    id: "evt-4",
    title: "Cinema ao Ar Livre: Clássicos",
    description: "Sessão especial de cinema ao ar livre com filmes clássicos e pipoca gourmet.",
    category: "event",
    domain: "events_exhibitions",
    city: "São Paulo",
    location: "CCSP",
    tags: ["cinema", "clássico", "ao ar livre"],
    source: "Agenda SP",
    quality_score: 78,
    start_time: new Date(Date.now() + 86400000 * 7).toISOString(),
    latitude: -23.5728,
    longitude: -46.6421,
    profile_signals: [],
  },
  {
    id: "evt-5",
    title: "Feira Gastronômica Noturna",
    description: "Os melhores food trucks e chefs da cidade reunidos em uma noite especial de gastronomia.",
    category: "gastro_event",
    domain: "events_exhibitions",
    city: "São Paulo",
    location: "Largo da Batata",
    tags: ["gastronomia", "food truck", "feira"],
    source: "Catraca Livre",
    editorial_source: "Catraca Livre",
    quality_score: 84,
    start_time: new Date(Date.now() + 86400000 * 4).toISOString(),
    latitude: -23.5669,
    longitude: -46.6915,
    profile_signals: [],
  },
  {
    id: "evt-6",
    title: "Orquestra Sinfônica na Sala São Paulo",
    description: "Concerto da Orquestra Sinfônica do Estado com repertório de Beethoven e Tchaikovsky.",
    category: "event",
    domain: "events_exhibitions",
    city: "São Paulo",
    location: "Sala São Paulo",
    tags: ["música clássica", "orquestra", "concerto"],
    source: "Agenda SP",
    quality_score: 86,
    price: 120,
    start_time: new Date(Date.now() + 86400000 * 6).toISOString(),
    latitude: -23.5341,
    longitude: -46.6389,
    profile_signals: [],
  },
];

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
    quality_score: 74,
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

  const localEvents = await loadLocalEvents();
  const snapshotEvents = await loadDailySource("events", city);
  const aggregatedLocal = await fetchAllLocalEvents({ limit: 24, gastroOnly: preset === "gastro" });

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
          if (label.includes("ticketmaster")) return 3;
          if (label.includes("fever")) return 2;
          if (label.includes("timeout")) return 2;
          if (label.includes("catraca")) return 2;
          return 0;
        };
        return (b.quality_score || 0) + sourceBoost(b) - ((a.quality_score || 0) + sourceBoost(a));
      })
      .slice(0, Number(size));

    if (merged.length === 0) {
      merged.push(...FALLBACK_EVENTS);
    }

    const localized = await enrichRecommendationImagesAsync(merged.map((item) => localizeRecommendation(item)));
    return jsonWithCache(localized, { revalidate: 900, stale: 300 });
  } catch {
    const fallback = await enrichRecommendationImagesAsync(
      dedupeRecommendations([...snapshotEvents, ...localEvents, ...aggregatedLocal, ...FALLBACK_EVENTS]).map((item) =>
        localizeRecommendation(item)
      )
    );
    return jsonFallback(fallback, { revalidate: 900, fallbackMaxAge: 60 });
  }
}
