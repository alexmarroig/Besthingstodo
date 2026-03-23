import { buildConciergeResponse, buildDateNightPlan, buildFallbackContext, curateRecommendations, refineContext } from "../../features/catalog/curation";
import { API_ENDPOINTS } from "./config";
import { getAccessToken, setAccessToken, setUserId } from "../storage";
import { ConciergeResponse, CoupleSnapshot, DateNightPlan, ExperienceContext, Recommendation } from "@life/shared-types";

const { api: API, concierge: CONCIERGE, dateNight: DATE_NIGHT, onboarding: ONBOARDING } = API_ENDPOINTS;

type RecommendationDomain = "dining_out" | "delivery" | "movies_series" | "events_exhibitions";

function authHeaders(): Record<string, string> {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function mapRecommendation(row: any, city: string): Recommendation {
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
    score: row.score,
    reason: row.reason,
    latitude: row.latitude ?? null,
    longitude: row.longitude ?? null,
    profile_signals: Array.isArray(row.profile_signals) ? row.profile_signals : []
  };
}

export async function registerCoupleDefault(email: string, password: string) {
  const res = await fetch(`${API}/auth/register-couple`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  if (!res.ok) {
    throw new Error("Não foi possível registrar a conta do casal");
  }
  const tokenData = await res.json();
  setAccessToken(tokenData.access_token);

  const me = await fetch(`${API}/auth/me`, { headers: { ...authHeaders() } });
  if (me.ok) {
    const user = await me.json();
    setUserId(user.id);
  }

  return tokenData;
}

export async function login(email: string, password: string) {
  const res = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  if (!res.ok) {
    throw new Error("Email ou senha inválidos");
  }
  const tokenData = await res.json();
  setAccessToken(tokenData.access_token);

  const me = await fetch(`${API}/auth/me`, { headers: { ...authHeaders() } });
  if (me.ok) {
    const user = await me.json();
    setUserId(user.id);
  }

  return tokenData;
}

export async function fetchCoupleMe(): Promise<CoupleSnapshot | null> {
  const token = getAccessToken();
  if (!token) return null;

  const res = await fetch(`${API}/couple/me`, {
    cache: "no-store",
    headers: { ...authHeaders() }
  }).catch(() => null);

  if (!res || !res.ok) return null;
  return res.json();
}

export async function patchCoupleProfile(payload: Record<string, any>) {
  const res = await fetch(`${API}/couple/me`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error("Não foi possível salvar os ajustes do casal");
  return res.json();
}

export async function patchCoupleStep(stepKey: string, data: Record<string, any>) {
  const res = await fetch(`${API}/onboarding/couple/step`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ step_key: stepKey, data })
  });
  if (!res.ok) throw new Error("Não foi possível salvar a etapa");
  return res.json();
}

export async function fetchUserContext(city = "Sao Paulo"): Promise<ExperienceContext> {
  const token = getAccessToken();
  if (!token) return buildFallbackContext(city);

  try {
    const res = await fetch(`${API}/context`, {
      cache: "no-store",
      headers: { ...authHeaders() }
    });
    if (!res.ok) throw new Error("context unavailable");
    const data = await res.json();
    return refineContext(data, city);
  } catch {
    return buildFallbackContext(city);
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
  const params = new URLSearchParams({ city, limit: "24" });
  if (domain) params.set("domain", domain);
  if (weather) params.set("weather", weather);

  const localContext = context || refineContext({ city, weather: weather || "unknown" }, city);

  try {
    const res = await fetch(`${API}/recommendations?${params.toString()}`, {
      cache: "no-store",
      headers: { ...authHeaders(), "x-life-user-id": userId }
    });
    if (!res.ok) return [];
    const rows = await res.json();
    if (!Array.isArray(rows) || rows.length === 0) return [];

    return curateRecommendations(rows.map((row: any) => mapRecommendation(row, city)), {
      context: localContext,
      couple: couple || undefined,
      limit: 24
    });
  } catch {
    return [];
  }
}

export async function sendFeedback(
  userId: string,
  experienceId: string,
  feedbackType: "like" | "dislike" | "save" | "skip",
  extra?: { decision?: string; post_experience_rating?: number; reason_tags?: string[]; context?: Record<string, any> }
) {
  const decisionMap: Record<string, string> = {
    like: "accepted",
    dislike: "rejected",
    save: "saved",
    skip: "skip"
  };
  await fetch(`${API}/feedback`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({
      user_id: userId,
      experience_id: experienceId,
      feedback_type: feedbackType,
      decision: extra?.decision || decisionMap[feedbackType] || "skip",
      post_experience_rating: extra?.post_experience_rating,
      reason_tags: extra?.reason_tags || [],
      context: extra?.context || {}
    })
  }).catch(() => {});
}

export async function generateDateNightPlan(
  userId: string,
  location = "Sao Paulo",
  options?: { recommendations?: Recommendation[]; context?: ExperienceContext; couple?: CoupleSnapshot | null }
): Promise<DateNightPlan | null> {
  if (options?.recommendations?.length) {
    return buildDateNightPlan({
      recommendations: options.recommendations,
      context: options.context || buildFallbackContext(location),
      couple: options.couple
    });
  }

  try {
    const res = await fetch(`${DATE_NIGHT}/date-night-plan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, date: new Date().toISOString().slice(0, 10), location, time: "evening" })
    });
    if (!res.ok) throw new Error("date night api unavailable");
    const data = await res.json();
    return data;
  } catch {
    return null;
  }
}

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
  try {
    const res = await fetch(`${CONCIERGE}/concierge/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, message })
    });
    if (!res.ok) throw new Error("concierge api unavailable");
    const data = await res.json();
    return buildConciergeResponse({
      message,
      recommendations: options.recommendations,
      context: options.context,
      couple: options.couple,
      memory: options.memory,
      apiSuggestions: data.suggestions || []
    });
  } catch {
    return buildConciergeResponse({
      message,
      recommendations: options.recommendations,
      context: options.context,
      couple: options.couple,
      memory: options.memory,
      apiSuggestions: []
    });
  }
}

export async function fetchCulturalDNA(userId: string) {
  try {
    const res = await fetch(`${ONBOARDING}/onboarding/dna/${userId}`, { cache: "no-store" });
    if (!res.ok) throw new Error("dna api unavailable");
    return res.json();
  } catch {
    return null;
  }
}
