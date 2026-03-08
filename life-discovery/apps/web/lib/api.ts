import { DateNightPlan, Recommendation } from "./types";
import { getAccessToken, setAccessToken, setUserId } from "./storage";

const CONCIERGE = process.env.NEXT_PUBLIC_CONCIERGE_URL || "http://localhost:8007";
const DATE_NIGHT = process.env.NEXT_PUBLIC_DATE_NIGHT_URL || "http://localhost:8009";
const ONBOARDING = process.env.NEXT_PUBLIC_ONBOARDING_URL || "http://localhost:8008";
const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function authHeaders(): Record<string, string> {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function registerCoupleDefault(email: string, password: string) {
  const res = await fetch(`${API}/auth/register-couple`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  if (!res.ok) {
    throw new Error("Nao foi possivel registrar conta de casal");
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
    throw new Error("Email ou senha invalidos");
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

export async function fetchCoupleMe() {
  const res = await fetch(`${API}/couple/me`, {
    cache: "no-store",
    headers: { ...authHeaders() }
  });
  if (!res.ok) return null;
  return res.json();
}

export async function patchCoupleStep(stepKey: string, data: Record<string, any>) {
  const res = await fetch(`${API}/onboarding/couple/step`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ step_key: stepKey, data })
  });
  if (!res.ok) throw new Error("Nao foi possivel salvar etapa");
  return res.json();
}

export async function fetchRecommendations(
  userId: string,
  city = "Sao Paulo",
  domain?: "dining_out" | "delivery" | "movies_series" | "events_exhibitions",
  weather?: string
): Promise<Recommendation[]> {
  const params = new URLSearchParams({ city, limit: "24" });
  if (domain) params.set("domain", domain);
  if (weather) params.set("weather", weather);

  try {
    const res = await fetch(`${API}/recommendations?${params.toString()}`, {
      cache: "no-store",
      headers: { ...authHeaders() }
    });
    if (!res.ok) return [];
    const rows = await res.json();
    return rows.map((r: any, i: number) => ({
      id: String(r.id || `${r.title || "item"}-${i}`),
      title: r.title || "Sem titulo",
      description: r.description || r.reason || "",
      category: r.category || "event",
      domain: r.domain || "events_exhibitions",
      city: r.city || city,
      location: r.location || city,
      start_time: r.start_time || null,
      price: r.price ?? null,
      tags: Array.isArray(r.tags) ? r.tags : [],
      source: r.source || "api",
      url: r.url || null,
      score: r.score,
      reason: r.reason,
      latitude: r.latitude ?? null,
      longitude: r.longitude ?? null
    }));
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

export async function generateDateNightPlan(userId: string, location = "Sao Paulo"): Promise<DateNightPlan | null> {
  try {
    const res = await fetch(`${DATE_NIGHT}/date-night-plan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, date: new Date().toISOString().slice(0, 10), location, time: "evening" })
    });
    if (!res.ok) throw new Error("date night api unavailable");
    return res.json();
  } catch {
    return null;
  }
}

export async function askConcierge(userId: string, message: string) {
  try {
    const res = await fetch(`${CONCIERGE}/concierge/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, message })
    });
    if (!res.ok) throw new Error("concierge api unavailable");
    return res.json();
  } catch {
    return { suggestions: [] };
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

