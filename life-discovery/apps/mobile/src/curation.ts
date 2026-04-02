import { getCuratedSaoPauloCatalog } from "@life/catalog";
import { ConciergeResponse, CoupleSnapshot, DateNightPlan, ExperienceContext, Recommendation } from "@life/shared-types";
import type { OnboardingDraft } from "./onboarding";

export const DEFAULT_CITY = "Sao Paulo";

export const BRAND = {
  name: "Roteiro a Dois",
  subtitle: "Sugestoes reais para sair, pedir, assistir e viver melhor a noite em Sao Paulo."
} as const;

export const DEMO_SESSION = {
  email: "alex.c.marroig@gmail.com",
  password: "alexcamila123"
} as const;

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hasAny(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(normalizeText(keyword)));
}

export function buildFallbackContext(city = DEFAULT_CITY): ExperienceContext {
  const now = new Date();
  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      hour: "2-digit",
      hour12: false,
      timeZone: "America/Sao_Paulo"
    }).format(now)
  );

  return {
    city,
    temperature: null,
    weather: "unknown",
    local_time: now.toISOString(),
    day_of_week: new Intl.DateTimeFormat("pt-BR", { weekday: "long", timeZone: "America/Sao_Paulo" }).format(now),
    weather_label: "tempo instavel",
    weather_note: "Sem contexto ao vivo, a versao mobile puxa opcoes confortaveis e com baixa friccao.",
    time_label: hour >= 18 ? "noite" : hour >= 12 ? "fim de tarde" : "manha",
    isRainy: false,
    isNight: hour >= 18
  };
}

function buildCoupleReasonFromCatalog(item: ReturnType<typeof getCuratedSaoPauloCatalog>[number]) {
  const text = normalizeText([item.title, item.description, ...(item.tags || [])].join(" "));
  if (hasAny(text, ["romantic", "intimate", "cozy", "jantar", "trattoria", "cafe"])) {
    return "Tem mais chance de funcionar como encontro de verdade do que como programa generico.";
  }
  if (hasAny(text, ["museum", "museu", "cinema", "exhibition", "livraria", "bookstore"])) {
    return "Entrega repertorio e conversa boa, sem perder leveza.";
  }
  if (item.domain === "delivery") {
    return "Ajuda a manter a noite gostosa mesmo quando a melhor decisao e ficar em casa.";
  }
  return "Entra bem no produto porque reduz atrito e continua parecendo uma escolha intencional.";
}

function mapCatalogToRecommendation(row: ReturnType<typeof getCuratedSaoPauloCatalog>[number]): Recommendation {
  return {
    id: row.slug || `${row.title}-${row.location}`,
    title: row.title,
    description: row.description,
    category: row.category,
    domain: row.domain,
    content_tier: row.content_tier || null,
    city: row.city,
    location: row.location,
    neighborhood: row.neighborhood || row.location,
    distance_label: row.neighborhood ? "bate-volta bom" : "perto de voces",
    indoor_outdoor: row.indoor_outdoor || "indoor",
    weather_fit: row.indoor_outdoor === "outdoor" ? "Melhor quando o tempo esta aberto." : "Funciona bem mesmo sem depender do clima.",
    couple_fit_reason: buildCoupleReasonFromCatalog(row),
    image_url: row.image_url || null,
    personalization_label: row.content_tier === "signature" ? "destaque editorial" : undefined,
    related_favorite: undefined,
    image_fallback_key: row.domain,
    quality_score: row.quality_score ?? 72,
    availability_kind: row.availability_kind || null,
    editorial_source: row.editorial_source || null,
    booking_url: row.booking_url || null,
    price_band: row.price_band || null,
    start_time: null,
    price: row.price ?? null,
    tags: row.tags || [],
    source: row.editorial_source || "catalog",
    url: row.url || null,
    latitude: row.latitude ?? null,
    longitude: row.longitude ?? null,
    profile_signals: [],
    score: row.quality_score ?? 72,
    reason: row.description
  };
}

function scoreRecommendation(item: Recommendation, rainy: boolean, queryText?: string, draft?: OnboardingDraft) {
  const text = normalizeText([item.title, item.description, item.couple_fit_reason || "", ...(item.tags || [])].join(" "));
  let score = item.quality_score ?? 65;

  if (item.content_tier === "signature") score += 14;
  if (item.content_tier === "curated") score += 8;
  if (item.domain === "movies_series") score += 6;
  if (item.domain === "dining_out") score += 7;
  if (hasAny(text, ["romantic", "cozy", "quiet", "museum", "cinema", "cafe", "bookstore"])) score += 10;
  if (rainy && item.indoor_outdoor !== "outdoor") score += 8;
  if (rainy && item.indoor_outdoor === "outdoor") score -= 10;

  if (queryText) {
    const normalizedQuery = normalizeText(queryText);
    if (hasAny(normalizedQuery, ["romantic"]) && hasAny(text, ["romantic", "restaurant", "cafe"])) score += 12;
    if (hasAny(normalizedQuery, ["cultural", "museu", "cinema"]) && hasAny(text, ["museum", "museu", "cinema", "exhibition"])) score += 12;
    if (hasAny(normalizedQuery, ["delivery", "sofa", "em casa"]) && item.domain === "delivery") score += 12;
  }

  if (draft) {
    if (draft.mood === "romantic" && hasAny(text, ["romantic", "restaurant", "cafe", "trattoria"])) score += 12;
    if (draft.mood === "cultural" && hasAny(text, ["museum", "museu", "cinema", "exhibition", "livraria"])) score += 12;
    if (draft.quietVsSocial === "quiet" && hasAny(text, ["quiet", "cozy", "intimate", "museum", "bookstore", "cafe"])) score += 10;
    if (draft.indoorVsOutdoor === "indoor" && item.indoor_outdoor !== "outdoor") score += 6;
    if (draft.budget === "low" && (item.price || 0) > 120) score -= 12;
    if (draft.budget === "high" && (item.price || 0) > 70) score += 5;
    if (draft.crowdTolerance === "avoid" && hasAny(text, ["quiet", "cozy", "intimate", "museum", "bookstore"])) score += 8;
    if (draft.noiseTolerance === "low" && hasAny(text, ["nightclub", "bar", "party", "festival"])) score -= 12;
    if (draft.alcoholPreference === "avoid" && hasAny(text, ["wine", "cocktail", "bar", "brewery"])) score -= 8;
    if (draft.dateGoal === "talk" && hasAny(text, ["quiet", "cafe", "bookstore", "museum"])) score += 8;
    if (draft.dateGoal === "celebrate" && hasAny(text, ["restaurant", "cinema", "signature"])) score += 7;
    if (draft.preferredNeighborhoods && item.neighborhood && hasAny(normalizeText(draft.preferredNeighborhoods), [item.neighborhood])) score += 9;

    const signals = [
      draft.favoriteRestaurants,
      draft.favoriteMovies,
      draft.favoriteSeries,
      draft.favoritePlaces,
      draft.wishlist,
      draft.foodRestrictions,
      draft.preferredNeighborhoods,
      draft.member1Interests,
      draft.member2Interests
    ]
      .join(", ")
      .split(",")
      .map((entry) => normalizeText(entry))
      .filter(Boolean);

    if (signals.some((signal) => text.includes(signal))) score += 14;
  }

  return score;
}

export function getFallbackRecommendations(options?: { domain?: string; weather?: string; limit?: number; queryText?: string; draft?: OnboardingDraft }) {
  const rainy = /rain|storm|drizzle/.test((options?.weather || "").toLowerCase());
  const items = getCuratedSaoPauloCatalog()
    .map(mapCatalogToRecommendation)
    .filter((item) => (options?.domain ? item.domain === options.domain : true))
    .sort((a, b) => scoreRecommendation(b, rainy, options?.queryText, options?.draft) - scoreRecommendation(a, rainy, options?.queryText, options?.draft));

  return items.slice(0, options?.limit || 18);
}

function pickFirst(items: Recommendation[], keywords: string[]) {
  return items.find((item) => hasAny(normalizeText([item.title, item.description, ...(item.tags || [])].join(" ")), keywords));
}

export function buildFallbackDatePlan(recommendations: Recommendation[], context?: ExperienceContext): DateNightPlan | null {
  if (!recommendations.length) return null;

  const warmup = pickFirst(recommendations, ["cafe", "livraria", "bookstore", "quiet"]) || recommendations[0];
  const culture = pickFirst(recommendations, ["museum", "museu", "cinema", "exhibition"]) || recommendations[1] || recommendations[0];
  const dinner = pickFirst(recommendations, ["restaurant", "jantar", "trattoria", "pizza", "delivery"]) || recommendations[2] || recommendations[0];

  return {
    activity_1: {
      title: warmup.title,
      type: "warmup",
      reason: warmup.couple_fit_reason || "Abre a noite sem pressa e com menos ruido."
    },
    activity_2: {
      title: culture.title,
      type: "culture",
      reason: culture.couple_fit_reason || "Coloca repertorio e conversa no meio da noite."
    },
    activity_3: {
      title: dinner.title,
      type: "dining",
      reason: dinner.couple_fit_reason || "Fecha a noite com conforto e mais chance de agradar os dois."
    },
    reasoning: "Plano mobile montado a partir das recomendacoes mais fortes disponiveis no momento.",
    weather_note: context?.weather_note,
    couple_note: "Mantive o foco em escolhas mais leves, mais explicaveis e menos aleatorias."
  };
}

export function buildFallbackConciergeResponse(args: {
  message: string;
  recommendations: Recommendation[];
  context?: ExperienceContext;
  couple?: CoupleSnapshot | null;
}): ConciergeResponse {
  const baseItems = args.recommendations.length
    ? args.recommendations
    : getFallbackRecommendations({ limit: 6, queryText: args.message, weather: args.context?.weather });
  const top = baseItems.slice(0, 3);
  const memory: string[] = [];
  const normalizedMessage = normalizeText(args.message);

  if (hasAny(normalizedMessage, ["romantic"])) memory.push("mais romantico");
  if (hasAny(normalizedMessage, ["quiet", "calmo", "sem lotacao"])) memory.push("sem lotacao");
  if (hasAny(normalizedMessage, ["delivery", "em casa", "sofa"])) memory.push("em casa");
  if (hasAny(normalizedMessage, ["cultural", "museu", "cinema"])) memory.push("mais cultural");
  if ((args.context?.isRainy) || hasAny(normalizedMessage, ["chuva"])) memory.push("lugar coberto");

  return {
    intro: args.context?.isRainy
      ? "Eu puxaria algo coberto, gostoso e facil de encaixar sem atrito."
      : "Eu puxaria algo leve, confiavel e com mais cara de encontro do que de feed aleatorio.",
    memory,
    options: top.map((item) => ({
      title: item.title,
      summary: `${item.neighborhood || item.location || item.city} - ${item.category}`,
      why_it_fits: item.couple_fit_reason || item.description,
      constraints_applied: memory,
      weather_note: item.weather_fit || args.context?.weather_note || "Funciona bem hoje.",
      steps: [
        "Abram a fonte ou rota do lugar.",
        "Decidam em menos de um minuto se entra no plano de hoje.",
        "Se fizer sentido, mantenham so a proxima etapa em aberto."
      ],
      recommendation_ids: [item.id]
    }))
  };
}
