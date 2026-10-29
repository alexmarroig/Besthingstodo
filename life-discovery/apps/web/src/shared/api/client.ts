import {
  buildConciergeResponse,
  buildDateNightPlan,
  buildFallbackContext,
  computeCoupleMLInsights,
  curateRecommendations,
  refineContext,
} from "../../features/catalog/curation";
import { API_ENDPOINTS, RECOMMENDATION_POOL_LIMIT } from "./config";
import { attachRecommendationImages } from "../recommendation-images";
import {
  addCustomIngestedItem,
  getCoupleProfile,
  getCustomIngestedItems,
  getFeedbackHistory,
  getUserId,
  notifyMLUpdate,
  upsertSavedItem,
  type FeedbackSignalType,
} from "../storage";
import { ConciergeResponse, CoupleSnapshot, DateNightPlan, ExperienceContext, Recommendation } from "@life/shared-types";

type RecommendationDomain = "dining_out" | "delivery" | "movies_series" | "events_exhibitions";
type CulturalDNAResponse = {
  user_id: string;
  cultural_dna: Record<string, string | number | string[]> | null;
};

async function fetchJsonSafe<T>(url: string, timeoutMs = 6500, init?: RequestInit): Promise<T | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...init,
      signal: controller.signal,
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function mapToRecommendation(row: any, city: string): Recommendation {
  if (!row || typeof row !== "object") {
    return {
      id: crypto.randomUUID(),
      title: "Experiência em São Paulo",
      description: "",
      category: "event",
      domain: "events_exhibitions",
      city,
      location: city,
      tags: [],
      source: "api",
    };
  }
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
    await fetchJsonSafe("/api/couple/profile", 3500, {
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
    const data = await fetchJsonSafe<any>(`${API_ENDPOINTS.weather}?${params.toString()}`, 4000);
    if (!data) throw new Error("weather unavailable");
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

// --- Recommendations (from free APIs + resilient local snapshots) ---

export async function fetchTrendingMovies(): Promise<Recommendation[]> {
  const data = await fetchJsonSafe<any[]>(`${API_ENDPOINTS.tmdb}?type=trending`);
  return (data || []).map((row: any) => mapToRecommendation(row, ""));
}

export async function fetchMoviesByGenre(genre: string): Promise<Recommendation[]> {
  const data = await fetchJsonSafe<any[]>(
    `${API_ENDPOINTS.tmdb}?type=discover&genre=${encodeURIComponent(genre)}`
  );
  return (data || []).map((row: any) => mapToRecommendation(row, ""));
}

export async function fetchEvents(city = "Sao Paulo", preset?: string): Promise<Recommendation[]> {
  const params = new URLSearchParams({ city });
  if (preset) params.set("preset", preset);
  const data = await fetchJsonSafe<any[]>(`${API_ENDPOINTS.events}?${params.toString()}`);
  return (data || []).map((row: any) => mapToRecommendation(row, city));
}

export async function fetchLocalEvents(city = "Sao Paulo"): Promise<Recommendation[]> {
  const data = await fetchJsonSafe<any[]>(
    `${API_ENDPOINTS.eventsLocal}?city=${encodeURIComponent(city)}&gastro=true`
  );
  return (data || []).map((row: any) => mapToRecommendation(row, city));
}

export async function fetchGastroEditorial(topic = "all"): Promise<Recommendation[]> {
  const data = await fetchJsonSafe<any[]>(
    `${API_ENDPOINTS.gastroEditorial}?topic=${encodeURIComponent(topic)}`
  );
  return (data || []).map((row: any) => mapToRecommendation(row, "São Paulo"));
}

export async function fetchCinemaNews(): Promise<Recommendation[]> {
  const data = await fetchJsonSafe<any[]>(API_ENDPOINTS.cinemaNews);
  return (data || []).map((row: any) => mapToRecommendation(row, ""));
}

export async function fetchNowPlayingMovies(): Promise<Recommendation[]> {
  const data = await fetchJsonSafe<any[]>(`${API_ENDPOINTS.tmdb}?type=now_playing`);
  return (data || []).map((row: any) => mapToRecommendation(row, ""));
}

export async function fetchDeliveryNearby(city = "Sao Paulo"): Promise<Recommendation[]> {
  const data = await fetchJsonSafe<any[]>(
    `${API_ENDPOINTS.deliveryNearby}?city=${encodeURIComponent(city)}`
  );
  return (data || []).map((row: any) => mapToRecommendation({ ...row, domain: "delivery" }, city));
}

export async function fetchPlaces(
  city = "Sao Paulo",
  categories = "catering.restaurant",
  options?: { intent?: string; neighborhood?: string }
): Promise<Recommendation[]> {
  const params = new URLSearchParams({ city, categories });
  if (options?.intent) params.set("intent", options.intent);
  if (options?.neighborhood) params.set("neighborhood", options.neighborhood);
  const data = await fetchJsonSafe<any[]>(`${API_ENDPOINTS.places}?${params.toString()}`);
  return (data || []).map((row: any) => mapToRecommendation(row, city));
}

export async function fetchMealSuggestions(type = "random", params?: Record<string, string>): Promise<any[]> {
  const search = new URLSearchParams({ type, ...params });
  const data = await fetchJsonSafe<any[]>(`${API_ENDPOINTS.meals}?${search.toString()}`);
  return data || [];
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

    const settled = await Promise.allSettled(fetchers);
    const apiItems = settled.flatMap((result) => (result.status === "fulfilled" ? result.value : []));
    const customItems = getCustomIngestedItems().filter(
      (item) => !domain || item.domain === domain
    );

    return attachRecommendationImages([...customItems, ...apiItems]);
  } catch {
    return attachRecommendationImages(getCustomIngestedItems());
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

// --- Smart URL & Place Ingestion ---

export async function ingestExternalExperience(
  query: string,
  city = "São Paulo"
): Promise<{ item?: Recommendation; error?: string }> {
  try {
    const res = await fetch("/api/ingest-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, city }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.item) {
      return { error: data?.error || "Não foi possível capturar este link ou lugar." };
    }
    const item = mapToRecommendation(data.item, city);
    addCustomIngestedItem(item);
    upsertSavedItem(item);
    await sendFeedback(getUserId(), item.id, "favorite", {
      title: item.title,
      tags: item.tags,
      domain: item.domain,
      category: item.category,
      neighborhood: item.neighborhood || undefined,
      location: item.location,
    });
    return { item };
  } catch {
    return { error: "Falha de conexão ao capturar informações externas." };
  }
}

// --- Continual Learning Feedback ---

export async function sendFeedback(
  userId: string,
  experienceId: string,
  feedbackType: FeedbackSignalType,
  extra?: {
    decision?: string;
    post_experience_rating?: number;
    reason_tags?: string[];
    context?: Record<string, any>;
    title?: string;
    tags?: string[];
    domain?: string;
    category?: string;
    neighborhood?: string;
    location?: string;
    price?: number | null;
    indoor_outdoor?: string | null;
    dwell_ms?: number;
  }
) {
  try {
    const key = "life_feedback";
    const existing = JSON.parse(localStorage.getItem(key) || "[]");
    const now = Date.now();

    // Prevent duplicate view events within 45 seconds for the same experience
    if (feedbackType === "view") {
      const recentView = existing.find(
        (entry: any) =>
          entry.experience_id === experienceId &&
          entry.feedback_type === "view" &&
          now - new Date(entry.timestamp || 0).getTime() < 45_000
      );
      if (recentView) return;
    }

    existing.push({
      user_id: userId,
      experience_id: experienceId,
      feedback_type: feedbackType,
      timestamp: new Date(now).toISOString(),
      title: extra?.title,
      tags: extra?.tags,
      domain: extra?.domain,
      category: extra?.category,
      neighborhood: extra?.neighborhood,
      location: extra?.location,
      price: extra?.price,
      indoor_outdoor: extra?.indoor_outdoor,
      dwell_ms: extra?.dwell_ms,
      ...extra,
    });
    localStorage.setItem(key, JSON.stringify(existing.slice(-300)));
    notifyMLUpdate({ type: feedbackType, title: extra?.title, id: experienceId });
  } catch {
    // ignore storage quota errors
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

// --- Live Cultural DNA (powered by Continual Learning Engine) ---

export async function fetchCulturalDNA(userId: string): Promise<CulturalDNAResponse> {
  try {
    const couple = getCoupleProfile();
    const feedback = getFeedbackHistory();
    const insights = computeCoupleMLInsights(couple, null, feedback);

    return {
      user_id: userId,
      cultural_dna: {
        estilo_dominante: insights.dominantStyle,
        maturidade_ia: `${insights.confidencePercent}% (${insights.totalSignals} interações analisadas)`,
        afinidades_aprendidas: insights.topLearnedTags.length
          ? insights.topLearnedTags.slice(0, 5)
          : ["trattoria", "cinema autoral", "museus", "café"],
        bairros_de_maior_match: insights.topNeighborhoods,
        taxa_de_exploracao: `${insights.explorationRate}% descoberta vs ${100 - insights.explorationRate}% favoritos`,
        sinais_evitados: insights.avoidedSignals.length
          ? insights.avoidedSignals
          : ["lugares lotados", "balada", "barulho alto"],
      },
    };
  } catch {
    return {
      user_id: userId,
      cultural_dna: {
        estilo_dominante: "Gastronômico & Cultural Intimista",
        maturidade_ia: "85%",
        afinidades_aprendidas: ["gastronomia", "cinema autoral", "museus"],
        bairros_de_maior_match: ["Pinheiros", "Paulista", "Jardins"],
      },
    };
  }
}
