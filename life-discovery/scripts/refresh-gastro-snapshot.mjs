import { XMLParser } from "fast-xml-parser";
import { writeFile } from "node:fs/promises";
import path from "node:path";

const FEEDS = [
  { label: "Catraca Livre", url: "https://catracalivre.com.br/feed/" },
  { label: "Folha Comer & Beber", url: "https://feeds.folha.uol.com.br/emscmp/reservado/comerdabem/rss091.xml" },
  { label: "Estadão Paladar", url: "https://www.estadao.com.br/paladar/rss" },
  { label: "Exame Casual", url: "https://exame.com/feed/rss" },
];

const parser = new XMLParser({ ignoreAttributes: false, trimValues: true });

async function fetchFeed(url: string) {
  const res = await fetch(url, {
    headers: { "User-Agent": "RoteiroADois/1.0" },
  });
  if (!res.ok) return [];
  const xml = await res.text();
  const parsed = parser.parse(xml);
  const channel = parsed?.rss?.channel || parsed?.feed;
  const items = Array.isArray(channel?.item) ? channel.item : channel?.item ? [channel.item] : [];
  return items.map((item: any) => ({
    title: String(item.title || "").trim(),
    link: String(item.link || item.guid || "").trim(),
    description: String(item.description || item.summary || "").replace(/<[^>]+>/g, " ").slice(0, 420),
  }));
}

async function main() {
  const snapshot = [];
  for (const feed of FEEDS) {
    try {
      const items = await fetchFeed(feed.url);
      for (const item of items.slice(0, 8)) {
        if (!item.title || !item.link) continue;
        snapshot.push({
          id: `snapshot-${feed.label.toLowerCase().replace(/\s+/g, "-")}-${Math.abs(hashCode(item.link))}`,
          title: item.title,
          description: item.description || `Matéria de ${feed.label}.`,
          category: "editorial",
          domain: "dining_out",
          content_tier: feed.label.includes("Paladar") || feed.label.includes("Folha") ? "signature" : "curated",
          city: "São Paulo",
          location: "São Paulo",
          tags: ["gastronomia", feed.label.toLowerCase()],
          source: feed.label,
          editorial_source: feed.label,
          url: item.link,
          quality_score: 82,
        });
      }
      console.log(`[ok] ${feed.label}: ${items.length} items`);
    } catch (error) {
      console.warn(`[warn] ${feed.label}:`, error);
    }
  }

  const outPath = path.join(process.cwd(), "apps", "web", "public", "data", "gastro-editorial.json");
  await writeFile(outPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
  console.log(`Wrote ${snapshot.length} items to ${outPath}`);
}

function hashCode(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) hash = (hash << 5) - hash + value.charCodeAt(i);
  return hash;
}

main();
