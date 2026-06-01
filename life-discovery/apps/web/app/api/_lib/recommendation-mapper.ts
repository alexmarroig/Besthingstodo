import type { ContentTier, RecommendationDomain } from "@life/shared-types";
import type { RssItem } from "./rss";

export type RecommendationPayload = {
  id: string;
  title: string;
  description: string;
  category: string;
  domain: RecommendationDomain;
  content_tier?: ContentTier;
  city: string;
  location: string;
  neighborhood?: string | null;
  image_url?: string | null;
  tags: string[];
  source: string;
  url?: string | null;
  booking_url?: string | null;
  editorial_source?: string | null;
  availability_kind?: "venue" | "delivery" | "streaming" | "event" | null;
  quality_score?: number | null;
  score?: number | null;
  price?: number | null;
  price_band?: string | null;
  rating?: number | null;
  review_snippet?: string | null;
  start_time?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  profile_signals?: string[];
  personalization_label?: string | null;
  related_favorite?: string | null;
};

const TOPIC_KEYWORDS: Record<string, string[]> = {
  openings: ["abertura", "abriu", "inaugura", "novo restaurante", "nova casa", "debut"],
  reviews: ["review", "crítica", "critica", "avalia", "provou", "testou", "cardápio"],
  trends: ["tendência", "tendencia", "moda", "alta", "boom", "movimento"],
  events: ["festival", "feira", "restaurant week", "degustação", "evento", "taste"],
};

function inferCategory(title: string, description: string, fallback: string) {
  const text = `${title} ${description}`.toLowerCase();
  if (TOPIC_KEYWORDS.openings.some((k) => text.includes(k))) return "opening";
  if (TOPIC_KEYWORDS.reviews.some((k) => text.includes(k))) return "review";
  if (TOPIC_KEYWORDS.events.some((k) => text.includes(k))) return "gastro_event";
  if (TOPIC_KEYWORDS.trends.some((k) => text.includes(k))) return "trend";
  return fallback;
}

function inferTags(title: string, description: string, baseTags: string[]) {
  const text = `${title} ${description}`.toLowerCase();
  const inferred = new Set(baseTags.map((tag) => tag.toLowerCase()));
  const dictionary: Record<string, string[]> = {
    japonês: ["japones", "sushi", "izakaya"],
    italiano: ["italiano", "massa", "trattoria", "pizza"],
    brunch: ["brunch", "café da manhã"],
    vinho: ["vinho", "wine bar"],
    bar: ["bar", "coquetel", "drinks"],
    pinheiros: ["pinheiros"],
    itaim: ["itaim"],
    moema: ["moema"],
    jardins: ["jardins"],
    gratuito: ["gratuito", "gratis", "de graça"],
  };

  for (const [tag, keywords] of Object.entries(dictionary)) {
    if (keywords.some((keyword) => text.includes(keyword))) inferred.add(tag);
  }

  return Array.from(inferred);
}

function stableId(prefix: string, value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return `${prefix}-${Math.abs(hash)}`;
}

export function mapScrapedEventToRecommendation(
  event: {
    title: string;
    description: string;
    url: string;
    source: string;
    venue?: string;
    city?: string;
    date?: string | null;
    price?: number | null;
    category?: string;
    tags?: string[];
    image_url?: string | null;
    quality_score?: number;
    content_tier?: ContentTier;
  }
): RecommendationPayload {
  const tags = inferTags(event.title, event.description, event.tags || []);
  return {
    id: stableId(event.source, event.url || event.title),
    title: event.title.slice(0, 140),
    description: event.description.slice(0, 420) || `Evento em São Paulo — ${event.title}`,
    category: event.category || "event",
    domain: "events_exhibitions",
    content_tier: event.content_tier || "curated",
    city: event.city || "São Paulo",
    location: event.venue || "São Paulo",
    neighborhood: null,
    image_url: event.image_url || null,
    tags,
    source: event.source,
    editorial_source: event.source,
    url: event.url,
    booking_url: event.url,
    availability_kind: "event",
    quality_score: event.quality_score ?? 78,
    score: (event.quality_score ?? 78) / 10,
    price: event.price ?? null,
    start_time: event.date || null,
    profile_signals: tags.slice(0, 4),
    personalization_label: null,
    related_favorite: null,
  };
}

export function mapRssItemToRecommendation(
  item: RssItem,
  options: {
    sourceLabel: string;
    domain: RecommendationDomain;
    contentTier: ContentTier;
    baseTags?: string[];
    city?: string;
    categoryFallback?: string;
    qualityScore?: number;
  }
): RecommendationPayload {
  const title = item.title.trim();
  const description = item.description.slice(0, 420);
  const category = inferCategory(title, description, options.categoryFallback || "editorial");
  const tags = inferTags(title, description, options.baseTags || []);

  return {
    id: stableId("editorial", `${options.sourceLabel}:${item.guid || item.link}`),
    title,
    description: description || `Matéria de ${options.sourceLabel} sobre a cena gastronômica de São Paulo.`,
    category,
    domain: options.domain,
    content_tier: options.contentTier,
    city: options.city || "São Paulo",
    location: "São Paulo",
    neighborhood: null,
    image_url: item.image_url || null,
    tags,
    source: options.sourceLabel,
    editorial_source: options.sourceLabel,
    url: item.link,
    booking_url: item.link,
    availability_kind: options.domain === "events_exhibitions" ? "event" : "venue",
    quality_score: options.qualityScore ?? (options.contentTier === "signature" ? 88 : 78),
    score: options.qualityScore ?? (options.contentTier === "signature" ? 8.8 : 7.8),
    start_time: item.pubDate || null,
    profile_signals: tags.slice(0, 4),
    personalization_label: null,
    related_favorite: null,
  };
}

export function mapSnapshotItem(raw: Partial<RecommendationPayload>): RecommendationPayload {
  return {
    id: String(raw.id || stableId("snapshot", `${raw.title}:${raw.url}`)),
    title: String(raw.title || "Sem título"),
    description: String(raw.description || ""),
    category: String(raw.category || "editorial"),
    domain: (raw.domain as RecommendationDomain) || "dining_out",
    content_tier: raw.content_tier || "curated",
    city: raw.city || "São Paulo",
    location: raw.location || "São Paulo",
    neighborhood: raw.neighborhood || null,
    image_url: raw.image_url || null,
    tags: Array.isArray(raw.tags) ? raw.tags : [],
    source: String(raw.source || raw.editorial_source || "Guia SP"),
    editorial_source: raw.editorial_source || raw.source || null,
    url: raw.url || null,
    booking_url: raw.booking_url || raw.url || null,
    availability_kind: raw.availability_kind || "venue",
    quality_score: raw.quality_score ?? 80,
    score: raw.score ?? 8,
    price: raw.price ?? null,
    price_band: raw.price_band || null,
    start_time: raw.start_time || null,
    latitude: raw.latitude ?? null,
    longitude: raw.longitude ?? null,
    profile_signals: raw.profile_signals || [],
    personalization_label: raw.personalization_label || null,
    related_favorite: raw.related_favorite || null,
  };
}

export function filterByTopic<T extends { title: string; description?: string; category?: string; tags?: string[] }>(
  items: T[],
  topic: string
) {
  if (!topic || topic === "all") return items;
  const keywords = TOPIC_KEYWORDS[topic] || [];
  return items.filter((item) => {
    const text = `${item.title} ${item.description || ""} ${(item.tags || []).join(" ")} ${item.category || ""}`.toLowerCase();
    if (item.category === topic) return true;
    return keywords.some((keyword) => text.includes(keyword));
  });
}

export function dedupeRecommendations(items: RecommendationPayload[]) {
  const map = new Map<string, RecommendationPayload>();
  for (const item of items) {
    const key = `${item.title.toLowerCase()}|${item.url || ""}`;
    const existing = map.get(key);
    if (!existing || (item.quality_score || 0) > (existing.quality_score || 0)) {
      map.set(key, item);
    }
  }
  return Array.from(map.values());
}
