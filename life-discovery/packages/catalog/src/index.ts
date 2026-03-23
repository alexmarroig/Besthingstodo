import curatedSaoPauloCatalog from "../data/curated-editorial.sao-paulo.json";
import editorialExtensions from "../data/editorial-extensions.sao-paulo.json";
import officialSources from "../data/official-sources.json";

export type CatalogDomain = "dining_out" | "delivery" | "movies_series" | "events_exhibitions" | string;
export type AvailabilityKind = "venue" | "delivery" | "streaming" | "event";
export type ContentTier = "signature" | "curated" | "discovery";
export type IndoorOutdoor = "indoor" | "outdoor" | "mixed";

export type CatalogExperience = {
  title: string;
  slug: string;
  description: string;
  category: string;
  domain: CatalogDomain;
  city: string;
  location: string;
  neighborhood?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  image_url?: string | null;
  tags: string[];
  price?: number | null;
  url?: string | null;
  booking_url?: string | null;
  editorial_source?: string | null;
  content_tier?: ContentTier | null;
  quality_score?: number | null;
  availability_kind?: AvailabilityKind | null;
  price_band?: string | null;
  indoor_outdoor?: IndoorOutdoor | null;
};

export type CatalogSource = {
  name: string;
  kind: string;
  city: string;
  editorial_source: string;
  source_url: string;
};

export function getCuratedSaoPauloCatalog(): CatalogExperience[] {
  return [...(curatedSaoPauloCatalog as CatalogExperience[]), ...(editorialExtensions as CatalogExperience[])];
}

export function getOfficialSources(): CatalogSource[] {
  return officialSources as CatalogSource[];
}

export function buildCatalogFingerprint(item: Pick<CatalogExperience, "slug" | "title" | "location">): string {
  return `${item.slug || ""}::${item.title.toLowerCase()}::${item.location.toLowerCase()}`;
}

export function dedupeCatalog<T extends CatalogExperience>(items: T[]): T[] {
  const seen = new Set<string>();
  const deduped: T[] = [];
  for (const item of items) {
    const fingerprint = buildCatalogFingerprint(item);
    if (seen.has(fingerprint)) continue;
    seen.add(fingerprint);
    deduped.push(item);
  }
  return deduped;
}
