import { readFile } from "node:fs/promises";
import path from "node:path";
import { database } from "@/server/db";

import { mapSnapshotItem, type RecommendationPayload } from "./recommendation-mapper";

type SnapshotFile = {
  generated_at: string;
  items: Array<Record<string, unknown>>;
};

async function loadSnapshotFile(): Promise<SnapshotFile | null> {
  try {
    const filePath = path.join(process.cwd(), "public", "data", "daily-snapshot.json");
    const raw = await readFile(filePath, "utf8");
    return JSON.parse(raw) as SnapshotFile;
  } catch {
    return null;
  }
}

function normalizeDomain(domain: string) {
  if (domain === "events") return "events_exhibitions";
  if (domain === "places") return "dining_out";
  if (domain === "gastro") return "dining_out";
  return domain;
}

export async function loadDailySnapshot(domain: string, city = "São Paulo") {
  const snapshot = await loadSnapshotFile();
  if (!snapshot?.items?.length) return [];
  const normalizedDomain = normalizeDomain(domain);
  const cityNeedle = city.toLowerCase();
  return snapshot.items
    .map((item) => mapSnapshotItem(item as Partial<RecommendationPayload>))
    .filter((item) => item.domain === normalizedDomain)
    .filter((item) => (item.city || "São Paulo").toLowerCase().includes(cityNeedle))
    .slice(0, 40);
}

export async function loadDailySnapshotFromNeon(domain: string, city = "São Paulo") {
  if (!process.env.DATABASE_URL && !process.env.DATABASE_URL_POOLED) return [];
  const normalizedDomain = normalizeDomain(domain);
  try {
    const sql = database();
    const rows = await sql`SELECT items FROM catalog_sources WHERE domain=${normalizedDomain} AND lower(city)=lower(${city}) AND jsonb_array_length(items)>0 ORDER BY last_success_at DESC NULLS LAST`;
    const seen = new Set<string>();
    return rows.flatMap(row => Array.isArray(row.items) ? row.items : []).map(item => mapSnapshotItem(item))
      .filter(item => { if (seen.has(item.id)) return false; seen.add(item.id); return true; }).slice(0, 100);
  } catch {
    return [];
  }
}

export async function loadDailySource(domain: string, city = "São Paulo") {
  const fromNeon = await loadDailySnapshotFromNeon(domain, city);
  if (fromNeon.length > 0) return fromNeon;
  return loadDailySnapshot(domain, city);
}
