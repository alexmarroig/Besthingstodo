import { Platform } from "react-native";
import { ConciergeResponse, CoupleSnapshot, DateNightPlan, ExperienceContext, Recommendation } from "@life/shared-types";

import { BRAND, DEFAULT_CITY, buildFallbackConciergeResponse, buildFallbackContext, buildFallbackDatePlan, getFallbackRecommendations } from "./curation";
import { defaultOnboardingDraft } from "./onboarding";
import { getOnboardingDraft } from "./storage";

export type RecommendationFeed = {
  items: Recommendation[];
  isFallback: boolean;
};

function defaultBaseUrl(port: number) {
  if (Platform.OS === "android") {
    return `http://10.0.2.2:${port}`;
  }
  return `http://127.0.0.1:${port}`;
}

const DEV_MODE = process.env.NODE_ENV !== "production";
const API_BASE = process.env.EXPO_PUBLIC_API_URL?.trim() || (DEV_MODE ? defaultBaseUrl(8000) : "");
const CONCIERGE_BASE = process.env.EXPO_PUBLIC_CONCIERGE_URL?.trim() || (DEV_MODE ? defaultBaseUrl(8007) : "");
const DATE_NIGHT_BASE = process.env.EXPO_PUBLIC_DATE_NIGHT_URL?.trim() || (DEV_MODE ? defaultBaseUrl(8009) : "");

function missingBaseUrlMessage(envName: string) {
  return `${envName} nao configurada. Em build standalone, aponte para uma URL publica para liberar a camada online.`;
}

function authHeaders(token?: string) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function mapRecommendation(row: any, city: string): Recommendation {
  return {
    id: String(row.id || row.slug || row.title || Math.random()),
    title: row.title || "Sem titulo",
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
    couple_fit_reason: row.couple_fit_reason || row.reason || null,
    avoid_reason: row.avoid_reason || null,
    image_url: row.image_url || null,
    personalization_label: row.personalization_label || null,
    related_favorite: row.related_favorite || null,
    image_fallback_key: row.image_fallback_key || null,
    quality_score: row.quality_score ?? row.score ?? null,
    availability_kind: row.availability_kind || null,
    editorial_source: row.editorial_source || null,
    booking_url: row.booking_url || null,
    price_band: row.price_band || null,
    start_time: row.start_time || null,
    price: row.price ?? null,
    tags: Array.isArray(row.tags) ? row.tags : [],
    source: row.source || "api",
    url: row.url || null,
    latitude: row.latitude ?? null,
    longitude: row.longitude ?? null,
    profile_signals: Array.isArray(row.profile_signals) ? row.profile_signals : [],
    score: row.score,
    reason: row.reason
  };
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export async function login(email: string, password: string) {
  if (!API_BASE) {
    throw new Error(missingBaseUrlMessage("EXPO_PUBLIC_API_URL"));
  }

  const tokenData = await fetchJson<{ access_token: string }>(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });

  const me = await fetchJson<{ id: string }>(`${API_BASE}/auth/me`, {
    headers: { ...authHeaders(tokenData.access_token) }
  });

  return { token: tokenData.access_token, userId: me.id };
}

export async function registerCoupleDefault(email: string, password: string) {
  if (!API_BASE) {
    throw new Error(missingBaseUrlMessage("EXPO_PUBLIC_API_URL"));
  }

  const tokenData = await fetchJson<{ access_token: string }>(`${API_BASE}/auth/register-couple`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });

  const me = await fetchJson<{ id: string }>(`${API_BASE}/auth/me`, {
    headers: { ...authHeaders(tokenData.access_token) }
  });

  return { token: tokenData.access_token, userId: me.id };
}

export async function requestAccountRecovery(email: string): Promise<{ delivered: boolean; message: string }> {
  if (!API_BASE) {
    return {
      delivered: false,
      message: missingBaseUrlMessage("EXPO_PUBLIC_API_URL")
    };
  }

  const candidates = [
    `${API_BASE}/auth/recover-account`,
    `${API_BASE}/auth/forgot-password`,
    `${API_BASE}/auth/password/reset/request`
  ];

  for (const url of candidates) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });

      if (response.ok) {
        return {
          delivered: true,
          message: "Pedido de recuperacao iniciado. Se a stack estiver completa, voce deve receber as proximas instrucoes no email."
        };
      }
    } catch {
      continue;
    }
  }

  return {
    delivered: false,
    message: "Esta stack ainda nao expoe um endpoint real de recuperacao. O fluxo mobile deixa isso claro para evitar falsa confirmacao."
  };
}

export async function fetchCoupleMe(token: string): Promise<CoupleSnapshot | null> {
  if (!token || !API_BASE) return null;
  try {
    return await fetchJson<CoupleSnapshot>(`${API_BASE}/couple/me`, {
      headers: { ...authHeaders(token) }
    });
  } catch {
    return null;
  }
}

export async function patchCoupleProfile(token: string, payload: Record<string, unknown>) {
  if (!token) throw new Error("Missing auth token");
  if (!API_BASE) throw new Error(missingBaseUrlMessage("EXPO_PUBLIC_API_URL"));
  return fetchJson<CoupleSnapshot>(`${API_BASE}/couple/me`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(token)
    },
    body: JSON.stringify(payload)
  });
}

export async function submitOnboardingAnswers(
  token: string,
  answers: Array<{ category: string; value: string; weight?: number }>
) {
  if (!token || !API_BASE) return { saved_answers: 0 };

  return fetchJson<{ saved_answers: number }>(`${API_BASE}/onboarding/start`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(token)
    },
    body: JSON.stringify({ answers })
  });
}

export async function sendFeedback(
  token: string,
  payload: {
    userId: string;
    experienceId: string;
    feedbackType: "like" | "dislike" | "save" | "skip";
    decision?: string;
    reasonTags?: string[];
    context?: Record<string, unknown>;
  }
) {
  if (!token || !API_BASE) return;

  await fetch(`${API_BASE}/feedback`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(token)
    },
    body: JSON.stringify({
      user_id: payload.userId,
      experience_id: payload.experienceId,
      feedback_type: payload.feedbackType,
      decision: payload.decision || payload.feedbackType,
      reason_tags: payload.reasonTags || [],
      context: payload.context || {}
    })
  }).catch(() => undefined);
}

export async function fetchContext(token: string, city = DEFAULT_CITY): Promise<ExperienceContext> {
  if (!token || !API_BASE) {
    return buildFallbackContext(city);
  }

  try {
    const raw = await fetchJson<any>(`${API_BASE}/context`, {
      headers: { ...authHeaders(token) }
    });

    const weather = String(raw?.weather || "unknown").toLowerCase();
    const rainy = /rain|storm|drizzle/.test(weather);

    return {
      city: raw?.city || city,
      temperature: typeof raw?.temperature === "number" ? raw.temperature : null,
      weather,
      local_time: raw?.local_time || new Date().toISOString(),
      day_of_week: raw?.day_of_week || "today",
      weather_label: rainy ? "chuva por perto" : /clear|sun/.test(weather) ? "ceu aberto" : /cloud|mist|fog/.test(weather) ? "tempo fechado" : "contexto estavel",
      weather_note: rainy
        ? "Hoje vale puxar lugares cobertos, de logistica simples e com cara de refugio."
        : /clear|sun/.test(weather)
          ? "A noite esta boa para estender um pouco mais o passeio."
          : "Melhor combinar conforto com deslocamento simples.",
      time_label: "agora",
      isRainy: rainy,
      isNight: true
    };
  } catch {
    return buildFallbackContext(city);
  }
}

export async function fetchRecommendationsFeed(args: {
  token: string;
  userId: string;
  city?: string;
  domain?: string;
  weather?: string;
}): Promise<RecommendationFeed> {
  const city = args.city || DEFAULT_CITY;
  const localDraft = {
    ...defaultOnboardingDraft,
    ...(await getOnboardingDraft(defaultOnboardingDraft))
  };

  if (!args.token || !API_BASE) {
    return {
      items: getFallbackRecommendations({ domain: args.domain, weather: args.weather, draft: localDraft }),
      isFallback: true
    };
  }

  try {
    const params = new URLSearchParams({ city, limit: "18" });
    if (args.domain) params.set("domain", args.domain);
    if (args.weather) params.set("weather", args.weather);

    const rows = await fetchJson<any[]>(`${API_BASE}/recommendations?${params.toString()}`, {
      headers: {
        ...authHeaders(args.token),
        "x-life-user-id": args.userId
      }
    });

    if (!Array.isArray(rows) || !rows.length) {
      return {
        items: getFallbackRecommendations({ domain: args.domain, weather: args.weather, draft: localDraft }),
        isFallback: true
      };
    }

    return {
      items: rows.map((row) => mapRecommendation(row, city)),
      isFallback: false
    };
  } catch {
    return {
      items: getFallbackRecommendations({ domain: args.domain, weather: args.weather, draft: localDraft }),
      isFallback: true
    };
  }
}

export async function generateDateNightPlan(args: {
  token: string;
  userId: string;
  city?: string;
  recommendations: Recommendation[];
  context?: ExperienceContext;
}): Promise<DateNightPlan | null> {
  const city = args.city || DEFAULT_CITY;

  if (args.token && DATE_NIGHT_BASE) {
    try {
      return await fetchJson<DateNightPlan>(`${DATE_NIGHT_BASE}/date-night-plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: args.userId,
          date: new Date().toISOString().slice(0, 10),
          location: city,
          time: "evening",
          weather: args.context?.weather || "unknown"
        })
      });
    } catch {
      return buildFallbackDatePlan(args.recommendations, args.context);
    }
  }

  return buildFallbackDatePlan(args.recommendations, args.context);
}

export async function askConcierge(args: {
  userId: string;
  city?: string;
  message: string;
  recommendations: Recommendation[];
  context?: ExperienceContext;
}): Promise<ConciergeResponse> {
  if (!CONCIERGE_BASE) {
    return buildFallbackConciergeResponse(args);
  }

  try {
    const raw = await fetchJson<{ suggestions?: Array<{ title?: string; reason?: string }> }>(`${CONCIERGE_BASE}/concierge/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: args.userId,
        message: args.message
      })
    });

    if (!raw.suggestions?.length) {
      return buildFallbackConciergeResponse(args);
    }

    return {
      intro: `Eu puxaria algo assim para hoje em ${args.city || BRAND.name}.`,
      memory: [],
      options: raw.suggestions.slice(0, 3).map((item, index) => ({
        title: item.title || `Sugestao ${index + 1}`,
        summary: `${args.city || DEFAULT_CITY} - selecao concierge`,
        why_it_fits: item.reason || "Combina com o contexto atual e com o perfil do casal.",
        constraints_applied: [],
        weather_note: args.context?.weather_note || "Pensado para o contexto de hoje.",
        steps: ["Abrir a ideia", "Comparar com as outras duas", "Fechar a decisao em menos de um minuto"]
      }))
    };
  } catch {
    return buildFallbackConciergeResponse(args);
  }
}
