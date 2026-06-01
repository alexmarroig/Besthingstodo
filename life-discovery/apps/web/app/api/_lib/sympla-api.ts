import { mapScrapedEventToRecommendation, type RecommendationPayload } from "./recommendation-mapper";

const SYMPLA_API_BASE = "https://api.sympla.com.br/public/v3";

type SymplaAddress = {
  name?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  lat?: string;
  lon?: string;
};

type SymplaApiEvent = {
  id?: string | number;
  name?: string;
  detail?: string;
  url?: string;
  image?: string;
  start_date?: string;
  end_date?: string;
  published?: number;
  cancelled?: number;
  private_event?: number;
  address?: SymplaAddress;
  category_prim?: { name?: string };
  category_sec?: { name?: string };
};

function stripHtml(value: string) {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function isSaoPauloEvent(event: SymplaApiEvent) {
  const state = (event.address?.state || "").toUpperCase();
  const city = (event.address?.city || "").toLowerCase();
  if (state === "SP") return true;
  return city.includes("sao paulo") || city.includes("são paulo");
}

function mapSymplaApiEvent(event: SymplaApiEvent): RecommendationPayload | null {
  const title = (event.name || "").trim();
  if (title.length < 6) return null;
  if (event.cancelled === 1 || event.published === 0) return null;

  const address = event.address || {};
  const url =
    event.url ||
    (event.id ? `https://www.sympla.com.br/evento/${event.id}` : null);
  if (!url) return null;

  const tags = [event.category_prim?.name, event.category_sec?.name, "sympla", "evento"]
    .filter(Boolean)
    .map((tag) => String(tag).toLowerCase());

  return mapScrapedEventToRecommendation({
    title,
    description: stripHtml(event.detail || `Evento Sympla em ${address.city || "São Paulo"} — ${title}`),
    url,
    source: "Sympla",
    venue: address.name || address.neighborhood || "São Paulo",
    city: address.city || "São Paulo",
    date: event.start_date || event.end_date || null,
    price: null,
    category: "event",
    tags,
    image_url: event.image || null,
    quality_score: 88,
    content_tier: "curated",
  });
}

export async function fetchSymplaApiEvents(limit = 20): Promise<RecommendationPayload[]> {
  const token = process.env.SYMPLA_API_TOKEN?.trim();
  if (!token) return [];

  const params = new URLSearchParams({
    page: "1",
    page_size: String(Math.min(limit, 50)),
    field_sort: "start_date",
    sort: "ASC",
  });

  const city = process.env.SYMPLA_CITY?.trim();
  const state = process.env.SYMPLA_STATE?.trim() || "SP";
  if (city) params.set("city", city);
  if (state) params.set("state", state);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(`${SYMPLA_API_BASE}/events?${params.toString()}`, {
      headers: {
        s_token: token,
        Accept: "application/json",
      },
      signal: controller.signal,
      next: { revalidate: 900 },
    });

    if (!res.ok) return [];

    const payload = await res.json();
    const rows = (payload.data || []) as SymplaApiEvent[];

    return rows
      .filter((event) => event.private_event !== 1)
      .filter((event) => !city && !state ? true : isSaoPauloEvent(event))
      .map(mapSymplaApiEvent)
      .filter(Boolean) as RecommendationPayload[];
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}
