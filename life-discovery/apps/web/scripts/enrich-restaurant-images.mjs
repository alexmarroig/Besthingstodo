import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const file = path.join(__dirname, "../public/data/sp-restaurants.json");
const items = JSON.parse(fs.readFileSync(file, "utf8"));

const FETCH_HEADERS = {
  "User-Agent": "RoteiroADois/1.0 (+https://besthingstodo-plum.vercel.app)",
  Accept: "text/html,application/xhtml+xml",
};

function extractImageUrlFromHtml(html, pageUrl) {
  const patterns = [
    /<meta[^>]+property=["']og:image:secure_url["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
    /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (!match?.[1]) continue;
    try {
      const resolved = new URL(match[1], pageUrl);
      if (resolved.protocol === "http:" || resolved.protocol === "https:") {
        return resolved.toString();
      }
    } catch {
      continue;
    }
  }
  return null;
}

async function fetchOgImageFromUrl(target) {
  const pageUrl = new URL(target);
  const res = await fetch(pageUrl.toString(), { headers: FETCH_HEADERS, redirect: "follow" });
  if (!res.ok) return null;
  const html = await res.text();
  return extractImageUrlFromHtml(html.slice(0, 350_000), new URL(res.url));
}

for (const item of items) {
  if (item.image_url || !item.url) continue;
  try {
    const image = await fetchOgImageFromUrl(item.url);
    if (image) {
      item.image_url = image;
      console.log("OK", item.title);
    } else {
      console.log("MISS", item.title);
    }
  } catch (error) {
    console.log("ERR", item.title, error.message);
  }
}

fs.writeFileSync(file, `${JSON.stringify(items, null, 2)}\n`);
console.log("done");
