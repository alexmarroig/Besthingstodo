import type { CoupleSnapshot, ExperienceContext, Recommendation } from "@life/shared-types";

export type FeedbackEntry = {
  user_id: string;
  experience_id: string;
  feedback_type: "like" | "dislike" | "save" | "skip";
  timestamp: string;
  title?: string;
  tags?: string[];
};

export type MLState = {
  userEmbedding: number[];
  userTagWeights: Record<string, number>;
  seenIds: Set<string>;
  interactionByItem: Record<string, Record<string, number>>;
  context: ExperienceContext;
  couple: CoupleSnapshot;
  maxDistanceKm: number;
};

const EMBED_DIM = 384;

function tokenize(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-z0-9áàâãéêíóôõúç]+/i)
    .filter((token) => token.length > 2);
}

export function hashEmbed(text: string, dim = EMBED_DIM): number[] {
  const vec = new Array(dim).fill(0);
  for (const token of tokenize(text)) {
    let hash = 0;
    for (let i = 0; i < token.length; i += 1) {
      hash = (hash << 5) - hash + token.charCodeAt(i);
      hash |= 0;
    }
    const idx = Math.abs(hash) % dim;
    vec[idx] += 1;
  }
  const norm = Math.sqrt(vec.reduce((sum, value) => sum + value * value, 0)) || 1;
  return vec.map((value) => value / norm);
}

export function cosineSimilarity(a: number[] | null | undefined, b: number[] | null | undefined) {
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
  return denom ? dot / denom : 0;
}

function itemText(item: Recommendation) {
  return [item.title, item.description, item.location, item.neighborhood, ...(item.tags || [])].filter(Boolean).join(" ");
}

export function buildItemEmbedding(item: Recommendation) {
  return hashEmbed(itemText(item));
}

function extractProfileText(couple: CoupleSnapshot) {
  const profile = couple.profile?.couple_profile_json || {};
  const members = (couple.members || []).flatMap((member) => [
    ...(member.interests || []),
    ...(member.dislikes || []),
  ]);
  return JSON.stringify({ profile, members, city: couple.city, neighborhood: couple.neighborhood });
}

function buildTagWeightsFromFeedback(feedback: FeedbackEntry[]) {
  const weights: Record<string, number> = {};
  const decayDays = 30;

  for (const entry of feedback) {
    const ageDays = (Date.now() - new Date(entry.timestamp).getTime()) / 86400000;
    const decay = Math.exp(-ageDays / decayDays);
    const delta =
      entry.feedback_type === "like" || entry.feedback_type === "save"
        ? 1.2 * decay
        : entry.feedback_type === "dislike"
          ? -1.5 * decay
          : -0.2 * decay;

    const sourceText = [entry.title || "", ...(entry.tags || []), entry.experience_id].join(" ");
    for (const token of tokenize(sourceText)) {
      weights[token] = (weights[token] || 0) + delta;
    }
  }

  return weights;
}

function buildTagWeightsFromProfile(couple: CoupleSnapshot) {
  const weights: Record<string, number> = {};
  const profile = couple.profile?.couple_profile_json || {};
  const buckets = [
    profile.interests?.topics,
    profile.interests?.series,
    profile.interests?.cinema?.favorite_titles,
    profile.interests?.cinema?.favorite_style,
    profile.dining?.dining_out?.map((row: any) => `${row.name} ${(row.dishes || []).join(" ")}`),
    profile.dining?.delivery,
    profile.dining?.likes,
    profile.culture?.liked_exhibitions,
    profile.culture?.wishlist,
    profile.lifestyle?.preferences,
    ...(couple.members || []).flatMap((member) => [...(member.interests || []), ...(member.dislikes || [])]),
  ];

  for (const bucket of buckets) {
    if (!bucket) continue;
    const values = Array.isArray(bucket) ? bucket : [bucket];
    for (const value of values) {
      for (const token of tokenize(String(value))) {
        weights[token] = (weights[token] || 0) + 1;
      }
    }
  }

  return weights;
}

function mergeTagWeights(...maps: Record<string, number>[]) {
  const merged: Record<string, number> = {};
  for (const map of maps) {
    for (const [key, value] of Object.entries(map)) {
      merged[key] = (merged[key] || 0) + value;
    }
  }
  return merged;
}

function tagOverlap(userTagWeights: Record<string, number>, itemTags: string[]) {
  if (!Object.keys(userTagWeights).length || !itemTags.length) return 0;
  const total = Object.values(userTagWeights).reduce((sum, value) => sum + Math.max(value, 0), 0) || 1;
  let overlap = 0;
  for (const tag of itemTags) {
    for (const token of tokenize(tag)) {
      overlap += Math.max(userTagWeights[token] || 0, 0);
    }
  }
  return overlap / total;
}

function interactionStats(interactions: Record<string, number>) {
  const likes = interactions.like || 0;
  const saves = interactions.save || 0;
  const views = interactions.view || 0;
  const dislikes = interactions.dislike || 0;
  const raw = 1.5 * likes + 1.0 * saves + 0.2 * views - 1.2 * dislikes;
  return Math.max(0, Math.min(1, raw / 20 + 0.5));
}

function contextMatch(item: Recommendation, context: ExperienceContext) {
  let score = 0.5;
  const tags = (item.tags || []).map((tag) => tag.toLowerCase());
  const category = String(item.category || "").toLowerCase();

  if (context.isRainy && (item.indoor_outdoor === "indoor" || ["movie", "filme", "série", "series", "museum", "museu"].some((k) => category.includes(k) || tags.includes(k)))) {
    score += 0.25;
  }
  if (context.isNight && ["restaurant", "restaurante", "event", "evento", "movie", "filme"].some((k) => category.includes(k) || tags.includes(k))) {
    score += 0.2;
  }
  if (tags.some((tag) => ["quiet", "calmo", "romantic", "romântico", "intimista"].includes(tag))) {
    score += 0.15;
  }
  return Math.min(1, score);
}

function noveltyScore(seenIds: Set<string>, itemId: string) {
  return seenIds.has(itemId) ? 0.1 : 1;
}

function coupleCompatibility(item: Recommendation) {
  const tags = (item.tags || []).map((tag) => tag.toLowerCase());
  if (tags.some((tag) => ["romantic", "romântico", "quiet", "calmo", "restaurant", "restaurante", "café", "cafe"].includes(tag))) {
    return 1;
  }
  return 0.55;
}

function penaltyScore(item: Recommendation) {
  const tags = (item.tags || []).map((tag) => tag.toLowerCase());
  let penalty = 0;
  if (tags.some((tag) => ["nightclub", "bar", "party", "esporte", "sports", "basquete", "nba"].includes(tag))) penalty += 0.25;
  if (item.avoid_reason) penalty += 0.2;
  return penalty;
}

function finalScore(parts: {
  semantic: number;
  tagMatch: number;
  context: number;
  popularity: number;
  novelty: number;
  coupleCompat: number;
  penalty: number;
}) {
  const score =
    0.35 * parts.semantic +
    0.2 * parts.tagMatch +
    0.15 * parts.context +
    0.1 * parts.popularity +
    0.1 * parts.novelty +
    0.1 * parts.coupleCompat;
  return Math.max(0, Math.min(1, score - parts.penalty));
}

export function buildMLState(
  couple: CoupleSnapshot,
  context: ExperienceContext,
  feedback: FeedbackEntry[] = []
): MLState {
  const profileTags = buildTagWeightsFromProfile(couple);
  const feedbackTags = buildTagWeightsFromFeedback(feedback);
  const likedItems = feedback.filter((entry) => entry.feedback_type === "like" || entry.feedback_type === "save");
  const likedText = likedItems.map((entry) => entry.experience_id).join(" ");
  const userEmbedding = hashEmbed(`${extractProfileText(couple)} ${likedText}`);

  const interactionByItem: Record<string, Record<string, number>> = {};
  const seenIds = new Set<string>();
  for (const entry of feedback) {
    seenIds.add(entry.experience_id);
    interactionByItem[entry.experience_id] ||= {};
    interactionByItem[entry.experience_id][entry.feedback_type] =
      (interactionByItem[entry.experience_id][entry.feedback_type] || 0) + 1;
  }

  return {
    userEmbedding,
    userTagWeights: mergeTagWeights(profileTags, feedbackTags),
    seenIds,
    interactionByItem,
    context,
    couple,
    maxDistanceKm: couple.search_radius_km || 15,
  };
}

export function scoreItemWithML(item: Recommendation, state: MLState) {
  const itemEmbedding = buildItemEmbedding(item);
  const semantic = cosineSimilarity(state.userEmbedding, itemEmbedding);
  const tagMatch = tagOverlap(state.userTagWeights, [...(item.tags || []), item.title, item.category]);
  const contextScore = contextMatch(item, state.context);
  const popularity = interactionStats(state.interactionByItem[item.id] || {});
  const novelty = noveltyScore(state.seenIds, item.id);
  const coupleCompat = coupleCompatibility(item);
  const penalty = penaltyScore(item);

  const normalized = finalScore({
    semantic,
    tagMatch,
    context: contextScore,
    popularity,
    novelty,
    coupleCompat,
    penalty,
  });

  return {
    mlScore: Math.round(normalized * 100),
    mlReason: buildMLReason({ semantic, tagMatch, contextScore, item }),
  };
}

function buildMLReason(parts: { semantic: number; tagMatch: number; contextScore: number; item: Recommendation }) {
  if (parts.semantic > 0.42) return "Parecido com o que vocês já curtiram.";
  if (parts.tagMatch > 0.35) return "Combina com os gostos do casal.";
  if (parts.contextScore > 0.65) return "Encaixa bem no clima e horário de hoje.";
  if (parts.item.personalization_label) return "Ligado ao repertório de vocês.";
  return "Recomendado pelo perfil e histórico de vocês.";
}

export function rankRecommendationsWithML(items: Recommendation[], state: MLState) {
  return items
    .map((item) => {
      const { mlScore, mlReason } = scoreItemWithML(item, state);
      return {
        ...item,
        score: mlScore / 10,
        quality_score: mlScore,
        reason: item.reason || mlReason,
        couple_fit_reason: item.couple_fit_reason || mlReason,
      };
    })
    .sort((a, b) => (b.quality_score || 0) - (a.quality_score || 0));
}
