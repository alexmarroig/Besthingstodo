import { readFile } from "node:fs/promises";
import path from "node:path";

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

export async function loadDailySnapshotFromSupabase(domain: string, city = "São Paulo") {
  const projectUrl = process.env.SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!projectUrl || !serviceRole) return [];

  const normalizedDomain = normalizeDomain(domain);
  try {
    const url = `${projectUrl}/rest/v1/daily_recommendation_snapshots?select=payload&domain=eq.${encodeURIComponent(normalizedDomain)}&city=ilike.${encodeURIComponent(city)}&order=snapshot_date.desc&limit=1`;
    const res = await fetch(url, {
      headers: {
        apikey: serviceRole,
        Authorization: `Bearer ${serviceRole}`,
      },
      cache: "no-store",
    });
    if (!res.ok) return [];
    const rows = (await res.json()) as Array<{ payload?: Array<Record<string, unknown>> }>;
    if (!rows?.length || !Array.isArray(rows[0]?.payload)) return [];
    return rows[0].payload.map((item) => mapSnapshotItem(item as Partial<RecommendationPayload>));
  } catch {
    return [];
  }
}

export async function loadDailySource(domain: string, city = "São Paulo") {
  const fromSupabase = await loadDailySnapshotFromSupabase(domain, city);
  if (fromSupabase.length > 0) return fromSupabase;
  return loadDailySnapshot(domain, city);
}
