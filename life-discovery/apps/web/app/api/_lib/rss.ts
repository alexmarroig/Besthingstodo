import { XMLParser } from "fast-xml-parser";

export type RssItem = {
  title: string;
  link: string;
  description: string;
  pubDate?: string;
  guid?: string;
  image_url?: string | null;
};

const RSS_HEADERS = {
  "User-Agent": "RoteiroADois/1.0 (+https://besthingstodo-plum.vercel.app)",
  Accept: "application/rss+xml, application/xml, text/xml, application/atom+xml, */*",
};

function stripHtml(value: string) {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function asArray<T>(value: T | T[] | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function readText(node: unknown): string {
  if (typeof node === "string") return node.trim();
  if (node && typeof node === "object" && "#text" in node) {
    return String((node as { "#text"?: string })["#text"] || "").trim();
  }
  return "";
}

function readAttr(node: unknown, key: string): string {
  if (!node || typeof node !== "object") return "";
  const value = (node as Record<string, string>)[key];
  return typeof value === "string" ? value.trim() : "";
}

function extractImageFromHtml(html: string) {
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (!match?.[1]) return null;
  try {
    const url = new URL(match[1]);
    if (url.protocol === "http:" || url.protocol === "https:") return url.toString();
  } catch {
    return null;
  }
  return null;
}

function extractRssImage(item: Record<string, unknown>, descriptionHtml: string) {
  const fromHtml = extractImageFromHtml(descriptionHtml);
  if (fromHtml) return fromHtml;

  const mediaThumb = item["media:thumbnail"];
  const thumbUrl = readAttr(mediaThumb, "url") || readText(mediaThumb);
  if (thumbUrl) return thumbUrl;

  const mediaContent = item["media:content"];
  const contentUrl = readAttr(mediaContent, "url") || readText(mediaContent);
  if (contentUrl && /\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(contentUrl)) return contentUrl;

  const enclosure = item.enclosure;
  const enclosureUrl = readAttr(enclosure, "url") || readText(enclosure);
  if (enclosureUrl && /\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(enclosureUrl)) return enclosureUrl;

  return null;
}

export async function fetchRssFeed(url: string, timeoutMs = 8000): Promise<RssItem[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      headers: RSS_HEADERS,
      signal: controller.signal,
      next: { revalidate: 900 },
    });
    if (!res.ok) return [];

    const xml = await res.text();
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "",
      trimValues: true,
    });
    const parsed = parser.parse(xml);
    const channel = parsed?.rss?.channel || parsed?.feed;
    if (!channel) return [];

    const rawItems = asArray(channel.item || channel.entry);
    return rawItems
      .map((item: Record<string, unknown>) => {
        const title = readText(item.title);
        const link =
          readText(item.link) ||
          (typeof item.link === "object" && item.link !== null
            ? readText((item.link as { href?: string }).href)
            : "") ||
          readText(item.guid);
        const rawDescription =
          readText(item.description) ||
          readText(item.summary) ||
          readText(item.content) ||
          readText(item["content:encoded"]);
        const description = stripHtml(rawDescription);
        const image_url = extractRssImage(item, rawDescription);
        const pubDate =
          readText(item.pubDate) ||
          readText(item.published) ||
          readText(item.updated) ||
          undefined;
        const guid = readText(item.guid) || link || title;
        return { title, link, description, pubDate, guid, image_url };
      })
      .filter((item) => item.title.length >= 6 && item.link.length > 0);
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchManyRssFeeds(urls: string[], limitPerFeed = 15): Promise<RssItem[]> {
  const batches = await Promise.all(urls.map((url) => fetchRssFeed(url)));
  const merged: RssItem[] = [];
  const seen = new Set<string>();

  for (const batch of batches) {
    for (const item of batch.slice(0, limitPerFeed)) {
      const key = (item.guid || item.link || item.title).toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(item);
    }
  }

  return merged;
}
