import type { CoupleSnapshot, ExperienceContext, Recommendation } from "@life/shared-types";

export type FeedbackSignalType =
  | "like"
  | "dislike"
  | "save"
  | "skip"
  | "view"
  | "dwell"
  | "click_cta"
  | "favorite";

export type FeedbackEntry = {
  user_id: string;
  experience_id: string;
  feedback_type: FeedbackSignalType;
  timestamp: string;
  title?: string;
  tags?: string[];
  domain?: string;
  category?: string;
  neighborhood?: string;
  location?: string;
  price?: number | null;
  indoor_outdoor?: string | null;
  dwell_ms?: number;
};

export type MLScoreBreakdown = {
  semantic: number;
  tagAffinity: number;
  neighborhoodAffinity: number;
  contextFit: number;
  explorationBonus: number;
  learnedDelta: number;
  repulsionPenalty: number;
  topSignals: string[];
};

export type MLInsights = {
  confidencePercent: number;
  totalSignals: number;
  explicitSignals: number;
  implicitSignals: number;
  explorationRate: number;
  dominantStyle: string;
  topLearnedTags: string[];
  topNeighborhoods: string[];
  avoidedSignals: string[];
  preferredDomains: Array<{ domain: string; label: string; weight: number }>;
  lastSignalSummary: string | null;
};

export type MLState = {
  userEmbedding: number[];
  dislikeEmbedding: number[] | null;
  userTagWeights: Record<string, number>;
  domainWeights: Record<string, number>;
  categoryWeights: Record<string, number>;
  neighborhoodWeights: Record<string, number>;
  categoryTrials: Record<string, number>;
  totalTrials: number;
  modelConfidence: number;
  seenIds: Set<string>;
  likedIds: Set<string>;
  savedIds: Set<string>;
  dislikedIds: Set<string>;
  interactionByItem: Record<string, Record<string, number>>;
  context: ExperienceContext;
  couple: CoupleSnapshot;
  maxDistanceKm: number;
  insights: MLInsights;
};

const EMBED_DIM = 384;

const REWARD_BY_SIGNAL: Record<FeedbackSignalType, number> = {
  favorite: 2.2,
  like: 1.5,
  save: 1.25,
  click_cta: 0.85,
  dwell: 0.45,
  view: 0.2,
  skip: -0.4,
  dislike: -1.85,
};

const STOPWORDS = new Set([
  "para",
  "com",
  "sem",
  "uma",
  "uns",
  "umas",
  "dos",
  "das",
  "nos",
  "nas",
  "por",
  "mais",
  "muito",
  "como",
  "que",
  "sao",
  "paulo",
  "the",
  "and",
  "for",
]);

function clamp(value: number, min: number, max: number) {
  if (Number.isNaN(value) || !Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

export function tokenize(text: string): string[] {
  if (!text || typeof text !== "string") return [];
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-z0-9]+/i)
    .filter((token) => token.length > 2 && !STOPWORDS.has(token));
}

export function hashEmbed(text: string, dim = EMBED_DIM): number[] {
  const vec = new Array(dim).fill(0);
  const tokens = tokenize(text);
  if (!tokens.length) return vec;

  for (let t = 0; t < tokens.length; t += 1) {
    const token = tokens[t];
    let hash1 = 2166136261;
    let hash2 = 16777619;
    for (let i = 0; i < token.length; i += 1) {
      const code = token.charCodeAt(i);
      hash1 ^= code;
      hash1 = Math.imul(hash1, 16777619);
      hash2 = (hash2 << 5) - hash2 + code;
      hash2 |= 0;
    }
    const idx = Math.abs(hash1) % dim;
    const sign = (hash2 & 1) === 0 ? 1 : -1;
    vec[idx] += sign;

    // Bigram feature hashing for richer semantic context
    if (t + 1 < tokens.length) {
      const bigram = `${token}_${tokens[t + 1]}`;
      let bHash = 5381;
      for (let j = 0; j < bigram.length; j += 1) {
        bHash = (bHash * 33) ^ bigram.charCodeAt(j);
      }
      const bIdx = Math.abs(bHash) % dim;
      vec[bIdx] += 0.65 * sign;
    }
  }

  const norm = Math.sqrt(vec.reduce((sum, value) => sum + value * value, 0)) || 1;
  return vec.map((value) => value / norm);
}

export function cosineSimilarity(a: number[] | null | undefined, b: number[] | null | undefined): number {
  if (!a?.length || !b?.length) return 0;
  const size = Math.min(a.length, b.length);
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < size; i += 1) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom ? clamp(dot / denom, -1, 1) : 0;
}

function itemText(item: Recommendation): string {
  return [
    item.title,
    item.description,
    item.location,
    item.neighborhood,
    item.category,
    item.editorial_source,
    item.related_favorite,
    ...(item.tags || []),
    ...((item.profile_signals as string[]) || []),
  ]
    .filter(Boolean)
    .join(" ");
}

export function buildItemEmbedding(item: Recommendation): number[] {
  return hashEmbed(itemText(item));
}

function extractProfileText(couple: CoupleSnapshot): string {
  const profile = couple.profile?.couple_profile_json || {};
  const members = (couple.members || []).flatMap((member) => [
    ...(member.interests || []),
    ...(member.movie_genres || []),
    ...(member.series_genres || []),
  ]);
  const prefs = couple.preferences || {};
  return JSON.stringify({
    profile,
    members,
    cuisines: prefs.preferred_cuisines,
    favorites: prefs.favorite_restaurants,
    places: prefs.favorite_places,
    movies: prefs.favorite_movies,
    wishlist: prefs.wishlist,
    city: couple.city,
    neighborhood: couple.neighborhood,
  });
}

function normalizeKey(value: string | null | undefined): string {
  if (!value) return "";
  return String(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function buildTagWeightsFromProfile(couple: CoupleSnapshot): Record<string, number> {
  const weights: Record<string, number> = {};
  const profile = couple.profile?.couple_profile_json || {};
  const preferences = couple.preferences || {};

  const positiveBuckets: Array<{ items: unknown; weight: number }> = [
    { items: preferences.favorite_restaurants, weight: 1.8 },
    { items: preferences.favorite_places, weight: 1.7 },
    { items: preferences.wishlist, weight: 1.6 },
    { items: preferences.preferred_cuisines, weight: 1.5 },
    { items: preferences.preferred_activities, weight: 1.3 },
    { items: preferences.romantic_walk_types, weight: 1.3 },
    { items: preferences.favorite_movies, weight: 1.4 },
    { items: preferences.favorite_series, weight: 1.4 },
    { items: profile.interests?.topics, weight: 1.1 },
    { items: profile.interests?.series, weight: 1.2 },
    { items: profile.interests?.cinema?.favorite_titles, weight: 1.3 },
    { items: profile.interests?.cinema?.favorite_style, weight: 1.2 },
    {
      items: profile.dining?.dining_out?.map((row: any) => `${row?.name || ""} ${(row?.dishes || []).join(" ")}`),
      weight: 1.6,
    },
    { items: profile.dining?.delivery, weight: 1.2 },
    { items: profile.dining?.likes, weight: 1.1 },
    { items: profile.culture?.liked_exhibitions, weight: 1.3 },
    { items: profile.culture?.wishlist, weight: 1.5 },
    { items: profile.lifestyle?.preferences, weight: 1.1 },
    {
      items: (couple.members || []).flatMap((member) => [
        ...(member.interests || []),
        ...(member.movie_genres || []),
        ...(member.series_genres || []),
        ...(member.music_genres || []),
      ]),
      weight: 1.0,
    },
  ];

  const negativeBuckets: Array<{ items: unknown; weight: number }> = [
    { items: preferences.avoided_cuisines, weight: -1.8 },
    { items: preferences.food_restrictions, weight: -2.0 },
    {
      items: (couple.members || []).flatMap((member) => [
        ...(member.dislikes || []),
        ...(member.food_dislikes || []),
        ...(member.allergies || []),
        ...(member.intolerances || []),
      ]),
      weight: -1.7,
    },
  ];

  for (const bucket of [...positiveBuckets, ...negativeBuckets]) {
    if (!bucket.items) continue;
    const values = Array.isArray(bucket.items) ? bucket.items : [bucket.items];
    for (const value of values) {
      if (!value) continue;
      for (const token of tokenize(String(value))) {
        weights[token] = clamp((weights[token] || 0) + bucket.weight, -4, 4);
      }
    }
  }

  return weights;
}

const DOMAIN_LABELS: Record<string, string> = {
  dining_out: "Gastronomia & Jantar",
  events_exhibitions: "Cultura & Exposições",
  movies_series: "Cinema & Séries",
  delivery: "Delivery & Em Casa",
};

export function buildMLState(
  couple: CoupleSnapshot,
  context: ExperienceContext,
  feedback: FeedbackEntry[] = []
): MLState {
  const safeFeedback = Array.isArray(feedback) ? feedback : [];
  const profileTags = buildTagWeightsFromProfile(couple);
  const userTagWeights: Record<string, number> = { ...profileTags };
  const domainWeights: Record<string, number> = {
    dining_out: 0.2,
    events_exhibitions: 0.2,
    movies_series: 0.15,
    delivery: 0.1,
  };
  const categoryWeights: Record<string, number> = {};
  const neighborhoodWeights: Record<string, number> = {};
  const categoryTrials: Record<string, number> = {};

  if (couple.neighborhood) {
    neighborhoodWeights[normalizeKey(couple.neighborhood)] = 0.65;
  }
  for (const prefNeighborhood of couple.preferences?.preferred_neighborhoods || []) {
    neighborhoodWeights[normalizeKey(prefNeighborhood)] = 0.55;
  }

  const interactionByItem: Record<string, Record<string, number>> = {};
  const seenIds = new Set<string>();
  const likedIds = new Set<string>();
  const savedIds = new Set<string>();
  const dislikedIds = new Set<string>();

  const positiveTexts: string[] = [extractProfileText(couple)];
  const negativeTexts: string[] = [];

  let explicitSignals = 0;
  let implicitSignals = 0;

  // Sort feedback chronologically so online learning updates follow user evolution
  const sortedFeedback = [...safeFeedback].sort(
    (a, b) => new Date(a.timestamp || 0).getTime() - new Date(b.timestamp || 0).getTime()
  );

  const nowMs = Date.now();

  for (const entry of sortedFeedback) {
    if (!entry || !entry.experience_id) continue;
    const type: FeedbackSignalType = REWARD_BY_SIGNAL[entry.feedback_type] != null ? entry.feedback_type : "view";
    const tsMs = new Date(entry.timestamp || nowMs).getTime();
    const ageDays = Math.max(0, (nowMs - (Number.isNaN(tsMs) ? nowMs : tsMs)) / 86_400_000);

    const isImplicit = type === "view" || type === "dwell" || type === "click_cta";
    if (isImplicit) implicitSignals += 1;
    else explicitSignals += 1;

    // Exponential recency decay (explicit signals persist longer than implicit views)
    const halfLifeDays = isImplicit ? 10 : 28;
    const decay = Math.exp((-Math.LN2 * ageDays) / halfLifeDays);
    const baseReward = REWARD_BY_SIGNAL[type] ?? 0.1;
    const dwellBonus =
      type === "dwell" && entry.dwell_ms ? clamp(entry.dwell_ms / 15_000, 0.1, 0.7) : 0;
    const delta = (baseReward + dwellBonus) * decay;

    seenIds.add(entry.experience_id);
    interactionByItem[entry.experience_id] ||= {};
    interactionByItem[entry.experience_id][type] =
      (interactionByItem[entry.experience_id][type] || 0) + 1;

    if (type === "like" || type === "favorite") {
      likedIds.add(entry.experience_id);
      dislikedIds.delete(entry.experience_id);
    } else if (type === "save") {
      savedIds.add(entry.experience_id);
      dislikedIds.delete(entry.experience_id);
    } else if (type === "dislike") {
      dislikedIds.add(entry.experience_id);
      likedIds.delete(entry.experience_id);
      savedIds.delete(entry.experience_id);
    }

    const sourceText = [
      entry.title || "",
      ...(entry.tags || []),
      entry.category || "",
      entry.neighborhood || "",
      entry.location || "",
      entry.experience_id.replace(/[-_]/g, " "),
    ].join(" ");

    if (delta > 0.25) {
      positiveTexts.push(sourceText);
    } else if (delta < -0.25) {
      negativeTexts.push(sourceText);
    }

    // Online SGD update with L2 shrinkage on tag tokens
    const learningRate = isImplicit ? 0.35 : 0.65;
    for (const token of tokenize(sourceText)) {
      const current = userTagWeights[token] || 0;
      const updated = current * 0.96 + learningRate * delta;
      userTagWeights[token] = clamp(updated, -4.5, 4.5);
    }

    if (entry.domain) {
      const dKey = normalizeKey(entry.domain);
      domainWeights[dKey] = clamp((domainWeights[dKey] || 0) + 0.22 * delta, -1.5, 2.0);
    }

    if (entry.category) {
      const cKey = normalizeKey(entry.category);
      categoryWeights[cKey] = clamp((categoryWeights[cKey] || 0) + 0.3 * delta, -2.0, 2.5);
      categoryTrials[cKey] = (categoryTrials[cKey] || 0) + 1;
    }

    const nKey = normalizeKey(entry.neighborhood || entry.location);
    if (nKey && nKey !== "sao paulo") {
      neighborhoodWeights[nKey] = clamp((neighborhoodWeights[nKey] || 0) + 0.28 * delta, -1.5, 2.2);
    }
  }

  const userEmbedding = hashEmbed(positiveTexts.join(" "));
  const dislikeEmbedding = negativeTexts.length ? hashEmbed(negativeTexts.join(" ")) : null;

  const totalTrials = sortedFeedback.length;
  // Model confidence grows smoothly from 0.25 (cold start profile) to 0.98 (rich history)
  const profileRichness = Math.min(1, Object.keys(profileTags).length / 22);
  const feedbackRichness = 1 - Math.exp(-(explicitSignals * 1.4 + implicitSignals * 0.4) / 14);
  const modelConfidence = clamp(0.28 + 0.32 * profileRichness + 0.4 * feedbackRichness, 0.25, 0.98);
  const explorationRate = clamp(0.32 * (1 - feedbackRichness * 0.72), 0.08, 0.32);

  // Build human-readable insights for UI explainability
  const sortedTags = Object.entries(userTagWeights)
    .filter(([token]) => token.length > 3)
    .sort((a, b) => b[1] - a[1]);

  const topLearnedTags = sortedTags
    .filter(([, weight]) => weight > 0.5)
    .slice(0, 6)
    .map(([token]) => token);

  const avoidedSignals = sortedTags
    .filter(([, weight]) => weight < -0.5)
    .sort((a, b) => a[1] - b[1])
    .slice(0, 5)
    .map(([token]) => token);

  const topNeighborhoods = Object.entries(neighborhoodWeights)
    .filter(([, weight]) => weight > 0.2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([name]) => name.replace(/\b\w/g, (l) => l.toUpperCase()));

  const preferredDomains = Object.entries(domainWeights)
    .map(([domain, weight]) => ({
      domain,
      label: DOMAIN_LABELS[domain] || domain,
      weight: Math.round(clamp((weight + 1) * 50, 10, 99)),
    }))
    .sort((a, b) => b.weight - a.weight);

  const lastEntry = sortedFeedback[sortedFeedback.length - 1];
  let lastSignalSummary: string | null = null;
  if (lastEntry) {
    const labelMap: Record<FeedbackSignalType, string> = {
      favorite: "Favoritado",
      like: "Curtido",
      save: "Salvo na coleção",
      click_cta: "Rota/link aberto",
      dwell: "Leitura detalhada",
      view: "Explorado",
      skip: "Pulado por agora",
      dislike: "Ocultado (menos parecidos)",
    };
    const actionLabel = labelMap[lastEntry.feedback_type] || "Interação";
    lastSignalSummary = `${actionLabel}: ${lastEntry.title || lastEntry.experience_id}`;
  }

  const dominantStyle =
    preferredDomains[0]?.domain === "dining_out"
      ? "Gastronômico & Intimista"
      : preferredDomains[0]?.domain === "events_exhibitions"
        ? "Cultural & Explorador Urbano"
        : preferredDomains[0]?.domain === "movies_series"
          ? "Cinéfilo & Conforto a Dois"
          : "Curadoria Equilibrada SP";

  const insights: MLInsights = {
    confidencePercent: Math.round(modelConfidence * 100),
    totalSignals: totalTrials,
    explicitSignals,
    implicitSignals,
    explorationRate: Math.round(explorationRate * 100),
    dominantStyle,
    topLearnedTags,
    topNeighborhoods: topNeighborhoods.length ? topNeighborhoods : [couple.neighborhood || "Campo Belo", "Pinheiros", "Paulista"],
    avoidedSignals,
    preferredDomains,
    lastSignalSummary,
  };

  return {
    userEmbedding,
    dislikeEmbedding,
    userTagWeights,
    domainWeights,
    categoryWeights,
    neighborhoodWeights,
    categoryTrials,
    totalTrials,
    modelConfidence,
    seenIds,
    likedIds,
    savedIds,
    dislikedIds,
    interactionByItem,
    context,
    couple,
    maxDistanceKm: couple.search_radius_km || 15,
    insights,
  };
}

function computeTagAffinity(
  userTagWeights: Record<string, number>,
  item: Recommendation
): { score: number; matchedSignals: string[] } {
  const candidates = [
    ...(item.tags || []),
    item.title,
    item.category,
    item.neighborhood || "",
    item.editorial_source || "",
    ...((item.profile_signals as string[]) || []),
  ];

  const tokens = Array.from(new Set(candidates.flatMap((c) => tokenize(String(c)))));
  if (!tokens.length) return { score: 0.5, matchedSignals: [] };

  let positiveSum = 0;
  let negativeSum = 0;
  const matched: Array<{ token: string; weight: number }> = [];

  for (const token of tokens) {
    const w = userTagWeights[token] || 0;
    if (w > 0) {
      positiveSum += w;
      if (w >= 0.6) matched.push({ token, weight: w });
    } else if (w < 0) {
      negativeSum += Math.abs(w);
    }
  }

  matched.sort((a, b) => b.weight - a.weight);
  const raw = 0.5 + (positiveSum * 0.08 - negativeSum * 0.12);
  return {
    score: clamp(raw, 0, 1),
    matchedSignals: matched.slice(0, 3).map((m) => m.token),
  };
}

function computeContextFit(item: Recommendation, context: ExperienceContext): number {
  let score = 0.58;
  const tags = (item.tags || []).map((tag) => tag.toLowerCase());
  const category = String(item.category || "").toLowerCase();

  if (context.isRainy) {
    if (
      item.indoor_outdoor === "indoor" ||
      ["movie", "filme", "série", "series", "museum", "museu", "restaurant", "cafe", "livraria"].some(
        (k) => category.includes(k) || tags.includes(k)
      )
    ) {
      score += 0.26;
    } else if (item.indoor_outdoor === "outdoor") {
      score -= 0.28;
    }
  } else {
    if (item.indoor_outdoor === "outdoor" || item.indoor_outdoor === "mixed") {
      score += 0.14;
    }
  }

  if (
    context.isNight &&
    ["restaurant", "restaurante", "event", "evento", "movie", "filme", "trattoria", "jantar"].some(
      (k) => category.includes(k) || tags.includes(k)
    )
  ) {
    score += 0.16;
  }

  if (tags.some((tag) => ["quiet", "calmo", "romantic", "romântico", "intimista", "aconchegante"].includes(tag))) {
    score += 0.12;
  }

  return clamp(score, 0, 1);
}

function profilePolicyMatch(item: Recommendation, couple: CoupleSnapshot): number {
  const tags = (item.tags || []).map((tag) => tag.toLowerCase());
  const text = `${item.title} ${item.description} ${item.location} ${(item.tags || []).join(" ")}`.toLowerCase();
  const preferences = couple.preferences || {};
  const preferredActivities = preferences.preferred_activities || [];
  const romanticWalks = preferences.romantic_walk_types || [];
  const preferredCuisines = preferences.preferred_cuisines || [];
  const avoidedCuisines = preferences.avoided_cuisines || [];
  let score = 0.55;

  if (preferredActivities.some((value) => text.includes(value.toLowerCase()))) score += 0.18;
  if (romanticWalks.some((value) => text.includes(value.toLowerCase()))) score += 0.15;
  if (preferredCuisines.some((value) => text.includes(value.toLowerCase()))) score += 0.2;
  if (avoidedCuisines.some((value) => text.includes(value.toLowerCase()))) score -= 0.3;
  if (
    preferences.alcohol_policy === "none_drink" &&
    tags.some((tag) => ["bar", "vinho", "drinks", "cocktail", "balada"].includes(tag))
  ) {
    score -= 0.28;
  }

  return clamp(score, 0, 1);
}

function foodRestrictionPenalty(item: Recommendation, couple: CoupleSnapshot): number {
  const text = `${item.title} ${item.description} ${(item.tags || []).join(" ")}`.toLowerCase();
  const restrictions = (couple.members || []).flatMap((member) => [
    ...(member.allergies || []),
    ...(member.intolerances || []),
    ...(member.food_dislikes || []),
    ...((couple.preferences?.food_restrictions as string[]) || []),
  ]);
  if (!restrictions.length) return 0;
  if (restrictions.some((value) => value && text.includes(value.toLowerCase()))) return 0.35;
  return 0;
}

function penaltyScore(item: Recommendation): number {
  const tags = (item.tags || []).map((tag) => tag.toLowerCase());
  let penalty = 0;
  if (tags.some((tag) => ["nightclub", "balada", "party", "lotado"].includes(tag))) penalty += 0.25;
  if (item.avoid_reason) penalty += 0.18;
  return penalty;
}

export function scoreItemWithML(
  item: Recommendation,
  state: MLState
): {
  mlScore: number;
  mlReason: string;
  breakdown: MLScoreBreakdown;
} {
  const itemEmbedding = buildItemEmbedding(item);
  const semanticRaw = cosineSimilarity(state.userEmbedding, itemEmbedding);
  const semantic = clamp((semanticRaw + 1) / 2, 0, 1);

  // Repulsion from disliked prototype embedding
  const dislikeSim = state.dislikeEmbedding ? Math.max(0, cosineSimilarity(state.dislikeEmbedding, itemEmbedding)) : 0;
  const isDirectDislike = state.dislikedIds.has(item.id);
  const repulsionPenalty = isDirectDislike ? 0.55 : dislikeSim > 0.35 ? (dislikeSim - 0.35) * 0.45 : 0;

  // Direct positive memory boost
  const isDirectLike = state.likedIds.has(item.id);
  const isDirectSave = state.savedIds.has(item.id);
  const directPositiveBoost = isDirectLike ? 0.14 : isDirectSave ? 0.11 : 0;

  const { score: tagMatchScore, matchedSignals } = computeTagAffinity(state.userTagWeights, item);
  const policyScore = profilePolicyMatch(item, state.couple);
  const tagAffinity = clamp(tagMatchScore * 0.65 + policyScore * 0.35, 0, 1);

  const dKey = normalizeKey(item.domain);
  const cKey = normalizeKey(item.category);
  const nKey = normalizeKey(item.neighborhood || item.location);

  const domainBoost = clamp((state.domainWeights[dKey] || 0) * 0.08, -0.12, 0.15);
  const categoryBoost = clamp((state.categoryWeights[cKey] || 0) * 0.09, -0.15, 0.18);
  const neighborhoodBoost = clamp((state.neighborhoodWeights[nKey] || 0) * 0.1, -0.1, 0.16);
  const neighborhoodAffinity = clamp(0.5 + (state.neighborhoodWeights[nKey] || 0) * 0.25, 0, 1);

  const contextFit = computeContextFit(item, state.context);

  // Contextual Bandit UCB1 Exploration bonus for under-explored categories
  const cTrials = state.categoryTrials[cKey] || 0;
  const ucbRaw = Math.sqrt(Math.log(state.totalTrials + 3) / (cTrials + 1));
  const explorationBonus = state.seenIds.has(item.id)
    ? 0.02
    : clamp(ucbRaw * (state.insights.explorationRate / 100) * 0.25, 0.02, 0.14);

  const learnedDelta = Math.round((domainBoost + categoryBoost + neighborhoodBoost + directPositiveBoost - repulsionPenalty) * 100);

  const totalPenalty = penaltyScore(item) + foodRestrictionPenalty(item, state.couple) + repulsionPenalty;

  const rawCombined =
    0.30 * semantic +
    0.28 * tagAffinity +
    0.18 * contextFit +
    0.12 * neighborhoodAffinity +
    0.12 * (item.personalization_label ? 0.95 : 0.65) +
    domainBoost +
    categoryBoost +
    directPositiveBoost +
    explorationBonus -
    totalPenalty;

  const mlScore = Math.round(clamp(rawCombined * 100, 18, 99));

  const mlReason = buildMLReason({
    semantic,
    tagAffinity,
    contextFit,
    matchedSignals,
    learnedDelta,
    isDirectLike,
    isDirectSave,
    item,
    couple: state.couple,
  });

  return {
    mlScore,
    mlReason,
    breakdown: {
      semantic: Math.round(semantic * 100),
      tagAffinity: Math.round(tagAffinity * 100),
      neighborhoodAffinity: Math.round(neighborhoodAffinity * 100),
      contextFit: Math.round(contextFit * 100),
      explorationBonus: Math.round(explorationBonus * 100),
      learnedDelta,
      repulsionPenalty: Math.round(repulsionPenalty * 100),
      topSignals: matchedSignals,
    },
  };
}

function buildMLReason(parts: {
  semantic: number;
  tagAffinity: number;
  contextFit: number;
  matchedSignals: string[];
  learnedDelta: number;
  isDirectLike: boolean;
  isDirectSave: boolean;
  item: Recommendation;
  couple: CoupleSnapshot;
}): string {
  if (parts.isDirectLike) {
    return "Vocês curtiram essa experiência — o modelo elevou propostas com essa assinatura.";
  }
  if (parts.isDirectSave) {
    return "Salvo na coleção do casal — priorizado pelo aprendizado contínuo.";
  }
  const prefs = parts.couple.preferences || {};
  const text = `${parts.item.title} ${(parts.item.tags || []).join(" ")}`.toLowerCase();
  const cuisineHit = (prefs.preferred_cuisines || []).find((c) => text.includes(c.toLowerCase()));
  if (cuisineHit && parts.learnedDelta > 4) {
    return `Alta afinidade aprendida com culinária ${cuisineHit} (+${parts.learnedDelta}% boost neural).`;
  }
  if (cuisineHit) {
    return `Combina com a culinária ${cuisineHit} que vocês escolheram no perfil.`;
  }
  const favoriteHit = (prefs.favorite_restaurants || []).find((name) => text.includes(name.toLowerCase()));
  if (favoriteHit) {
    return `Muito próximo do estilo de ${favoriteHit}, um dos favoritos do casal.`;
  }
  if (parts.learnedDelta >= 8 && parts.matchedSignals.length > 0) {
    return `Aprendizado contínuo: +${parts.learnedDelta}% de afinidade pelos sinais "${parts.matchedSignals.slice(0, 2).join(", ")}".`;
  }
  if (parts.semantic > 0.68) {
    return "Forte similaridade semântica com as experiências que vocês mais aprovaram.";
  }
  if (parts.tagAffinity > 0.68) {
    return "Alinhamento elevado com o repertório cultural e gastronômico do casal.";
  }
  if (parts.contextFit > 0.72) {
    return "Calibrado para o clima, horário e logística de deslocamento de hoje.";
  }
  if (parts.item.personalization_label) {
    return "Conectado diretamente aos favoritos e wishlist do casal.";
  }
  return "Selecionado pelo motor híbrido de curadoria e aprendizado contínuo.";
}

/**
 * Maximal Marginal Relevance (MMR) re-ranking to balance relevance and diversity.
 */
export function diversifyWithMMR(
  items: Recommendation[],
  lambda = 0.78,
  maxItems = items.length
): Recommendation[] {
  if (items.length <= 2) return items;
  const limit = Math.min(maxItems, items.length);
  const embeddings = new Map<string, number[]>();
  for (const item of items) {
    embeddings.set(item.id, buildItemEmbedding(item));
  }

  const remaining = [...items];
  const selected: Recommendation[] = [];

  // Always pick the highest scored item first
  remaining.sort((a, b) => (b.quality_score || 0) - (a.quality_score || 0));
  const first = remaining.shift();
  if (first) selected.push(first);

  while (selected.length < limit && remaining.length > 0) {
    let bestIdx = 0;
    let bestMmr = -Infinity;

    for (let i = 0; i < remaining.length; i += 1) {
      const candidate = remaining[i];
      const relevance = (candidate.quality_score || 50) / 100;
      const candVec = embeddings.get(candidate.id);

      let maxSim = 0;
      // Compare against last 5 selected items to avoid local clustering
      const windowSlice = selected.slice(-5);
      for (const chosen of windowSlice) {
        const chosenVec = embeddings.get(chosen.id);
        let sim = cosineSimilarity(candVec, chosenVec);
        if (chosen.neighborhood && candidate.neighborhood === chosen.neighborhood && chosen.category === candidate.category) {
          sim = Math.min(1, sim + 0.25);
        }
        if (sim > maxSim) maxSim = sim;
      }

      const mmrScore = lambda * relevance - (1 - lambda) * maxSim;
      if (mmrScore > bestMmr) {
        bestMmr = mmrScore;
        bestIdx = i;
      }
    }

    const [picked] = remaining.splice(bestIdx, 1);
    if (picked) selected.push(picked);
  }

  return selected;
}

export function rankRecommendationsWithML(items: Recommendation[], state: MLState): Recommendation[] {
  const scored = items.map((item) => {
    const { mlScore, mlReason } = scoreItemWithML(item, state);
    return {
      ...item,
      score: Number((mlScore / 10).toFixed(1)),
      quality_score: mlScore,
      reason: item.reason || mlReason,
      couple_fit_reason: item.couple_fit_reason || mlReason,
    };
  });

  return diversifyWithMMR(scored, 0.8);
}
