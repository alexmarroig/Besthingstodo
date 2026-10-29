import { fetchExternalJson, jsonFallback, jsonWithCache } from "../_lib/external-api";
import { buildTmdbRequest, getTmdbApiKey } from "../_lib/tmdb-client";
import { resolveKnownVenueImageForItem } from "../_lib/known-venue-images";

const IMG_BASE = "https://image.tmdb.org/t/p/w500";

const FALLBACK_MOVIES = [
  {
    id: "tmdb-157336",
    title: "Interstellar",
    description: "Uma equipe de exploradores viaja através de um buraco de minhoca no espaço na tentativa de garantir a sobrevivência da humanidade.",
    category: "movie",
    domain: "movies_series",
    image_url: "/images/venues/movie-interstellar.svg",
    tags: ["sci-fi", "drama", "aventura"],
    genre_ids: [878, 18, 12],
    source: "TMDB",
    score: 8.7,
    quality_score: 96,
    url: "https://www.themoviedb.org/movie/157336",
  },
  {
    id: "tmdb-496243",
    title: "Parasita",
    description: "Toda a família Kim está desempregada. Quando o filho mais velho começa a dar aulas para uma família rica, um plano engenhoso se desenrola.",
    category: "movie",
    domain: "movies_series",
    image_url: "/images/venues/movie-parasite.svg",
    tags: ["thriller", "drama", "comédia", "plot twist"],
    genre_ids: [53, 18, 35],
    source: "TMDB",
    score: 8.5,
    quality_score: 95,
    url: "https://www.themoviedb.org/movie/496243",
  },
  {
    id: "tmdb-136315",
    title: "The Bear",
    description: "Um jovem chef de alta gastronomia volta para Chicago para administrar a lanchonete da família, transformando caos em excelência culinária.",
    category: "series",
    domain: "movies_series",
    image_url: "/images/venues/series-the-bear.svg",
    tags: ["drama", "comédia", "gastronomia", "chef"],
    genre_ids: [18, 35],
    source: "TMDB",
    score: 8.6,
    quality_score: 95,
    url: "https://www.themoviedb.org/tv/136315",
  },
  {
    id: "tmdb-872585",
    title: "Oppenheimer",
    description: "A história do físico J. Robert Oppenheimer e os dilemas éticos e científicos por trás do Projeto Manhattan.",
    category: "movie",
    domain: "movies_series",
    image_url: "/images/venues/movie-oppenheimer.svg",
    tags: ["drama", "história", "thriller"],
    genre_ids: [18, 36, 53],
    source: "TMDB",
    score: 8.3,
    quality_score: 91,
    url: "https://www.themoviedb.org/movie/872585",
  },
  {
    id: "tmdb-76331",
    title: "Succession",
    description: "A família Roy, dona de um império global de mídia, disputa o controle do conglomerado em meio a traições e diálogos afiados.",
    category: "series",
    domain: "movies_series",
    image_url: "/images/venues/series-succession.svg",
    tags: ["drama", "poder", "intriga"],
    genre_ids: [18],
    source: "TMDB",
    score: 8.8,
    quality_score: 94,
    url: "https://www.themoviedb.org/tv/76331",
  },
  {
    id: "tmdb-693134",
    title: "Duna: Parte Dois",
    description: "Paul Atreides se une a Chani e aos Fremen em uma jornada épica de espiritualidade, romance e estratégia pelo deserto de Arrakis.",
    category: "movie",
    domain: "movies_series",
    image_url: "/images/venues/movie-dune-2.svg",
    tags: ["sci-fi", "ação", "aventura", "romance"],
    genre_ids: [878, 28, 12, 10749],
    source: "TMDB",
    score: 8.4,
    quality_score: 93,
    url: "https://www.themoviedb.org/movie/693134",
  },
  {
    id: "tmdb-126308",
    title: "Shōgun",
    description: "No Japão feudal de 1600, o senhor Yoshii Toranaga luta pela sobrevivência quando um navio europeu misterioso aporta em seu território.",
    category: "series",
    domain: "movies_series",
    image_url: "/images/venues/series-shogun.svg",
    tags: ["drama", "ação", "história", "épico"],
    genre_ids: [18, 28, 36],
    source: "TMDB",
    score: 8.7,
    quality_score: 92,
    url: "https://www.themoviedb.org/tv/126308",
  },
  {
    id: "tmdb-792307",
    title: "Pobres Criaturas",
    description: "A fantástica evolução de Bella Baxter, uma jovem brilhante e curiosa que parte em uma aventura pelo mundo em busca de liberdade.",
    category: "movie",
    domain: "movies_series",
    image_url: "/images/venues/movie-poor-things.svg",
    tags: ["comédia", "drama", "romance", "fantasia"],
    genre_ids: [35, 18, 10749, 878],
    source: "TMDB",
    score: 7.9,
    quality_score: 88,
    url: "https://www.themoviedb.org/movie/792307",
  },
  {
    id: "tmdb-666277",
    title: "Vidas Passadas (Past Lives)",
    description: "Nora e Hae Sung, dois amigos de infância profundamente conectados, se reencontram em Nova York para uma semana decisiva sobre amor e destino.",
    category: "movie",
    domain: "movies_series",
    image_url: "/images/venues/watch-past-lives.svg",
    tags: ["romance", "drama", "intimista", "conversa depois"],
    genre_ids: [10749, 18],
    source: "TMDB",
    score: 8.1,
    quality_score: 96,
    url: "https://www.themoviedb.org/movie/666277",
  },
  {
    id: "tmdb-915935",
    title: "Anatomia de uma Queda",
    description: "Uma escritora tenta provar sua inocência na morte misteriosa do marido nos Alpes franceses, revelando as camadas ocultas do casamento.",
    category: "movie",
    domain: "movies_series",
    image_url: "/images/venues/watch-anatomy-of-a-fall.svg",
    tags: ["thriller", "drama", "suspense", "plot twist"],
    genre_ids: [53, 18],
    source: "TMDB",
    score: 7.9,
    quality_score: 94,
    url: "https://www.themoviedb.org/movie/915935",
  },
  {
    id: "tmdb-976893",
    title: "Dias Perfeitos (Perfect Days)",
    description: "Hirayama leva uma vida contemplativa em Tóquio, encontrando beleza na música, nos livros e nas árvores que fotografa todos os dias.",
    category: "movie",
    domain: "movies_series",
    image_url: "/images/venues/watch-perfect-days.svg",
    tags: ["drama", "calmo", "arte", "aconchegante"],
    genre_ids: [18],
    source: "TMDB",
    score: 8.0,
    quality_score: 93,
    url: "https://www.themoviedb.org/movie/976893",
  },
  {
    id: "tmdb-24805",
    title: "Julie & Julia",
    description: "Duas mulheres separadas pelo tempo encontram paixão, romance e propósito através da arte da culinária francesa.",
    category: "movie",
    domain: "movies_series",
    image_url: "/images/venues/watch-julie-julia.svg",
    tags: ["romance", "comédia", "gastronomia", "conforto"],
    genre_ids: [10749, 35, 18],
    source: "TMDB",
    score: 7.4,
    quality_score: 90,
    url: "https://www.themoviedb.org/movie/24805",
  },
  {
    id: "tmdb-95396",
    title: "Ruptura (Severance)",
    description: "Funcionários de uma corporação biotecnológica passam por um procedimento cirúrgico que separa suas memórias pessoais das memórias de trabalho.",
    category: "series",
    domain: "movies_series",
    image_url: "/images/venues/movie-interstellar.svg",
    tags: ["sci-fi", "thriller", "suspense", "plot twist"],
    genre_ids: [878, 53, 18],
    source: "TMDB",
    score: 8.7,
    quality_score: 96,
    url: "https://www.themoviedb.org/tv/95396",
  },
  {
    id: "tmdb-70523",
    title: "Dark",
    description: "O desaparecimento de duas crianças em uma cidade alemã expõe as relações fraturadas entre quatro famílias e um mistério que atravessa gerações.",
    category: "series",
    domain: "movies_series",
    image_url: "/images/venues/movie-oppenheimer.svg",
    tags: ["sci-fi", "thriller", "suspense", "mistério"],
    genre_ids: [878, 53, 18],
    source: "TMDB",
    score: 8.5,
    quality_score: 93,
    url: "https://www.themoviedb.org/tv/70523",
  },
];

function filterFallbackMovies(options: { type: string; genre: string; media: string; query: string }) {
  let list = [...FALLBACK_MOVIES];
  if (options.media === "tv") {
    list = list.filter((item) => item.category === "series");
  }
  if (options.genre) {
    const genreId = Number(options.genre);
    const byGenre = list.filter((item) => item.genre_ids?.includes(genreId));
    if (byGenre.length > 0) list = byGenre;
  }
  if (options.query) {
    const q = options.query.toLowerCase();
    const byQuery = list.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.tags.some((t) => t.toLowerCase().includes(q))
    );
    if (byQuery.length > 0) list = byQuery;
  }
  return list;
}

function mapTmdbItem(item: any, mediaType: string) {
  const isMovie = mediaType === "movie" || item.media_type === "movie";
  const id = `tmdb-${item.id}`;
  const title = item.title || item.name || "Sem título";
  const knownLocal = resolveKnownVenueImageForItem(id, title, "");
  return {
    id,
    release_year: Number((item.release_date || item.first_air_date || "").slice(0, 4)) || null,
    original_title: item.original_title || item.original_name || null,
    title,
    description: item.overview || "",
    category: isMovie ? "movie" : "series",
    domain: "movies_series",
    city: "São Paulo",
    location: isMovie ? "Cinema & Streaming" : "Streaming",
    image_url: item.poster_path ? `${IMG_BASE}${item.poster_path}` : knownLocal || "/images/venues/movie-interstellar.svg",
    tags: (item.genre_ids || []).map((gid: number) => GENRE_MAP[gid] || "cinema"),
    source: "TMDB",
    url: `https://www.themoviedb.org/${isMovie ? "movie" : "tv"}/${item.id}`,
    score: item.vote_average || null,
    price: null,
    start_time: item.release_date || item.first_air_date || null,
    personalization_label: null,
    related_favorite: null,
    quality_score: item.vote_average ? Math.round(item.vote_average * 10) : 84,
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
  const apiKey = getTmdbApiKey();

  const fallbackList = filterFallbackMovies({ type, genre, media, query });

  if (!apiKey) {
    return jsonWithCache(fallbackList, { revalidate: 600, stale: 300 });
  }

  try {
    let path = "";
    const params: Record<string, string> = { language: "pt-BR", page: "1" };
    let mediaType = media;

    switch (type) {
      case "trending":
        path = media === "tv" ? "/trending/tv/week" : "/trending/all/week";
        mediaType = media === "tv" ? "tv" : "all";
        break;
      case "now_playing":
        path = "/movie/now_playing";
        params.region = "BR";
        mediaType = "movie";
        break;
      case "discover":
        path = `/discover/${media}`;
        params.sort_by = "popularity.desc";
        if (genre) params.with_genres = genre;
        break;
      case "search":
        path = `/search/multi`;
        params.query = query;
        break;
      default:
        path = "/trending/all/week";
        mediaType = "all";
    }

    const tmdbReq = buildTmdbRequest(path, params);
    if (!tmdbReq) {
      return jsonWithCache(fallbackList, { revalidate: 600, stale: 300 });
    }

    const data = await fetchExternalJson<any>(tmdbReq.url, {
      headers: tmdbReq.headers,
      revalidate: 600,
      timeoutMs: 3200,
    });
    const results = (data.results || []).slice(0, 20).map((item: any) => mapTmdbItem(item, mediaType));

    return jsonWithCache(results.length ? results : fallbackList, { revalidate: 600, stale: 300 });
  } catch {
    return jsonFallback(fallbackList, { revalidate: 600, fallbackMaxAge: 60 });
  }
}
