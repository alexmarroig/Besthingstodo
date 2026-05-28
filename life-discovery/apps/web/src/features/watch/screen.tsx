"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";

import DiscoveryCard from "@/components/discovery/discovery-card";
import { fetchTrendingMovies, fetchMoviesByGenre, fetchCoupleMe, fetchUserContext } from "@/shared/api/client";
import { buildFallbackContext } from "@/features/catalog/curation";
import { getUserId } from "@/shared/storage";
import { Recommendation } from "@life/shared-types";

const GENRE_SECTIONS = [
  { id: "28", key: "action", title: "Ação e aventura", subtitle: "Para noites que pedem adrenalina e visual forte." },
  { id: "35", key: "comedy", title: "Comédia", subtitle: "Quando a noite pede leveza e risada sem compromisso." },
  { id: "18", key: "drama", title: "Drama", subtitle: "Filmes que rendem conversa e ficam na cabeça depois." },
  { id: "10749", key: "romance", title: "Romance", subtitle: "Para noite mais emotiva e intimista a dois." },
  { id: "53", key: "thriller", title: "Suspense e thriller", subtitle: "Tensão, viradas e filmes para conversar depois." },
  { id: "878", key: "scifi", title: "Ficção científica", subtitle: "Quando vocês querem algo que expande a imaginação." },
];

export default function WatchScreen() {
  const userId = getUserId();
  const [selectedGenre, setSelectedGenre] = useState(GENRE_SECTIONS[0]);

  const { data: couple } = useQuery({ queryKey: ["couple-me"], queryFn: fetchCoupleMe });
  const { data: context } = useQuery({
    queryKey: ["context", couple?.city || "Sao Paulo"],
    queryFn: () => fetchUserContext(couple?.city || "Sao Paulo"),
  });

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
      const res = await fetch("/api/tmdb?type=trending&media=tv");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const safeContext = context || buildFallbackContext(couple?.city || "Sao Paulo");

  const movies = useMemo(() => (trending || []).filter((i: any) => i.category === "movie").slice(0, 6), [trending]);
  const series = useMemo(() => {
    const fromTrending = (trending || []).filter((i: any) => i.category === "series");
    const fromTV = (trendingTV || []).filter((i: any) => i.category === "series");
    const all = [...fromTrending, ...fromTV];
    const seen = new Set<string>();
    return all.filter((i: any) => { if (seen.has(i.id)) return false; seen.add(i.id); return true; }).slice(0, 6);
  }, [trending, trendingTV]);
  const genreItems = useMemo(() => (genreMovies || []).slice(0, 6), [genreMovies]);

  const favorites = couple?.profile?.couple_profile_json?.interests?.cinema?.favorite_titles || [];

  return (
    <section className="space-y-6">
      {/* Hero */}
      <div className="hero-mesh overflow-hidden rounded-[2.5rem] border border-white/8 p-6 md:p-8">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.34em] text-[#f4d06f]">Assistir juntos</p>
              <h2 className="mt-2 max-w-3xl text-4xl font-semibold leading-[1.04] text-white md:text-5xl">
                Filmes e séries com dados reais do TMDB
              </h2>
              <p className="mt-3 max-w-2xl text-sm text-white/72">
                Posters, sinopses, notas e gêneros vindos do The Movie Database. Trending da semana, séries em alta e filmes filtrados por gênero.
              </p>
            </div>

            {favorites.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {favorites.slice(0, 4).map((item: string) => (
                  <span key={item} className="rounded-full border border-white/10 bg-white/7 px-4 py-2 text-sm text-white/78">
                    {item}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <div className="rounded-[1.8rem] border border-white/10 bg-black/18 p-5">
              <p className="text-[11px] uppercase tracking-[0.28em] text-white/48">Filmes trending</p>
              <p className="mt-3 text-4xl font-semibold text-white">{movies.length}</p>
              <p className="mt-2 text-sm text-white/62">Os filmes mais populares desta semana.</p>
            </div>
            <div className="rounded-[1.8rem] border border-white/10 bg-black/18 p-5">
              <p className="text-[11px] uppercase tracking-[0.28em] text-white/48">Séries em alta</p>
              <p className="mt-3 text-4xl font-semibold text-white">{series.length}</p>
              <p className="mt-2 text-sm text-white/62">As séries mais assistidas agora.</p>
            </div>
            <div className="weather-badge rounded-[1.8rem] p-5">
              <p className="text-[11px] uppercase tracking-[0.28em] text-white/48">Leitura do momento</p>
              <div className="mt-3 flex items-center gap-2">
                {safeContext.icon_url && <img src={safeContext.icon_url} alt="" className="h-8 w-8" />}
                <p className="text-2xl font-semibold text-white">{safeContext.weather_label}</p>
              </div>
              <p className="mt-2 text-sm text-white/62">
                {safeContext.isRainy
                  ? "Chuva lá fora — sessão em casa com zero atrito."
                  : "Dá para escolher entre cinema na rua ou sofá em casa."}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Loading */}
      {loadingTrending && <p className="text-sm text-white/60">Buscando filmes e séries do TMDB...</p>}

      {/* Trending Movies */}
      {movies.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.32em] text-[#f4d06f]">Filmes em alta</p>
            <h3 className="mt-2 text-3xl font-semibold">Os mais populares desta semana</h3>
            <p className="mt-2 text-sm text-white/66">Trending do TMDB com poster, nota e sinopse reais.</p>
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            {movies.map((item: Recommendation) => (
              <DiscoveryCard key={item.id} item={item} userId={userId} />
            ))}
          </div>
        </motion.div>
      )}

      {/* Trending Series */}
      {series.length > 0 && (
        <div className="space-y-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.32em] text-[#f4d06f]">Séries em alta</p>
            <h3 className="mt-2 text-3xl font-semibold">Para maratonar a dois</h3>
            <p className="mt-2 text-sm text-white/66">As séries mais assistidas agora, direto do TMDB.</p>
          </div>
          <div className="grid gap-4 xl:grid-cols-3">
            {series.map((item: Recommendation) => (
              <DiscoveryCard key={item.id} item={item} userId={userId} />
            ))}
          </div>
        </div>
      )}

      {/* Genre Filter */}
      <div className="space-y-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.32em] text-[#f4d06f]">Por gênero</p>
          <h3 className="mt-2 text-3xl font-semibold">Escolher por tipo ficou fácil</h3>
          <p className="mt-2 text-sm text-white/66">Filtre por gênero e veja o que combina com a vibe da noite.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {GENRE_SECTIONS.map((g) => (
            <button
              key={g.id}
              onClick={() => setSelectedGenre(g)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition duration-200 ${
                selectedGenre.id === g.id
                  ? "bg-[#f97352] text-white shadow-[0_12px_28px_rgba(249,115,82,0.24)]"
                  : "border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              {g.title}
            </button>
          ))}
        </div>

        <div>
          <h4 className="text-2xl font-semibold text-white">{selectedGenre.title}</h4>
          <p className="mt-1 text-sm text-white/62">{selectedGenre.subtitle}</p>
        </div>

        {loadingGenre ? (
          <div className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map((i) => <div key={i} className="skeleton h-72 rounded-[1.5rem]" />)}
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-3">
            {genreItems.map((item: Recommendation) => (
              <DiscoveryCard key={item.id} item={item} userId={userId} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
