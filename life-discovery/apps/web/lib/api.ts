import { DateNightPlan, Recommendation } from "./types";

const RECO = process.env.NEXT_PUBLIC_RECO_URL || "http://localhost:8002";
const CONCIERGE = process.env.NEXT_PUBLIC_CONCIERGE_URL || "http://localhost:8007";
const DATE_NIGHT = process.env.NEXT_PUBLIC_DATE_NIGHT_URL || "http://localhost:8009";
const ONBOARDING = process.env.NEXT_PUBLIC_ONBOARDING_URL || "http://localhost:8008";
const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function fetchRecommendations(userId: string, city = "Sao Paulo"): Promise<Recommendation[]> {
  try {
    const res = await fetch(`${RECO}/recommendations?user_id=${userId}&city=${encodeURIComponent(city)}&limit=24`, {
      cache: "no-store"
    });
    if (!res.ok) return [];
    const rows = await res.json();

    return rows
      .map((r: any, i: number) => ({
        id: String(r.id || `${r.title || "item"}-${i}`),
        title: r.title || "Sem título",
        description: r.description || r.reason || "",
        category: r.category || "event",
        city: r.city || city,
        location: r.location || r.venue || city,
        start_time: r.start_time || r.date || null,
        price: r.price ?? null,
        tags: Array.isArray(r.tags) ? r.tags : [],
        source: r.source || "unknown",
        url: r.url || r.source_url || null,
        score: r.score,
        reason: r.reason,
        latitude: r.latitude ?? null,
        longitude: r.longitude ?? null
      }))
      .filter((x: Recommendation) => !!x.title && !!x.source && x.source !== "mock");
  } catch {
    return [];
  }
}

export async function sendFeedback(userId: string, experienceId: string, feedbackType: "like" | "dislike" | "save" | "skip") {
  await fetch(`${API}/feedback`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer demo" },
    body: JSON.stringify({ user_id: userId, experience_id: experienceId, feedback_type: feedbackType })
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