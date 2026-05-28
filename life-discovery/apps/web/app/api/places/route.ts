import { fetchExternalJson, jsonFallback, jsonWithCache } from "../_lib/external-api";

const SP_LAT = -23.5489;
const SP_LNG = -46.6388;

const FALLBACK_PLACES = [
  { id: "place-1", title: "Lellis Trattoria", description: "Trattoria italiana clássica com massas artesanais e ambiente romântico no Itaim Bibi.", category: "restaurant", domain: "dining_out", city: "São Paulo", location: "Itaim Bibi", image_url: null, tags: ["italiana", "massas", "romântico"], source: "Geoapify", url: null, score: 9.2, price: 120, latitude: -23.5845, longitude: -46.6734, neighborhood: "Itaim Bibi", personalization_label: null, related_favorite: null, quality_score: 92, profile_signals: [] },
  { id: "place-2", title: "A Pizza da Mooca", description: "Pizzaria tradicional do bairro da Mooca com receitas de família e massa crocante.", category: "restaurant", domain: "dining_out", city: "São Paulo", location: "Mooca", image_url: null, tags: ["pizza", "italiana", "tradicional"], source: "Geoapify", url: null, score: 8.8, price: 65, latitude: -23.5631, longitude: -46.5988, neighborhood: "Mooca", personalization_label: null, related_favorite: null, quality_score: 88, profile_signals: [] },
  { id: "place-3", title: "Issho Restaurante", description: "Gastronomia japonesa contemporânea com peixes frescos e ambiente minimalista.", category: "restaurant", domain: "dining_out", city: "São Paulo", location: "Vila Olímpia", image_url: null, tags: ["japonesa", "sushi", "contemporâneo"], source: "Geoapify", url: null, score: 9.0, price: 150, latitude: -23.5969, longitude: -46.6856, neighborhood: "Vila Olímpia", personalization_label: null, related_favorite: null, quality_score: 90, profile_signals: [] },
  { id: "place-4", title: "Café Octavio", description: "Cafeteria specialty com grãos selecionados e brunch caprichado na Vila Madalena.", category: "cafe", domain: "dining_out", city: "São Paulo", location: "Vila Madalena", image_url: null, tags: ["café", "brunch", "specialty"], source: "Geoapify", url: null, score: 8.5, price: 45, latitude: -23.5531, longitude: -46.6903, neighborhood: "Vila Madalena", personalization_label: null, related_favorite: null, quality_score: 85, profile_signals: [] },
  { id: "place-5", title: "Braz Elettrica", description: "Pizza napolitana assada em forno a lenha com ingredientes importados e massa leve.", category: "restaurant", domain: "dining_out", city: "São Paulo", location: "Pinheiros", image_url: null, tags: ["pizza", "napolitana", "forno a lenha"], source: "Geoapify", url: null, score: 8.9, price: 80, latitude: -23.5627, longitude: -46.6917, neighborhood: "Pinheiros", personalization_label: null, related_favorite: null, quality_score: 89, profile_signals: [] },
  { id: "place-6", title: "Z Deli Sanduíches", description: "Sanduíches artesanais no estilo deli nova-iorquina com pastrami e picles caseiros.", category: "restaurant", domain: "dining_out", city: "São Paulo", location: "Itaim Bibi", image_url: null, tags: ["sanduíches", "deli", "artesanal"], source: "Geoapify", url: null, score: 8.7, price: 55, latitude: -23.5842, longitude: -46.6731, neighborhood: "Itaim Bibi", personalization_label: null, related_favorite: null, quality_score: 87, profile_signals: [] },
];

function mapPlace(feature: any) {
  const p = feature.properties || {};
  const cat = (p.categories || []).join(",");
  let category = "restaurant";
  if (cat.includes("bar")) category = "bar";
  else if (cat.includes("cafe")) category = "cafe";
  else if (cat.includes("fast_food")) category = "fast_food";

  return {
    id: `place-${p.place_id || crypto.randomUUID()}`,
    title: p.name || p.address_line1 || "Local",
    description: [p.address_line1, p.address_line2].filter(Boolean).join(", "),
    category,
    domain: "dining_out",
    city: p.city || "São Paulo",
    location: p.suburb || p.district || p.city || "",
    neighborhood: p.suburb || p.district || null,
    image_url: null,
    tags: (p.categories || []).map((c: string) => c.split(".").pop()).filter(Boolean),
    source: "Geoapify",
    url: p.website || null,
    score: null,
    price: null,
    latitude: feature.geometry?.coordinates?.[1] ?? null,
    longitude: feature.geometry?.coordinates?.[0] ?? null,
    personalization_label: null,
    related_favorite: null,
    quality_score: null,
    profile_signals: [],
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");
  const radius = searchParams.get("radius") || "5000";
  const categories = searchParams.get("categories") || "catering.restaurant";
  const city = searchParams.get("city") || "Sao Paulo";
  const apiKey = process.env.GEOAPIFY_API_KEY;

  if (!apiKey) {
    return jsonWithCache(FALLBACK_PLACES, { revalidate: 900, stale: 300 });
  }

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

    const url = `https://api.geoapify.com/v2/places?categories=${encodeURIComponent(categories)}&filter=circle:${useLng},${useLat},${radius}&limit=15&apiKey=${apiKey}`;
    const data = await fetchExternalJson<any>(url, { revalidate: 900 });
    const results = (data.features || []).map(mapPlace);

    return jsonWithCache(results, { revalidate: 900, stale: 300 });
  } catch {
    return jsonFallback(FALLBACK_PLACES, { revalidate: 900, fallbackMaxAge: 60 });
  }
}
