export type WatchProvider = { id: number; name: string; logo: string | null };
export type ProviderKind = "flatrate" | "free" | "ads" | "rent" | "buy";
export type ProviderGroup = { kind: ProviderKind; label: string; providers: WatchProvider[] };
export type CinemaMovie = {
  id: string; title: string; originalTitle?: string; releaseYear?: number;
  siteURL?: string; isPlaying?: boolean; inPreSale?: boolean;
  synopsis?: string; genres?: string[]; images?: Array<{ url: string; type: string }>;
};
export type CinemaSession = {
  id: string; theater: string; neighborhood: string; room: string;
  startsAt: string; formats: string[]; url: string; price: number | null;
};
export type WatchAvailability = {
  region: "BR"; city: string; checkedAt: string;
  streaming: { status: "ok" | "unavailable"; groups: ProviderGroup[]; url: string | null };
  cinema: { status: "ok" | "unavailable" | "unsupported"; url: string | null; sessions: CinemaSession[] };
};

export function safeWatchUrl(value: unknown, hosts: string[]): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password &&
      hosts.some(host => url.hostname === host || url.hostname.endsWith(`.${host}`)) ? url.href : null;
  } catch { return null; }
}

export function normalizeProviders(data: { results?: Record<string, any> }) {
  const br = data.results?.BR;
  const labels: Record<ProviderKind, string> = {
    flatrate: "Na assinatura", free: "Grátis", ads: "Com anúncios", rent: "Para alugar", buy: "Para comprar",
  };
  const groups: ProviderGroup[] = [];
  for (const kind of Object.keys(labels) as ProviderKind[]) {
    const seen = new Set<number>();
    const providers: WatchProvider[] = [];
    for (const row of Array.isArray(br?.[kind]) ? br[kind] : []) {
      if (!Number.isInteger(row.provider_id) || !row.provider_name || seen.has(row.provider_id)) continue;
      seen.add(row.provider_id);
      providers.push({ id: row.provider_id, name: row.provider_name,
        logo: typeof row.logo_path === "string" && /^\/[a-zA-Z0-9._-]+$/.test(row.logo_path)
          ? `https://image.tmdb.org/t/p/w92${row.logo_path}` : null });
    }
    if (providers.length) groups.push({ kind, label: labels[kind], providers });
  }
  return { groups, url: safeWatchUrl(br?.link, ["themoviedb.org"]) };
}

export function normalizeMovieTitle(title: string): string {
  return title.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, " ").trim();
}

export function matchCinemaMovie(movies: CinemaMovie[], identity: { title: string; originalTitle?: string; year?: number }): CinemaMovie | null {
  const titles = [identity.title, identity.originalTitle].filter(Boolean).map(t => normalizeMovieTitle(t!));
  const matches = movies.filter(movie => {
    if (identity.year && movie.releaseYear && identity.year !== movie.releaseYear) return false;
    return [movie.title, movie.originalTitle].some(t => t && titles.includes(normalizeMovieTitle(t)));
  });
  return matches.length === 1 ? matches[0] : null;
}

export function normalizeCinemaSessions(days: any[], now = Date.now()): CinemaSession[] {
  const sessions: CinemaSession[] = [];
  const seen = new Set<string>();
  for (const day of Array.isArray(days) ? days : []) {
    for (const theater of day.theaters || []) {
      if (theater.enabled === false) continue;
      for (const room of theater.rooms || []) {
        for (const session of room.sessions || []) {
          const url = safeWatchUrl(session.siteURL, ["ingresso.com"]);
          const startsAt = session.date?.localDate;
          if (!url || session.enabled === false || session.streaming || !startsAt ||
            !Number.isFinite(Date.parse(startsAt)) || Date.parse(startsAt) <= now || seen.has(String(session.id))) continue;
          seen.add(String(session.id));
          sessions.push({ id: String(session.id), theater: theater.name || "Cinema",
            neighborhood: theater.neighborhood || "", room: room.name || "",
            startsAt, formats: Array.isArray(session.type) ? session.type : [], url,
            price: typeof session.price === "number" && session.price > 0 ? session.price : null });
        }
      }
    }
  }
  return sessions.sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt)).slice(0, 40);
}
