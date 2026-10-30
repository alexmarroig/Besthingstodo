import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, "apps", "web", "public", "data");
const SNAPSHOT_PATH = path.join(DATA_DIR, "daily-snapshot.json");
const RUN_PATH = path.join(DATA_DIR, "ingestion-runs.json");

async function readJson(filePath, fallback) {
  try {
    const raw = await readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function resolveDefaultLocalImage(item, domain) {
  const hay = [item.title, item.description, item.category, ...(Array.isArray(item.tags) ? item.tags : [])]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  if (hay.includes("pizza") || hay.includes("braz")) return "/images/venues/braz-pizzaria.jpg";
  if (hay.includes("sushi") || hay.includes("japon") || hay.includes("omakase")) return "/images/venues/sushi-vaz.jpg";
  if (hay.includes("vinho") || hay.includes("wine")) return "/images/venues/sede-261.jpg";
  if (hay.includes("cafe") || hay.includes("café") || hay.includes("padaria")) return "/images/venues/coffee-lab.jpg";
  if (domain === "events_exhibitions") return "/images/venues/ibirapuera.jpg";
  if (domain === "delivery") return "/images/venues/z-deli.jpg";
  return "/images/venues/mani.jpg";
}

function normalizeItem(item, domain) {
  return {
    id: item.id,
    title: item.title,
    description: item.description || "",
    category: item.category || "editorial",
    domain,
    city: item.city || "São Paulo",
    location: item.location || "São Paulo",
    neighborhood: item.neighborhood || null,
    tags: Array.isArray(item.tags) ? item.tags : [],
    source: item.source || item.editorial_source || "Data Hub",
    editorial_source: item.editorial_source || null,
    image_url: item.image_url || resolveDefaultLocalImage(item, domain),
    cta_url: item.booking_url || item.url || null,
    quality_score: item.quality_score ?? 70,
    payload: item,
  };
}

function dedupe(items) {
  const map = new Map();
  for (const item of items) {
    const key = `${String(item.domain).toLowerCase()}|${String(item.title).toLowerCase()}|${String(item.city).toLowerCase()}`;
    const existing = map.get(key);
    if (!existing || (item.quality_score || 0) > (existing.quality_score || 0)) {
      map.set(key, item);
    }
  }
  return [...map.values()];
}

async function pushSnapshotToNeon(snapshots) {
  const connection=process.env.DATABASE_URL_POOLED || process.env.DATABASE_URL;
  if(!connection)return {pushed:false,reason:"missing_env"};
  const require=createRequire(new URL('../apps/web/package.json',import.meta.url));
  const {neon}=require('@neondatabase/serverless'); const sql=neon(connection);
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo'}).format(new Date());
  for(const snapshot of snapshots) {
    const key='manual:'+snapshot.domain+':'+snapshot.city;
    await sql.query('INSERT INTO catalog_sources(source_key,domain,city,items,last_success_at) VALUES ($1,$2,$3,$4::jsonb,now()) ON CONFLICT(source_key) DO UPDATE SET items=excluded.items,last_success_at=now()', [key,snapshot.domain,snapshot.city,JSON.stringify(snapshot.items)]);
    await sql.query('INSERT INTO catalog_snapshots(source_key,snapshot_date,domain,city,items) VALUES ($1,$2,$3,$4,$5::jsonb) ON CONFLICT(source_key,snapshot_date) DO UPDATE SET items=excluded.items', [key,today,snapshot.domain,snapshot.city,JSON.stringify(snapshot.items)]);
  }
  return {pushed:true};
}

async function main() {
  const runStartedAt = new Date().toISOString();
  const today = runStartedAt.slice(0, 10);
  const runs = await readJson(RUN_PATH, []);

  const [gastroEditorial, gastroEvents, symplaEvents, restaurants] = await Promise.all([
    readJson(path.join(DATA_DIR, "gastro-editorial.json"), []),
    readJson(path.join(DATA_DIR, "gastro-events.json"), []),
    readJson(path.join(DATA_DIR, "sympla-events.json"), []),
    readJson(path.join(DATA_DIR, "sp-restaurants.json"), []),
  ]);

  const snapshots = [
    {
      domain: "dining_out",
      city: "São Paulo",
      items: dedupe([
        ...gastroEditorial.map((item) => normalizeItem(item, "dining_out")),
        ...restaurants
          .filter((item) => item.domain === "dining_out")
          .map((item) => normalizeItem(item, "dining_out")),
      ]),
    },
    {
      domain: "events_exhibitions",
      city: "São Paulo",
      items: dedupe([
        ...gastroEvents.map((item) => normalizeItem(item, "events_exhibitions")),
        ...symplaEvents.map((item) => normalizeItem(item, "events_exhibitions")),
      ]),
    },
    {
      domain: "delivery",
      city: "São Paulo",
      items: dedupe(
        restaurants
          .filter((item) => item.domain === "delivery" || item.availability_kind === "delivery")
          .map((item) => normalizeItem(item, "delivery"))
      ),
    },
  ];

  const flattened = snapshots.flatMap((snapshot) => snapshot.items);
  await writeFile(
    SNAPSHOT_PATH,
    `${JSON.stringify({ generated_at: runStartedAt, items: flattened }, null, 2)}\n`,
    "utf8"
  );

  const neonResult = await pushSnapshotToNeon(snapshots);
  const run = {
    run_date: today,
    status: "ok",
    generated_at: runStartedAt,
    stats: {
      total_items: flattened.length,
      dining_out: snapshots[0].items.length,
      events_exhibitions: snapshots[1].items.length,
      delivery: snapshots[2].items.length,
    },
    neon: neonResult,
  };

  runs.unshift(run);
  await writeFile(RUN_PATH, `${JSON.stringify(runs.slice(0, 60), null, 2)}\n`, "utf8");
  console.log(`[ok] daily snapshot generated (${flattened.length} items)`);
}

main().catch(async (error) => {
  const runs = await readJson(RUN_PATH, []);
  runs.unshift({
    run_date: new Date().toISOString().slice(0, 10),
    status: "failed",
    error_message: String(error?.message || error),
    generated_at: new Date().toISOString(),
  });
  await writeFile(RUN_PATH, `${JSON.stringify(runs.slice(0, 60), null, 2)}\n`, "utf8");
  console.error(error);
  process.exit(1);
});
