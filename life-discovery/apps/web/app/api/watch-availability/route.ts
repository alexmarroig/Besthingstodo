import { NextResponse } from "next/server";
import { getWatchAvailability } from "../_lib/watch-availability";
import { jsonWithCache, jsonFallback } from "../_lib/external-api";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const title = params.get("title")?.trim();
  const media = params.get("media");
  const tmdbId = params.get("tmdbId") || undefined;
  const cinemaId = params.get("cinemaId") || undefined;
  const rawYear = params.get("year");
  const year = rawYear ? Number(rawYear) : undefined;
  const city = (params.get("city") || "São Paulo").trim();
  if (!title || title.length > 180 || !["movie", "tv"].includes(media || "") || city.length > 100 ||
      (tmdbId && !/^\d{1,10}$/.test(tmdbId)) || (cinemaId && !/^\d{1,10}$/.test(cinemaId)) ||
      (year !== undefined && (!Number.isInteger(year) || year < 1880 || year > 2100))) {
    return NextResponse.json({ error: "Filme ou série inválido." }, { status: 400 });
  }
  const data = await getWatchAvailability({ title, media: media as "movie" | "tv", tmdbId, cinemaId, year, city });
  return data.streaming.status === "unavailable" || data.cinema.status === "unavailable"
    ? jsonFallback(data, { revalidate: 120, fallbackMaxAge: 30 })
    : jsonWithCache(data, { revalidate: 120, stale: 60 });
}
