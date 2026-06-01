import { readFile } from "node:fs/promises";
import path from "node:path";

import { dedupeRecommendations, mapSnapshotItem, type RecommendationPayload } from "./recommendation-mapper";

export async function loadJsonSnapshot(fileName: string) {
  try {
    const filePath = path.join(process.cwd(), "public", "data", fileName);
    const raw = await readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as Array<Record<string, unknown>>;
    return parsed.map((item) => mapSnapshotItem(item));
  } catch {
    return [];
  }
}

export async function loadLocalRestaurants() {
  return loadJsonSnapshot("sp-restaurants.json");
}

export async function loadLocalEvents() {
  const [sympla, gastro] = await Promise.all([
    loadJsonSnapshot("sympla-events.json"),
    loadJsonSnapshot("gastro-events.json"),
  ]);
  return dedupeRecommendations([...gastro, ...sympla]);
}
