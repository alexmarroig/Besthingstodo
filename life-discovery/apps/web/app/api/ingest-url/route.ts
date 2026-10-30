import { NextRequest, NextResponse } from "next/server";
import {
  resolveContextualLocalImage,
  resolveKnownVenueImageForItem,
} from "../_lib/known-venue-images";

const SP_NEIGHBORHOODS = [
  "Pinheiros",
  "Vila Madalena",
  "Jardins",
  "Paulista",
  "Bela Vista",
  "Consolação",
  "Higienópolis",
  "Santa Cecília",
  "Vila Mariana",
  "Ibirapuera",
  "Moema",
  "Campo Belo",
  "Itaim Bibi",
  "Vila Olímpia",
  "Brooklin",
  "Centro",
  "República",
  "Liberdade",
  "Perdizes",
  "Pompeia",
  "Mooca",
  "Tatuapé",
  "Santana",
  "Butantã",
];

function decodeHtmlEntities(input: string): string {
  if (!input) return "";
  return input
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&nbsp;/gi, " ")
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)))
    .replace(/\s+/g, " ")
    .trim();
}

function isSafeExternalUrl(raw: string): URL | null {
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    const host = parsed.hostname.toLowerCase();
    if (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "0.0.0.0" ||
      host.startsWith("192.168.") ||
      host.startsWith("10.") ||
      host.endsWith(".local")
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function extractMetaContent(html: string, attrValue: string): string | null {
  const escaped = attrValue.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${escaped}["']`, "i"),
  ];
  for (const regex of patterns) {
    const match = html.match(regex);
    if (match?.[1]) return decodeHtmlEntities(match[1]);
  }
  return null;
}

function extractJsonLdData(html: string): {
  title?: string;
  description?: string;
  image?: string;
  neighborhood?: string;
  price?: number | null;
  rating?: number | null;
  type?: string;
} {
  const scriptRegex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  while ((match = scriptRegex.exec(html)) !== null) {
    try {
      const raw = match[1].trim();
      const parsed = JSON.parse(raw);
      const candidates = Array.isArray(parsed)
        ? parsed
        : parsed["@graph"] && Array.isArray(parsed["@graph"])
          ? parsed["@graph"]
          : [parsed];

      for (const node of candidates) {
        if (!node || typeof node !== "object") continue;
        const name = typeof node.name === "string" ? decodeHtmlEntities(node.name) : undefined;
        const description =
          typeof node.description === "string" ? decodeHtmlEntities(node.description) : undefined;
        let image: string | undefined;
        if (typeof node.image === "string") image = node.image;
        else if (Array.isArray(node.image) && typeof node.image[0] === "string") image = node.image[0];
        else if (node.image && typeof node.image.url === "string") image = node.image.url;

        const address = node.address || node.location?.address;
        const locality =
          typeof address?.addressLocality === "string"
            ? address.addressLocality
            : typeof address?.streetAddress === "string"
              ? address.streetAddress
              : undefined;

        const rating = node.aggregateRating?.ratingValue
          ? Number(node.aggregateRating.ratingValue)
          : null;

        const price = node.offers?.price ? Number(node.offers.price) : null;

        if (name || image || description) {
          return {
            title: name,
            description,
            image,
            neighborhood: locality,
            price: Number.isFinite(price) ? price : null,
            rating: Number.isFinite(rating) ? rating : null,
            type: Array.isArray(node["@type"]) ? node["@type"][0] : node["@type"],
          };
        }
      }
    } catch {
      // Ignore malformed JSON-LD blocks
    }
  }
  return {};
}

function inferClassification(text: string): {
  domain: "dining_out" | "events_exhibitions" | "movies_series" | "delivery";
  category: string;
  tags: string[];
  indoor_outdoor: "indoor" | "outdoor" | "mixed";
} {
  const lower = text.toLowerCase();

  if (
    lower.includes("filme") ||
    lower.includes("cinema") ||
    lower.includes("série") ||
    lower.includes("serie") ||
    lower.includes("tmdb") ||
    lower.includes("imdb") ||
    lower.includes("adorocinema") ||
    lower.includes("omelete") ||
    lower.includes("streaming")
  ) {
    return {
      domain: "movies_series",
      category: lower.includes("série") || lower.includes("serie") ? "series" : "movie",
      tags: ["cinema", "assistir juntos", "curadoria web"],
      indoor_outdoor: "indoor",
    };
  }

  if (
    lower.includes("restaurante") ||
    lower.includes("trattoria") ||
    lower.includes("osteria") ||
    lower.includes("bistrô") ||
    lower.includes("bistro") ||
    lower.includes("pizzaria") ||
    lower.includes("sushi") ||
    lower.includes("omakase") ||
    lower.includes("izakaya") ||
    lower.includes("jantar") ||
    lower.includes("gastronomia") ||
    lower.includes("cardápio") ||
    lower.includes("menu") ||
    lower.includes("michelin")
  ) {
    const tags = ["gastronomia", "jantar", "descoberta"];
    if (lower.includes("ital")) tags.push("italiana");
    if (lower.includes("japon") || lower.includes("sushi")) tags.push("japonesa");
    if (lower.includes("pizza")) tags.push("pizza");
    if (lower.includes("vinho")) tags.push("vinho");
    return {
      domain: "dining_out",
      category: "restaurant",
      tags,
      indoor_outdoor: "indoor",
    };
  }

  if (
    lower.includes("café") ||
    lower.includes("cafe") ||
    lower.includes("padaria") ||
    lower.includes("brunch") ||
    lower.includes("confeitaria")
  ) {
    return {
      domain: "dining_out",
      category: "cafe",
      tags: ["café", "conversa boa", "aconchegante"],
      indoor_outdoor: "indoor",
    };
  }

  if (lower.includes("livraria") || lower.includes("biblioteca") || lower.includes("livro")) {
    return {
      domain: "events_exhibitions",
      category: "bookstore",
      tags: ["livraria", "cultura", "calmo"],
      indoor_outdoor: "indoor",
    };
  }

  if (lower.includes("parque") || lower.includes("jardim") || lower.includes("ar livre")) {
    return {
      domain: "events_exhibitions",
      category: "park",
      tags: ["ar livre", "passeio", "natureza"],
      indoor_outdoor: "outdoor",
    };
  }

  if (lower.includes("delivery") || lower.includes("ifood") || lower.includes("entrega")) {
    return {
      domain: "delivery",
      category: "delivery",
      tags: ["delivery", "em casa", "conforto"],
      indoor_outdoor: "indoor",
    };
  }

  return {
    domain: "events_exhibitions",
    category: lower.includes("museu") || lower.includes("exposição") ? "museum" : "cultural",
    tags: ["cultura", "evento", "são paulo"],
    indoor_outdoor: "indoor",
  };
}

function detectNeighborhood(text: string): string {
  const lower = text.toLowerCase();
  for (const nb of SP_NEIGHBORHOODS) {
    if (lower.includes(nb.toLowerCase())) return nb;
  }
  return "São Paulo";
}

function humanizeSlug(url: URL): string {
  const segments = url.pathname.split("/").filter(Boolean);
  const last = segments[segments.length - 1] || url.hostname.replace(/^www\./, "");
  return last
    .replace(/\.(html?|php|aspx)$/i, "")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase())
    .trim();
}

async function searchWikipediaAndOSM(query: string) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2400);

  try {
    const wikiUrl = `https://pt.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(
      `${query} São Paulo`
    )}&gsrlimit=1&prop=pageimages|extracts&exintro=1&explaintext=1&exchars=260&piprop=thumbnail&pithumbsize=900&format=json&origin=*`;

    const osmUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
      `${query}, São Paulo, Brazil`
    )}&format=json&limit=1&addressdetails=1`;

    const [wikiRes, osmRes] = await Promise.allSettled([
      fetch(wikiUrl, {
        signal: controller.signal,
        headers: { "User-Agent": "LifeDiscoveryApp/2.0 (SaoPaulo Cultural Concierge)" },
      }),
      fetch(osmUrl, {
        signal: controller.signal,
        headers: { "User-Agent": "LifeDiscoveryApp/2.0 (SaoPaulo Cultural Concierge)" },
      }),
    ]);

    let title: string | undefined;
    let description: string | undefined;
    let image: string | undefined;
    let neighborhood: string | undefined;
    let latitude: number | null = null;
    let longitude: number | null = null;

    if (wikiRes.status === "fulfilled" && wikiRes.value.ok) {
      const data = await wikiRes.value.json();
      const pages = data?.query?.pages ? Object.values(data.query.pages) : [];
      const firstPage = pages[0] as any;
      if (firstPage) {
        title = firstPage.title;
        description = firstPage.extract;
        image = firstPage.thumbnail?.source;
      }
    }

    if (osmRes.status === "fulfilled" && osmRes.value.ok) {
      const osmData = await osmRes.value.json();
      const firstOsm = Array.isArray(osmData) ? osmData[0] : null;
      if (firstOsm) {
        latitude = firstOsm.lat ? Number(firstOsm.lat) : null;
        longitude = firstOsm.lon ? Number(firstOsm.lon) : null;
        neighborhood =
          firstOsm.address?.suburb ||
          firstOsm.address?.neighbourhood ||
          firstOsm.address?.city_district ||
          undefined;
        if (!title && firstOsm.name) title = firstOsm.name;
      }
    }

    return { title, description, image, neighborhood, latitude, longitude };
  } catch {
    return {};
  } finally {
    clearTimeout(timer);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawQuery = String(body?.query || "").trim();
    const city = String(body?.city || "São Paulo").trim();

    if (!rawQuery || rawQuery.length < 2) {
      return NextResponse.json(
        { error: "Informe um link (URL) ou o nome de um lugar, restaurante, filme ou exposição." },
        { status: 400 }
      );
    }

    const parsedUrl = isSafeExternalUrl(rawQuery);
    let title = "";
    let description = "";
    let externalImage: string | null = null;
    let sourceLabel = "Captura Inteligente";
    let neighborhood = "";
    let price: number | null = null;
    let rating: number | null = null;
    let latitude: number | null = null;
    let longitude: number | null = null;
    let finalUrl: string | null = parsedUrl ? parsedUrl.toString() : null;

    if (parsedUrl) {
      sourceLabel = parsedUrl.hostname.replace(/^www\./i, "");
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3200);

      try {
        const response = await fetch(parsedUrl.toString(), {
          signal: controller.signal,
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8",
          },
        });

        if (response.ok) {
          const html = (await response.text()).slice(0, 180_000);
          const jsonLd = extractJsonLdData(html);

          const ogTitle =
            extractMetaContent(html, "og:title") ||
            extractMetaContent(html, "twitter:title") ||
            jsonLd.title;
          const titleTagMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
          const fallbackTitle = titleTagMatch?.[1] ? decodeHtmlEntities(titleTagMatch[1]) : "";

          title = (ogTitle || fallbackTitle || humanizeSlug(parsedUrl))
            .split(/\s+[|—–-]\s+/)[0]
            .trim();

          description =
            extractMetaContent(html, "og:description") ||
            extractMetaContent(html, "twitter:description") ||
            extractMetaContent(html, "description") ||
            jsonLd.description ||
            "";

          const rawImg =
            extractMetaContent(html, "og:image") ||
            extractMetaContent(html, "twitter:image") ||
            jsonLd.image ||
            null;

          if (rawImg) {
            try {
              externalImage = new URL(rawImg, parsedUrl.origin).toString();
            } catch {
              externalImage = null;
            }
          }

          if (jsonLd.neighborhood) neighborhood = jsonLd.neighborhood;
          if (jsonLd.price != null) price = jsonLd.price;
          if (jsonLd.rating != null) rating = jsonLd.rating;
        }
      } catch {
        // Fallback gracefully if site blocks scraping or times out
      } finally {
        clearTimeout(timer);
      }

      if (!title) {
        title = humanizeSlug(parsedUrl);
      }

      // Enrich via Wikipedia/OSM if page lacked image or description
      if (!externalImage || !description) {
        const enriched = await searchWikipediaAndOSM(title);
        if (!description && enriched.description) description = enriched.description;
        if (!externalImage && enriched.image) externalImage = enriched.image;
        if (!neighborhood && enriched.neighborhood) neighborhood = enriched.neighborhood;
        if (enriched.latitude && enriched.longitude) {
          latitude = enriched.latitude;
          longitude = enriched.longitude;
        }
      }
    } else {
      // User typed a venue / movie / event name directly
      title = rawQuery.replace(/\b\w/g, (l) => l.toUpperCase());
      const enriched = await searchWikipediaAndOSM(rawQuery);
      if (enriched.title) title = enriched.title;
      if (enriched.description) description = enriched.description;
      if (enriched.image) externalImage = enriched.image;
      if (enriched.neighborhood) neighborhood = enriched.neighborhood;
      if (enriched.latitude && enriched.longitude) {
        latitude = enriched.latitude;
        longitude = enriched.longitude;
      }
      finalUrl = `https://www.google.com/search?q=${encodeURIComponent(`${title} ${city}`)}`;
    }

    const combinedText = `${title} ${description} ${neighborhood} ${rawQuery}`;
    const classification = inferClassification(combinedText);
    const resolvedNeighborhood = neighborhood || detectNeighborhood(combinedText);

    const id = `captured-${title
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48)}`;

    const knownLocal = resolveKnownVenueImageForItem(id, title, resolvedNeighborhood);
    const contextualLocal = resolveContextualLocalImage({
      id,
      title,
      description,
      category: classification.category,
      domain: classification.domain,
      tags: classification.tags,
    });

    const finalImage = knownLocal || externalImage || contextualLocal;

    const item = {
      id,
      title,
      description:
        description ||
        `Experiência capturada e analisada automaticamente para o repertório do casal em ${resolvedNeighborhood}.`,
      category: classification.category,
      domain: classification.domain,
      content_tier: "curated" as const,
      city,
      location: title,
      neighborhood: resolvedNeighborhood,
      distance_label: "capturado para vocês",
      indoor_outdoor: classification.indoor_outdoor,
      image_url: finalImage,
      personalization_label: "capturado pelo casal",
      // An imported URL is not an independently verified recommendation.
      // Keep quality and ranking neutral until trustworthy evidence is available.
      quality_score: null,
      score: null,
      price,
      rating,
      tags: [...classification.tags, "captura inteligente"],
      source: sourceLabel,
      editorial_source: sourceLabel,
      url: finalUrl,
      // Source URLs are not necessarily reservation links.
      booking_url: undefined,
      latitude,
      longitude,
      profile_signals: [title, ...classification.tags],
    };

    return NextResponse.json({ item, status: "ok" });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Não foi possível processar esta captura no momento. Tente novamente com outro termo ou link.",
        details: String(error?.message || error),
      },
      { status: 500 }
    );
  }
}
