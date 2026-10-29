"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Clapperboard, Search, Sparkles, X } from "lucide-react";

import CoupleWeatherBadge from "@/components/discovery/couple-weather-badge";
import MediaDetailModal from "@/components/discovery/media-detail-modal";
import MediaRail from "@/components/discovery/media-rail";
import MediaTile from "@/components/discovery/media-tile";
import {
  fetchTrendingMovies,
  fetchMoviesByGenre,
  fetchCoupleMe,
  fetchUserContext,
  fetchCinemaNews,
  fetchNowPlayingMovies,
} from "@/shared/api/client";
import {
  buildFallbackContext,
  buildWatchRecommendations,
  getCoupleSnapshot,
} from "@/features/catalog/curation";
import { buildMLState, rankRecommendationsWithML } from "@/features/catalog/ml/engine";
import { useContinualLearning } from "@/shared/hooks/use-continual-learning";
import { attachRecommendationImages } from "@/shared/recommendation-images";
import { getUserId } from "@/shared/storage";
import { Recommendation } from "@life/shared-types";

const GENRE_SECTIONS = [
  { id: "53", key: "thriller", title: "Suspense & Plot Twist", subtitle: "Tensão elegante, viradas inteligentes e conversa longa depois." },
  { id: "878", key: "scifi", title: "Ficção Científica", subtitle: "Histórias ambiciosas que expandem a imaginação." },
  { id: "18", key: "drama", title: "Drama Autoral", subtitle: "Filmes que emocionam e ficam na memória do casal." },
  { id: "10749", key: "romance", title: "Romance & Encontros", subtitle: "Para noites mais emotivas e intimistas a dois." },
  { id: "35", key: "comedy", title: "Comédia & Leveza", subtitle: "Quando a noite pede descontração sem esforço." },
  { id: "28", key: "action", title: "Ação & Aventura", subtitle: "Ritmo intenso e experiência visual de cinema." },
];

export default function WatchScreen() {
  const userId = getUserId();
  const [selectedGenre, setSelectedGenre] = useState(GENRE_SECTIONS[0]);
  const [selectedItem, setSelectedItem] = useState<Recommendation | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: couple } = useQuery({ queryKey: ["couple-me"], queryFn: fetchCoupleMe });
  const { data: context } = useQuery({
    queryKey: ["context", couple?.city || "Sao Paulo", couple?.neighborhood || ""],
    queryFn: () => fetchUserContext(couple || undefined),
  });

  const { feedbackHistory, version: mlVersion, insights } = useContinualLearning(couple, context);

  const { data: trending, isLoading: loadingTrending } = useQuery({
    queryKey: ["watch-trending"],
    queryFn: fetchTrendingMovies,
  });

  const { data: genreMovies, isLoading: loadingGenre } = useQuery({
    queryKey: ["watch-genre", selectedGenre.id],
    queryFn: () => fetchMoviesByGenre(selectedGenre.id),
  });

  const { data: trendingTV } = useQuery({
    queryKey: ["watch-tv-trending"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/tmdb?type=trending&media=tv");
        if (!res.ok) return [];
        return await res.json();
      } catch {
        return [];
      }
    },
  });

  const { data: nowPlaying } = useQuery({
    queryKey: ["watch-now-playing"],
    queryFn: fetchNowPlayingMovies,
  });

  const { data: cinemaNews } = useQuery({
    queryKey: ["watch-cinema-news"],
    queryFn: fetchCinemaNews,
  });

  const { data: searchedMovies = [], isFetching: searching } = useQuery({
    queryKey: ["watch-search", searchQuery.trim()],
    queryFn: async () => {
      const q = searchQuery.trim();
      if (q.length < 2) return [];
      try {
        const res = await fetch(`/api/tmdb?type=search&query=${encodeURIComponent(q)}`);
        if (!res.ok) return [];
        return await res.json();
      } catch {
        return [];
      }
    },
    enabled: searchQuery.trim().length >= 2,
  });

  const safeContext = context || buildFallbackContext(couple?.city || "Sao Paulo");
  const snapshot = useMemo(() => getCoupleSnapshot(couple), [couple]);
  const mlState = useMemo(() => {
    void mlVersion;
    return buildMLState(snapshot, safeContext, feedbackHistory);
  }, [snapshot, safeContext, feedbackHistory, mlVersion]);

  const coupleWatchPicks = useMemo(() => {
    void mlVersion;
    return buildWatchRecommendations({
      recommendations: [...(trending || []), ...(nowPlaying || [])],
      context: safeContext,
      couple: snapshot,
      limit: 12,
    });
  }, [trending, nowPlaying, safeContext, snapshot, mlVersion]);

  const movies = useMemo(() => {
    const raw = (nowPlaying?.length ? nowPlaying : trending || []).filter((i: any) => i.category === "movie");
    return attachRecommendationImages(rankRecommendationsWithML(raw, mlState)).slice(0, 14);
  }, [nowPlaying, trending, mlState]);

  const series = useMemo(() => {
    const fromTrending = (trending || []).filter((i: any) => i.category === "series");
    const fromTV = (trendingTV || []).filter((i: any) => i.category === "series");
    const all = [...fromTrending, ...fromTV];
    const seen = new Set<string>();
    const deduped = all.filter((i: any) => {
      if (seen.has(i.id)) return false;
      seen.add(i.id);
      return true;
    });
    return attachRecommendationImages(rankRecommendationsWithML(deduped, mlState)).slice(0, 14);
  }, [trending, trendingTV, mlState]);

  const genreItems = useMemo(
    () => attachRecommendationImages(rankRecommendationsWithML(genreMovies || [], mlState)).slice(0, 14),
    [genreMovies, mlState]
  );

  const rankedSearch = useMemo(
    () => attachRecommendationImages(rankRecommendationsWithML(searchedMovies || [], mlState)),
    [searchedMovies, mlState]
  );

  const favorites =
    couple?.preferences?.favorite_movies ||
    couple?.profile?.couple_profile_json?.interests?.cinema?.favorite_titles ||
    [];

  return (
    <section className="space-y-7">
      <div className="hero-mesh overflow-hidden rounded-[2.25rem] border border-white/10 p-6 md:p-8">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4">
            <div>
              <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#f4d06f]">
                <Clapperboard className="h-3.5 w-3.5" />
                <span>Cinema de Rua & Streaming a Dois</span>
              </p>
              <h2 className="mt-2 max-w-3xl font-display text-3xl font-semibold leading-tight text-white sm:text-4xl md:text-5xl">
                Filmes e séries calibrados pelo gosto do casal
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/70">
                Catálogo enriquecido via TMDB + salas de cinema de rua de São Paulo (Belas Artes, CineSesc, Reserva
                Cultural), ordenado em tempo real pelo algoritmo de aprendizado contínuo ({insights.confidencePercent}%
                calibrado).
              </p>
            </div>

            {favorites.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-white/45">Referências do casal:</span>
                {favorites.slice(0, 5).map((item: string) => (
                  <span
                    key={item}
                    className="rounded-full border border-[#f4d06f]/25 bg-[#f4d06f]/10 px-3.5 py-1 text-xs font-medium text-[#f4d06f]"
                  >
                    ★ {item}
                  </span>
                ))}
              </div>
            )}

            {/* Search Input */}
            <div className="relative max-w-xl pt-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/45" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar filme, série, diretor ou tema (ex.: Interstellar, suspense, The Bear)..."
                className="w-full rounded-full border border-white/12 bg-black/35 py-2.5 pl-10 pr-9 text-sm text-white placeholder:text-white/40 focus:border-[#ff7a59]/60 focus:outline-none"
              />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-white/50 hover:text-white"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <div className="rounded-[1.6rem] border border-white/10 bg-black/22 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#f4d06f]">
                Curadoria Neural
              </p>
              <p className="mt-1.5 text-2xl font-semibold text-white">
                {coupleWatchPicks.length + movies.length + series.length} títulos
              </p>
              <p className="mt-1 text-xs text-white/60">
                Pontuados por afinidade semântica, gênero e clima de hoje.
              </p>
            </div>
            <CoupleWeatherBadge context={safeContext} couple={couple || undefined} compact />
          </div>
        </div>
      </div>

      {/* Live Search Results */}
      {searchQuery.trim().length >= 2 ? (
        <div className="surface space-y-4 p-5">
          <div className="flex items-center justify-between">
            <h3 className="rail-title">
              Resultados para &quot;{searchQuery}&quot; ({rankedSearch.length})
            </h3>
            {searching ? <span className="text-xs text-white/50">Buscando no TMDB…</span> : null}
          </div>
          {rankedSearch.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-6">
              {rankedSearch.map((item) => (
                <MediaTile key={item.id} item={item} onOpen={setSelectedItem} variant="poster" />
              ))}
            </div>
          ) : !searching ? (
            <p className="text-sm text-white/55">Nenhum título encontrado para esta busca.</p>
          ) : null}
        </div>
      ) : null}

      {coupleWatchPicks.length > 0 && (
        <MediaRail
          title="Escolhas sob medida para assistir juntos"
          subtitle="Circuito de cinema de rua em SP + sessões especiais em casa alinhadas ao repertório de vocês"
          items={coupleWatchPicks}
          onOpen={setSelectedItem}
        />
      )}

      {movies.length > 0 && (
        <MediaRail
          title="Filmes em alta & em cartaz"
          subtitle="Ordenados pelo Match IA do casal"
          items={movies}
          onOpen={setSelectedItem}
          variant="poster"
          loading={loadingTrending}
        />
      )}

      {series.length > 0 && (
        <MediaRail
          title="Séries para maratonar a dois"
          subtitle="Dramas, gastronomia, mistério e sci-fi com alta nota"
          items={series}
          onOpen={setSelectedItem}
          variant="poster"
        />
      )}

      {/* Genre Filter */}
      <div className="space-y-4">
        <div>
          <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#f4d06f]">
            <Sparkles className="h-3 w-3" />
            <span>Explorar por atmosfera</span>
          </p>
          <h3 className="mt-1 font-display text-2xl font-semibold text-white sm:text-3xl">
            Escolha pela vibe da noite
          </h3>
        </div>

        <div className="flex flex-wrap gap-2">
          {GENRE_SECTIONS.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => setSelectedGenre(g)}
              className={`rounded-full px-4 py-2 text-xs font-medium transition sm:text-sm ${
                selectedGenre.id === g.id
                  ? "bg-gradient-to-r from-[#ff7a59] to-[#f97352] text-white shadow-md"
                  : "border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              {g.title}
            </button>
          ))}
        </div>

        <MediaRail
          title={selectedGenre.title}
          subtitle={selectedGenre.subtitle}
          items={genreItems}
          onOpen={setSelectedItem}
          variant="poster"
          loading={loadingGenre}
        />
      </div>

      {(cinemaNews || []).length > 0 && (
        <MediaRail
          title="Radar de Cinema & Críticas"
          subtitle="Destaques editoriais de Omelete e AdoroCinema"
          items={(cinemaNews || []).slice(0, 12)}
          onOpen={setSelectedItem}
        />
      )}

      <MediaDetailModal item={selectedItem} userId={userId} onClose={() => setSelectedItem(null)} />
    </section>
  );
}
