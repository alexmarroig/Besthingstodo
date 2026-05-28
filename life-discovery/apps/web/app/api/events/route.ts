import { fetchExternalJson, jsonFallback, jsonWithCache } from "../_lib/external-api";

const FALLBACK_EVENTS = [
  { id: "evt-1", title: "Festival de Jazz no Parque", description: "Noite de jazz ao ar livre com artistas locais e internacionais no Parque Ibirapuera.", category: "event", domain: "events_exhibitions", city: "São Paulo", location: "Parque Ibirapuera", image_url: null, tags: ["jazz", "música", "ao ar livre"], source: "Ticketmaster", url: null, score: null, price: 0, start_time: new Date(Date.now() + 86400000 * 3).toISOString(), personalization_label: null, related_favorite: null, quality_score: null, latitude: -23.5874, longitude: -46.6576, profile_signals: [] },
  { id: "evt-2", title: "Exposição Imersiva: Van Gogh", description: "Mergulhe nas obras de Van Gogh com projeções 360° e trilha sonora envolvente.", category: "event", domain: "events_exhibitions", city: "São Paulo", location: "MIS Experience", image_url: null, tags: ["arte", "exposição", "imersivo"], source: "Ticketmaster", url: null, score: null, price: 80, start_time: new Date(Date.now() + 86400000 * 5).toISOString(), personalization_label: null, related_favorite: null, quality_score: null, latitude: -23.5710, longitude: -46.6895, profile_signals: [] },
  { id: "evt-3", title: "Stand-Up Comedy: Humor a Dois", description: "Noite de stand-up com os melhores comediantes de São Paulo. Perfeito para casais.", category: "event", domain: "events_exhibitions", city: "São Paulo", location: "Teatro Comedians", image_url: null, tags: ["comédia", "stand-up", "casal"], source: "Ticketmaster", url: null, score: null, price: 60, start_time: new Date(Date.now() + 86400000 * 2).toISOString(), personalization_label: null, related_favorite: null, quality_score: null, latitude: -23.5633, longitude: -46.6544, profile_signals: [] },
  { id: "evt-4", title: "Cinema ao Ar Livre: Clássicos", description: "Sessão especial de cinema ao ar livre com filmes clássicos e pipoca gourmet.", category: "event", domain: "events_exhibitions", city: "São Paulo", location: "CCSP", image_url: null, tags: ["cinema", "clássico", "ao ar livre"], source: "Ticketmaster", url: null, score: null, price: 0, start_time: new Date(Date.now() + 86400000 * 7).toISOString(), personalization_label: null, related_favorite: null, quality_score: null, latitude: -23.5728, longitude: -46.6421, profile_signals: [] },
  { id: "evt-5", title: "Feira Gastronômica Noturna", description: "Os melhores food trucks e chefs da cidade reunidos em uma noite especial de gastronomia.", category: "event", domain: "events_exhibitions", city: "São Paulo", location: "Largo da Batata", image_url: null, tags: ["gastronomia", "food truck", "feira"], source: "Ticketmaster", url: null, score: null, price: 0, start_time: new Date(Date.now() + 86400000 * 4).toISOString(), personalization_label: null, related_favorite: null, quality_score: null, latitude: -23.5669, longitude: -46.6915, profile_signals: [] },
  { id: "evt-6", title: "Orquestra Sinfônica na Sala São Paulo", description: "Concerto da Orquestra Sinfônica do Estado com repertório de Beethoven e Tchaikovsky.", category: "event", domain: "events_exhibitions", city: "São Paulo", location: "Sala São Paulo", image_url: null, tags: ["música clássica", "orquestra", "concerto"], source: "Ticketmaster", url: null, score: null, price: 120, start_time: new Date(Date.now() + 86400000 * 6).toISOString(), personalization_label: null, related_favorite: null, quality_score: null, latitude: -23.5341, longitude: -46.6389, profile_signals: [] },
];

function mapEvent(event: any) {
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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const city = searchParams.get("city") || "Sao Paulo";
  const keyword = searchParams.get("keyword") || "";
  const size = searchParams.get("size") || "12";
  const apiKey = process.env.TICKETMASTER_API_KEY;

  if (!apiKey) {
    return jsonWithCache(FALLBACK_EVENTS, { revalidate: 900, stale: 300 });
  }

  try {
    const params = new URLSearchParams({
      apikey: apiKey,
      city,
      size,
      sort: "date,asc",
      locale: "*",
    });
    if (keyword) params.set("keyword", keyword);

    const now = new Date();
    params.set("startDateTime", now.toISOString().replace(/\.\d{3}Z$/, "Z"));

    const url = `https://app.ticketmaster.com/discovery/v2/events.json?${params.toString()}`;
    const data = await fetchExternalJson<any>(url, { revalidate: 900 });
    const events = data._embedded?.events || [];
    const results = events.map(mapEvent);

    return jsonWithCache(results, { revalidate: 900, stale: 300 });
  } catch {
    return jsonFallback(FALLBACK_EVENTS, { revalidate: 900, fallbackMaxAge: 60 });
  }
}
