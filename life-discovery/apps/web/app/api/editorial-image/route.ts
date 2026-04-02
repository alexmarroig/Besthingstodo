import { NextRequest, NextResponse } from "next/server";

const ALLOWED_PAGE_HOSTS = [
  "wikipedia.org",
  "guide.michelin.com",
  "lellistrattoria.com.br",
  "apizzadamooca.com.br",
  "pattiesburger.com",
  "zdeli.com.br",
  "asas.br.com",
  "reservacultural.com.br",
  "sesc.com.br",
  "mubi.com",
  "telecine.globo.com",
  "masp.org.br",
  "ims.com.br",
  "pinacoteca.org.br",
  "theatromunicipal.org.br",
  "prefeitura.sp.gov.br",
  "cinemateca.org.br",
  "brazelettrica.com.br",
  "forneriasanpaolo.com.br",
  "cabanaburger.com.br",
  "instagram.com"
];

function isAllowedHost(hostname: string) {
  return ALLOWED_PAGE_HOSTS.some((allowed) => hostname === allowed || hostname.endsWith(`.${allowed}`));
}

function extractImageUrl(html: string, pageUrl: URL) {
  const candidates = [
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+name=["']og:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+property=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
    /<link[^>]+rel=["'][^"']*apple-touch-icon[^"']*["'][^>]+href=["']([^"']+)["']/i,
    /<link[^>]+rel=["'][^"']*icon[^"']*["'][^>]+href=["']([^"']+)["']/i
  ];

  for (const pattern of candidates) {
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

export async function GET(request: NextRequest) {
  const target = request.nextUrl.searchParams.get("target");
  const title = request.nextUrl.searchParams.get("title") || "";
  const location = request.nextUrl.searchParams.get("location") || "";
  const city = request.nextUrl.searchParams.get("city") || "Sao Paulo";

  if (!target) {
    return NextResponse.json({ url: null, source: null }, { status: 200 });
  }

  try {
    const pageUrl = new URL(target);
    if (!isAllowedHost(pageUrl.hostname)) {
      return NextResponse.json({ url: null, source: null }, { status: 200 });
    }

    const html = await fetch(pageUrl.toString(), {
      headers: { "User-Agent": "RoteiroADois/1.0 (editorial-image)" },
      next: { revalidate: 21600 }
    }).then((res) => (res.ok ? res.text() : ""));

    const imageUrl = extractImageUrl(html, pageUrl);
    if (imageUrl) {
      return NextResponse.json({ url: imageUrl, source: "og" }, { status: 200 });
    }
  } catch {
    return NextResponse.json({ url: null, source: null }, { status: 200 });
  }

  return NextResponse.json({ url: null, source: null }, { status: 200 });
}
