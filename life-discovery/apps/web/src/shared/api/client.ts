import { buildConciergeResponse, buildDateNightPlan, buildFallbackContext, curateRecommendations, refineContext } from "../../features/catalog/curation";
import { API_ENDPOINTS, RECOMMENDATION_POOL_LIMIT } from "./config";
import { getCoupleProfile, getFeedbackHistory, getUserId } from "../storage";
import { ConciergeResponse, CoupleSnapshot, DateNightPlan, ExperienceContext, Recommendation } from "@life/shared-types";

type RecommendationDomain = "dining_out" | "delivery" | "movies_series" | "events_exhibitions";
type CulturalDNAResponse = {
  user_id: string;
  cultural_dna: Record<string, string | number | string[]> | null;
};

function mapToRecommendation(row: any, city: string): Recommendation {
  return {
    id: String(row.id || row.title || crypto.randomUUID()),
    title: row.title || "Sem título",
    description: row.description || row.reason || "",
    category: row.category || "event",
    domain: row.domain || "events_exhibitions",
    content_tier: row.content_tier || null,
    city: row.city || city,
    location: row.location || city,
    neighborhood: row.neighborhood || null,
    distance_label: row.distance_label || null,
    indoor_outdoor: row.indoor_outdoor || null,
    weather_fit: row.weather_fit || null,
    couple_fit_reason: row.couple_fit_reason || null,
    avoid_reason: row.avoid_reason || null,
    image_url: row.image_url || null,
    personalization_label: row.personalization_label || null,
    related_favorite: row.related_favorite || null,
    image_fallback_key: row.image_fallback_key || null,
    quality_score: row.quality_score ?? row.score ?? null,
    start_time: row.start_time || null,
    price: row.price ?? null,
    tags: Array.isArray(row.tags) ? row.tags : [],
    source: row.source || "api",
    url: row.url || null,
    booking_url: row.booking_url || null,
    editorial_source: row.editorial_source || null,
    availability_kind: row.availability_kind || null,
    rating: row.rating ?? null,
    review_snippet: row.review_snippet || null,
    price_band: row.price_band || null,
    score: row.score,
    reason: row.reason,
    latitude: row.latitude ?? null,
    longitude: row.longitude ?? null,
    profile_signals: Array.isArray(row.profile_signals) ? row.profile_signals : [],
  };
}

// --- Couple Profile (localStorage-based) ---

export async function fetchCoupleMe(): Promise<CoupleSnapshot | null> {
  try {
    const profile = getCoupleProfile();
    return profile || null;
  } catch {
    return null;
  }
}

export async function patchCoupleProfile(payload: Record<string, any>) {
  const current = getCoupleProfile();
  const { buildCoupleProfileFromForm } = await import("../couple-profile-builder");
  const { setCoupleProfile } = await import("../storage");
  const updated = buildCoupleProfileFromForm(payload as Partial<import("@life/shared-types").CoupleSnapshot>, current);
  setCoupleProfile(updated);

  try {
    const userId = updated.user_id || getUserId();
    await fetch("/api/couple/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profile: updated, user_id: userId }),
    });
  } catch {
    // Supabase sync is optional; local profile remains source of truth offline.
  }

  return updated;
}

export async function patchCoupleStep(stepKey: string, data: Record<string, any>) {
  return patchCoupleProfile({ [stepKey]: data });
}

// --- Weather / Context ---

export async function fetchUserContext(couple?: CoupleSnapshot | null): Promise<ExperienceContext> {
  const profile = couple || getCoupleProfile();
  const city = profile?.city || profile?.profile?.couple_profile_json?.location?.city || "Sao Paulo";
  const neighborhood =
    profile?.neighborhood || profile?.profile?.couple_profile_json?.location?.neighborhood || null;

  try {
    const params = new URLSearchParams({ city: String(city) });
    const res = await fetch(`${API_ENDPOINTS.weather}?${params.toString()}`);
    if (!res.ok) throw new Error("weather unavailable");
    const data = await res.json();
    return refineContext(
      {
        city,
        neighborhood,
        weather: data.weather || "clouds",
        weather_label: data.weather_label || "tempo estável",
        weather_note: data.weather_note || "",
        isRainy: data.isRainy || false,
        isHot: data.isHot || false,
        isCold: data.isCold || false,
        temperature: data.temperature,
        feels_like: data.feels_like,
        humidity: data.humidity,
        wind_speed: data.wind_speed,
        condition: data.condition,
        icon_url: data.icon_url,
      },
      city
    );
  } catch {
    return refineContext({ city, neighborhood }, city);
  }
}

// --- Recommendations (from free APIs) ---

export async function fetchTrendingMovies(): Promise<Recommendation[]> {
  try {
    const res = await fetch(`${API_ENDPOINTS.tmdb}?type=trending`);
    if (!res.ok) return [];
    const data = await res.json();
    return (data || []).map((row: any) => mapToRecommendation(row, ""));
  } catch {
    return [];
  }
}

export async function fetchMoviesByGenre(genre: string): Promise<Recommendation[]> {
  try {
    const res = await fetch(`${API_ENDPOINTS.tmdb}?type=discover&genre=${encodeURIComponent(genre)}`);
    if (!res.ok) return [];
    const data = await res.json();
    return (data || []).map((row: any) => mapToRecommendation(row, ""));
  } catch {
    return [];
  }
}

export async function fetchEvents(city = "Sao Paulo", preset?: string): Promise<Recommendation[]> {
  try {
    const params = new URLSearchParams({ city });
    if (preset) params.set("preset", preset);
    const res = await fetch(`${API_ENDPOINTS.events}?${params.toString()}`);
    if (!res.ok) return [];
    const data = await res.json();
    return (data || []).map((row: any) => mapToRecommendation(row, city));
  } catch {
    return [];
  }
}

export async function fetchLocalEvents(city = "Sao Paulo"): Promise<Recommendation[]> {
  try {
    const res = await fetch(`${API_ENDPOINTS.eventsLocal}?city=${encodeURIComponent(city)}&gastro=true`);
    if (!res.ok) return [];
    const data = await res.json();
    return (data || []).map((row: any) => mapToRecommendation(row, city));
  } catch {
    return [];
  }
}

export async function fetchGastroEditorial(topic = "all"): Promise<Recommendation[]> {
  try {
    const res = await fetch(`${API_ENDPOINTS.gastroEditorial}?topic=${encodeURIComponent(topic)}`);
    if (!res.ok) return [];
    const data = await res.json();
    return (data || []).map((row: any) => mapToRecommendation(row, "São Paulo"));
  } catch {
    return [];
  }
}

export async function fetchCinemaNews(): Promise<Recommendation[]> {
  try {
    const res = await fetch(API_ENDPOINTS.cinemaNews);
    if (!res.ok) return [];
    const data = await res.json();
    return (data || []).map((row: any) => mapToRecommendation(row, ""));
  } catch {
    return [];
  }
}

export async function fetchNowPlayingMovies(): Promise<Recommendation[]> {
  try {
    const res = await fetch(`${API_ENDPOINTS.tmdb}?type=now_playing`);
    if (!res.ok) return [];
    const data = await res.json();
    return (data || []).map((row: any) => mapToRecommendation(row, ""));
  } catch {
    return [];
  }
}

export async function fetchDeliveryNearby(city = "Sao Paulo"): Promise<Recommendation[]> {
  try {
    const res = await fetch(`${API_ENDPOINTS.deliveryNearby}?city=${encodeURIComponent(city)}`);
    if (!res.ok) return [];
    const data = await res.json();
    return (data || []).map((row: any) => mapToRecommendation({ ...row, domain: "delivery" }, city));
  } catch {
    return [];
  }
}

export async function fetchPlaces(
  city = "Sao Paulo",
  categories = "catering.restaurant",
  options?: { intent?: string; neighborhood?: string }
): Promise<Recommendation[]> {
  try {
    const params = new URLSearchParams({ city, categories });
    if (options?.intent) params.set("intent", options.intent);
    if (options?.neighborhood) params.set("neighborhood", options.neighborhood);
    const res = await fetch(`${API_ENDPOINTS.places}?${params.toString()}`);
    if (!res.ok) return [];
    const data = await res.json();
    return (data || []).map((row: any) => mapToRecommendation(row, city));
  } catch {
    return [];
  }
}

export async function fetchMealSuggestions(type = "random", params?: Record<string, string>): Promise<any[]> {
  try {
    const search = new URLSearchParams({ type, ...params });
    const res = await fetch(`${API_ENDPOINTS.meals}?${search.toString()}`);
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export async function fetchRecommendationSources(
  city = "Sao Paulo",
  domain?: RecommendationDomain
): Promise<Recommendation[]> {
  try {
    const fetchers: Promise<Recommendation[]>[] = [];

    if (!domain || domain === "movies_series") {
      fetchers.push(fetchTrendingMovies(), fetchNowPlayingMovies(), fetchCinemaNews());
    }
    if (!domain || domain === "dining_out") {
      fetchers.push(fetchPlaces(city, "catering.restaurant"), fetchGastroEditorial("all"));
    }
    if (!domain || domain === "events_exhibitions") {
      fetchers.push(fetchEvents(city), fetchLocalEvents(city));
    }
    if (domain === "delivery") {
      fetchers.push(
        fetchDeliveryNearby(city),
        fetchMealSuggestions("random").then((meals) =>
          meals.map((m: any) => mapToRecommendation({ ...m, domain: "delivery" }, city))
        )
      );
    }

    const allResults = await Promise.all(fetchers);
    return allResults.flat();
  } catch {
    return [];
  }
}

export async function fetchRecommendations(
  userId: string,
  city = "Sao Paulo",
  domain?: RecommendationDomain,
  weather?: string,
  couple?: CoupleSnapshot | null,
  context?: ExperienceContext
): Promise<Recommendation[]> {
  const localContext = context || refineContext({ city, weather: weather || "unknown" }, city);

  try {
    const combined = await fetchRecommendationSources(city, domain);
    if (combined.length === 0) return [];

    return curateRecommendations(combined, {
      context: localContext,
      couple: couple || getCoupleProfile(),
      feedback: getFeedbackHistory(),
      limit: RECOMMENDATION_POOL_LIMIT,
    });
  } catch {
    return [];
  }
}

// --- Feedback (localStorage only) ---

export async function sendFeedback(
  userId: string,
  experienceId: string,
  feedbackType: "like" | "dislike" | "save" | "skip",
  extra?: {
    decision?: string;
    post_experience_rating?: number;
    reason_tags?: string[];
    context?: Record<string, any>;
    title?: string;
    tags?: string[];
  }
) {
  try {
    const key = "life_feedback";
    const existing = JSON.parse(localStorage.getItem(key) || "[]");
    existing.push({
      user_id: userId,
      experience_id: experienceId,
      feedback_type: feedbackType,
      timestamp: new Date().toISOString(),
      title: extra?.title,
      tags: extra?.tags,
      ...extra,
    });
    localStorage.setItem(key, JSON.stringify(existing.slice(-200)));
  } catch {
    // ignore
  }
}

// --- Date Night Plan (local curation) ---

export async function generateDateNightPlan(
  userId: string,
  location = "Sao Paulo",
  options?: { recommendations?: Recommendation[]; context?: ExperienceContext; couple?: CoupleSnapshot | null }
): Promise<DateNightPlan | null> {
  const recommendations = options?.recommendations || (await fetchRecommendations(userId, location));
  const context = options?.context || buildFallbackContext(location);

  if (recommendations.length > 0) {
    return buildDateNightPlan({
      recommendations,
      context,
      couple: options?.couple,
    });
  }

  return null;
}

// --- Concierge (local curation) ---

export async function askConcierge(
  userId: string,
  message: string,
  options: {
    recommendations: Recommendation[];
    context: ExperienceContext;
    couple?: CoupleSnapshot | null;
    memory?: string[];
  }
): Promise<ConciergeResponse> {
  return buildConciergeResponse({
    message,
    recommendations: options.recommendations,
    context: options.context,
    couple: options.couple,
    memory: options.memory,
    apiSuggestions: [],
  });
}

// --- Cultural DNA (local mock) ---

export async function fetchCulturalDNA(userId: string): Promise<CulturalDNAResponse> {
  return {
    user_id: userId,
    cultural_dna: {
      cultural_style: "eclético-urbano",
      strengths: "gastronomia, cinema autoral, museus",
      growth_areas: "música ao vivo, teatro",
      match_score: 85,
    },
  };
}
