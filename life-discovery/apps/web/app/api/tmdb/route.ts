import { fetchExternalJson, jsonFallback, jsonWithCache } from "../_lib/external-api";

const TMDB_BASE = "https://api.themoviedb.org/3";
const IMG_BASE = "https://image.tmdb.org/t/p/w500";

const FALLBACK_MOVIES = [
  { id: "tmdb-550", title: "Interstellar", description: "Uma equipe de exploradores viaja através de um buraco de minhoca no espaço na tentativa de garantir a sobrevivência da humanidade.", category: "movie", domain: "movies_series", image_url: `${IMG_BASE}/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg`, tags: ["sci-fi", "drama", "aventura"], source: "TMDB", score: 8.7, url: "https://www.themoviedb.org/movie/157336" },
  { id: "tmdb-551", title: "Parasita", description: "Toda a família Kim está desempregada. Quando o filho mais velho começa a dar aulas para uma família rica, toda a família começa a se infiltrar na casa dos Park.", category: "movie", domain: "movies_series", image_url: `${IMG_BASE}/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg`, tags: ["thriller", "drama", "comedy"], source: "TMDB", score: 8.5, url: "https://www.themoviedb.org/movie/496243" },
  { id: "tmdb-552", title: "The Bear", description: "Um jovem chef de alta gastronomia volta para Chicago para administrar o restaurante de sanduíches da família após uma tragédia.", category: "series", domain: "movies_series", image_url: `${IMG_BASE}/sHFlZczMDVp8TzXRrE1WiRBvKNh.jpg`, tags: ["drama", "food", "chef"], source: "TMDB", score: 8.6, url: "https://www.themoviedb.org/tv/136315" },
  { id: "tmdb-553", title: "Oppenheimer", description: "A história do físico americano J. Robert Oppenheimer e seu papel no desenvolvimento da bomba atômica.", category: "movie", domain: "movies_series", image_url: `${IMG_BASE}/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg`, tags: ["drama", "história", "thriller"], source: "TMDB", score: 8.3, url: "https://www.themoviedb.org/movie/872585" },
  { id: "tmdb-554", title: "Succession", description: "A família Roy, dona de um dos maiores conglomerados de mídia e entretenimento do mundo, luta pelo controle enquanto o patriarca envelhece.", category: "series", domain: "movies_series", image_url: `${IMG_BASE}/7HW47XbkNQ5fiwQFYGWdw9gs7LF.jpg`, tags: ["drama", "poder", "família"], source: "TMDB", score: 8.8, url: "https://www.themoviedb.org/tv/76331" },
  { id: "tmdb-555", title: "Duna: Parte Dois", description: "Paul Atreides se une aos Fremen enquanto busca vingança contra os conspiradores que destruíram sua família.", category: "movie", domain: "movies_series", image_url: `${IMG_BASE}/8b8R8l88Qje9dn9OE8PY05Nez7H.jpg`, tags: ["sci-fi", "aventura", "épico"], source: "TMDB", score: 8.2, url: "https://www.themoviedb.org/movie/693134" },
  { id: "tmdb-556", title: "Shōgun", description: "No Japão feudal do século XVII, um marinheiro inglês naufraga e se envolve nas intrigas políticas entre senhores da guerra.", category: "series", domain: "movies_series", image_url: `${IMG_BASE}/7O4iVfOMQmdCSxhOg1W5IGmgjGm.jpg`, tags: ["drama", "história", "épico"], source: "TMDB", score: 8.7, url: "https://www.themoviedb.org/tv/126308" },
  { id: "tmdb-557", title: "Pobres Criaturas", description: "Belle Baxter, uma jovem trazida de volta à vida pelo cientista Dr. Godwin Baxter, foge para explorar o mundo.", category: "movie", domain: "movies_series", image_url: `${IMG_BASE}/kCGlIMHnOm8JPXq3rXM6c5wMxcT.jpg`, tags: ["drama", "romance", "fantasia"], source: "TMDB", score: 7.9, url: "https://www.themoviedb.org/movie/792307" },
];

function mapTmdbItem(item: any, mediaType: string) {
  const isMovie = mediaType === "movie" || item.media_type === "movie";
  return {
    id: `tmdb-${item.id}`,
    title: item.title || item.name || "Sem título",
    description: item.overview || "",
    category: isMovie ? "movie" : "series",
    domain: "movies_series",
    city: "",
    location: "",
    image_url: item.poster_path ? `${IMG_BASE}${item.poster_path}` : null,
    tags: (item.genre_ids || []).map((id: number) => GENRE_MAP[id] || "outro"),
    source: "TMDB",
    url: `https://www.themoviedb.org/${isMovie ? "movie" : "tv"}/${item.id}`,
    score: item.vote_average || null,
    price: null,
    start_time: item.release_date || item.first_air_date || null,
    personalization_label: null,
    related_favorite: null,
    quality_score: item.vote_average ? item.vote_average * 10 : null,
    latitude: null,
    longitude: null,
    profile_signals: [],
  };
}

const GENRE_MAP: Record<number, string> = {
  28: "ação", 12: "aventura", 16: "animação", 35: "comédia", 80: "crime",
  99: "documentário", 18: "drama", 10751: "família", 14: "fantasia",
  36: "história", 27: "terror", 10402: "música", 9648: "mistério",
  10749: "romance", 878: "sci-fi", 53: "thriller", 10752: "guerra", 37: "faroeste",
  10759: "ação & aventura", 10762: "kids", 10763: "news", 10764: "reality",
  10765: "sci-fi & fantasia", 10766: "soap", 10767: "talk", 10768: "war & politics",
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "trending";
  const query = searchParams.get("query") || "";
  const genre = searchParams.get("genre") || "";
  const media = searchParams.get("media") || "movie";
  const apiKey = process.env.TMDB_API_KEY;

  if (!apiKey) {
    return jsonWithCache(FALLBACK_MOVIES, { revalidate: 600, stale: 300 });
  }

  const headers = { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" };

  try {
    let url = "";
    let mediaType = media;

    switch (type) {
      case "trending":
        url = `${TMDB_BASE}/trending/all/week?language=pt-BR&page=1`;
        mediaType = "all";
        break;
      case "discover":
        url = `${TMDB_BASE}/discover/${media}?language=pt-BR&sort_by=popularity.desc&page=1${genre ? `&with_genres=${genre}` : ""}`;
        break;
      case "search":
        url = `${TMDB_BASE}/search/${media}?language=pt-BR&query=${encodeURIComponent(query)}&page=1`;
        break;
      default:
        url = `${TMDB_BASE}/trending/all/week?language=pt-BR&page=1`;
        mediaType = "all";
    }

    const data = await fetchExternalJson<any>(url, { headers, revalidate: 600 });
    const results = (data.results || []).slice(0, 20).map((item: any) => mapTmdbItem(item, mediaType));

    return jsonWithCache(results, { revalidate: 600, stale: 300 });
  } catch (error) {
    return jsonFallback(FALLBACK_MOVIES, { revalidate: 600, fallbackMaxAge: 60 });
  }
}
