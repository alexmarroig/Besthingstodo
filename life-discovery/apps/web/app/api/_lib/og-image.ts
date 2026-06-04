import dns from "node:dns/promises";
import { isIP } from "node:net";

import { isUsableRecommendationImage } from "@/shared/recommendation-images";

const FETCH_HEADERS = {
  "User-Agent": "RoteiroADois/1.0 (+https://besthingstodo-plum.vercel.app)",
  Accept: "text/html,application/xhtml+xml",
};

function isPrivateIp(address: string) {
  if (!isIP(address)) return true;
  if (address === "127.0.0.1" || address === "::1" || address === "0.0.0.0") return true;
  if (address.startsWith("10.")) return true;
  if (address.startsWith("192.168.")) return true;
  if (address.startsWith("172.")) {
    const second = Number(address.split(".")[1]);
    if (second >= 16 && second <= 31) return true;
  }
  if (address.startsWith("169.254.")) return true;
  if (address.startsWith("fc") || address.startsWith("fd") || address.startsWith("fe80")) return true;
  return false;
}

async function assertPublicUrl(url: URL) {
  const hostname = url.hostname.toLowerCase();
  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.includes("metadata.google")
  ) {
    throw new Error("blocked_host");
  }

  if (isIP(hostname)) {
    if (isPrivateIp(hostname)) throw new Error("blocked_ip");
    return;
  }

  const records = await dns.lookup(hostname, { all: true });
  if (!records.length) throw new Error("dns_failed");
  for (const record of records) {
    if (isPrivateIp(record.address)) throw new Error("blocked_ip");
  }
}

function normalizeLookupText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function wikiTitleMatchesQuery(pageTitle: string, query: string) {
  const title = normalizeLookupText(pageTitle);
  const tokens = normalizeLookupText(query)
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 4);
  if (!tokens.length) return true;
  return tokens.some((token) => title.includes(token));
}

function extractJsonLdImages(html: string, pageUrl: URL) {
  const scripts = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || [];
  for (const block of scripts) {
    const payload = block.replace(/<\/?script[^>]*>/gi, "").trim();
    if (!payload) continue;
    try {
      const parsed = JSON.parse(payload);
      const nodes = Array.isArray(parsed) ? parsed : parsed["@graph"] ? parsed["@graph"] : [parsed];
      for (const node of nodes) {
        const image = node?.image;
        if (typeof image === "string") {
          const resolved = new URL(image, pageUrl);
          if (resolved.protocol.startsWith("http") && isUsableRecommendationImage(resolved.toString())) {
            return resolved.toString();
          }
        }
        if (image?.url && typeof image.url === "string") {
          const resolved = new URL(image.url, pageUrl);
          if (resolved.protocol.startsWith("http") && isUsableRecommendationImage(resolved.toString())) {
            return resolved.toString();
          }
        }
        if (Array.isArray(image) && typeof image[0] === "string") {
          const resolved = new URL(image[0], pageUrl);
          if (resolved.protocol.startsWith("http") && isUsableRecommendationImage(resolved.toString())) {
            return resolved.toString();
          }
        }
      }
    } catch {
      continue;
    }
  }
  return null;
}

export function extractImageUrlFromHtml(html: string, pageUrl: URL) {
  const patterns = [
    /<meta[^>]+property=["']og:image:secure_url["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
    /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+property=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
    /<link[^>]+rel=["'][^"']*image_src["'][^>]+href=["']([^"']+)["']/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (!match?.[1]) continue;
    try {
      const resolved = new URL(match[1], pageUrl);
      if ((resolved.protocol === "http:" || resolved.protocol === "https:") && isUsableRecommendationImage(resolved.toString())) {
        return resolved.toString();
      }
    } catch {
      continue;
    }
  }

  const jsonLdImage = extractJsonLdImages(html, pageUrl);
  if (jsonLdImage) return jsonLdImage;

  return null;
}

export async function fetchOgImageFromUrl(target: string, timeoutMs = 4500): Promise<string | null> {
  let pageUrl: URL;
  try {
    pageUrl = new URL(target);
  } catch {
    return null;
  }

  if (pageUrl.protocol !== "http:" && pageUrl.protocol !== "https:") return null;

  try {
    await assertPublicUrl(pageUrl);
  } catch {
    return null;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(pageUrl.toString(), {
      headers: FETCH_HEADERS,
      signal: controller.signal,
      redirect: "follow",
      next: { revalidate: 86400 },
    });

    if (!res.ok) return null;

    const finalUrl = new URL(res.url);
    if (finalUrl.protocol !== "http:" && finalUrl.protocol !== "https:") return null;
    try {
      await assertPublicUrl(finalUrl);
    } catch {
      return null;
    }

    const html = await res.text();
    const slice = html.slice(0, 350_000);
    const imageUrl = extractImageUrlFromHtml(slice, finalUrl);
    if (!imageUrl || !isUsableRecommendationImage(imageUrl)) return null;

    const imageParsed = new URL(imageUrl);
    if (imageParsed.protocol !== "http:" && imageParsed.protocol !== "https:") return null;
    try {
      await assertPublicUrl(imageParsed);
    } catch {
      return null;
    }

    return imageUrl;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchWikipediaThumbnail(
  query: string,
  options?: { validateAgainst?: string; city?: string }
): Promise<string | null> {
  const primary = query.trim().split(/[+—–-]/)[0]?.trim() || query.trim();
  const term = primary.slice(0, 80);
  if (term.length < 3) return null;

  const searchParams = new URLSearchParams({
    action: "query",
    format: "json",
    origin: "*",
    list: "search",
    srsearch: term,
    srlimit: "3",
    utf8: "1",
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);

  try {
    const searchRes = await fetch(`https://pt.wikipedia.org/w/api.php?${searchParams}`, {
      signal: controller.signal,
      next: { revalidate: 604800 },
    });
    if (!searchRes.ok) return null;

    const searchData = await searchRes.json();
    const hits = searchData?.query?.search || [];
    const validateAgainst = options?.validateAgainst || query;
    const match = hits.find((row: { title?: string }) => wikiTitleMatchesQuery(row.title || "", validateAgainst)) || hits[0];
    const pageId = match?.pageid;
    if (!pageId) return null;

    const imageParams = new URLSearchParams({
      action: "query",
      format: "json",
      origin: "*",
      pageids: String(pageId),
      prop: "pageimages",
      piprop: "thumbnail",
      pithumbsize: "900",
    });

    const imageRes = await fetch(`https://pt.wikipedia.org/w/api.php?${imageParams}`, {
      signal: controller.signal,
      next: { revalidate: 604800 },
    });
    if (!imageRes.ok) return null;

    const imageData = await imageRes.json();
    const thumb = imageData?.query?.pages?.[String(pageId)]?.thumbnail?.source;
    return typeof thumb === "string" && isUsableRecommendationImage(thumb) ? thumb : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
