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
    if (!res.ok) throw new Error("recommendation api unavailable");
    const rows = await res.json();
    return rows.map((r: any, i: number) => ({
      id: `${r.title}-${i}`,
      title: r.title,
      description: r.reason || "",
      category: r.category || "event",
      city,
      location: city,
      tags: [r.category || "experience"],
      source: "ranking-engine",
      score: r.score,
      reason: r.reason
    }));
  } catch {
    return [
      {
        id: "mock-1",
        title: "Exposição imersiva no MIS",
        description: "Combina com interesse por arte simbólica e ambiente contemplativo.",
        category: "exhibition",
        city: "Sao Paulo",
        location: "MIS - Jardim Europa",
        tags: ["museum", "exhibition", "quiet", "cultural"],
        source: "mock",
        reason: "matches your interest in exhibitions",
        score: 0.91,
        latitude: -23.5723,
        longitude: -46.6693
      },
      {
        id: "mock-2",
        title: "Sessão de suspense no Reserva Cultural",
        description: "Alinhado ao gosto por narrativas complexas e suspense psicológico.",
        category: "movie",
        city: "Sao Paulo",
        location: "Reserva Cultural - Paulista",
        tags: ["movie", "thriller", "quiet", "cinema"],
        source: "mock",
        reason: "recommended because it aligns with your interest in psychology and symbolic depth",
        score: 0.89,
        latitude: -23.5572,
        longitude: -46.6621
      },
      {
        id: "mock-3",
        title: "Jantar italiano intimista em Moema",
        description: "Restaurante silencioso e romântico.",
        category: "restaurant",
        city: "Sao Paulo",
        location: "Moema",
        tags: ["restaurant", "romantic", "quiet", "italian"],
        source: "mock",
        reason: "recommended because it fits your preference for quiet, meaningful and romantic environments",
        score: 0.87,
        latitude: -23.6035,
        longitude: -46.6635
      }
    ];
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
    return {
      activity_1: {
        title: "Filme de suspense psicológico no Reserva Cultural",
        type: "movie",
        reason: "combina com preferência por narrativas complexas e ambiente tranquilo"
      },
      activity_2: {
        title: "Jantar italiano silencioso em Moema",
        type: "restaurant",
        reason: "alinhado com preferência por lugares tranquilos e românticos"
      },
      activity_3: {
        title: "Café e caminhada em rua tranquila próxima",
        type: "after-dinner",
        reason: "atividade complementar leve e íntima"
      },
      reasoning: "Plano gerado com base no perfil do casal e no contexto da noite."
    };
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
    return {
      suggestions: [
        {
          title: "Exposição imersiva no MIS",
          reason: "combina com interesse por arte simbólica e ambiente contemplativo"
        },
        {
          title: "Sessão de suspense psicológico",
          reason: "alinhado ao gosto por mistério e filmes intelectuais"
        },
        {
          title: "Jantar japonês intimista",
          reason: "compatível com preferência por restaurantes silenciosos e românticos"
        }
      ]
    };
  }
}

export async function fetchCulturalDNA(userId: string) {
  try {
    const res = await fetch(`${ONBOARDING}/onboarding/dna/${userId}`, { cache: "no-store" });
    if (!res.ok) throw new Error("dna api unavailable");
    return res.json();
  } catch {
    return {
      user_id: userId,
      cultural_dna: {
        intellectual_depth: 0.92,
        symbolic_interest: 0.88,
        psychological_curiosity: 0.9,
        quiet_environment_preference: 0.93,
        romantic_experience_preference: 0.85,
        crowd_tolerance: 0.2,
        museum_interest: 0.87,
        cinema_interest: 0.82,
        exhibition_interest: 0.88,
        restaurant_style_score: 0.86,
        travel_style_score: 0.88
      }
    };
  }
}
