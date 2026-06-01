import type { RecommendationPayload } from "./recommendation-mapper";

const STREET_PREFIX =
  /^(rua|av\.?|avenida|alameda|estrada|travessa|pra[cç]a|rodovia|via|largo|passagem|viela|estr\.)\b/i;

const GENERIC_NAMES = /^(local|sem t[ií]tulo|restaurante|caf[eé]|bar|fast food|food)$/i;

export function looksLikeStreetName(value: string) {
  return STREET_PREFIX.test(value.trim());
}

export function isValidPlaceName(name?: string | null) {
  const trimmed = (name || "").trim();
  if (trimmed.length < 3) return false;
  if (GENERIC_NAMES.test(trimmed)) return false;
  if (looksLikeStreetName(trimmed)) return false;
  if (/^\d/.test(trimmed)) return false;
  return true;
}

export function buildPlaceDescription(name: string, props: Record<string, any>) {
  const parts = [props.suburb || props.district, props.city, props.address_line1]
    .filter(Boolean)
    .map(String);
  const unique = Array.from(new Set(parts));
  return unique.length ? `${name} · ${unique.join(", ")}` : name;
}

export function filterValidPlaces(items: RecommendationPayload[]) {
  return items.filter((item) => isValidPlaceName(item.title));
}

export function mergePlaces(localItems: RecommendationPayload[], remoteItems: RecommendationPayload[], limit = 18) {
  const merged = new Map<string, RecommendationPayload>();
  for (const item of [...localItems, ...remoteItems]) {
    const key = item.title.toLowerCase().trim();
    const existing = merged.get(key);
    if (!existing || (item.quality_score || 0) > (existing.quality_score || 0)) {
      merged.set(key, item);
    }
  }
  return Array.from(merged.values())
    .sort((a, b) => (b.quality_score || 0) - (a.quality_score || 0))
    .slice(0, limit);
}
