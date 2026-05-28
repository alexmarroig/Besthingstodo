"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";

import DiscoveryCard from "@/components/discovery/discovery-card";
import { buildDayBrief, buildFallbackContext, pickForVibe } from "@/features/catalog/curation";
import { fetchCoupleMe, fetchRecommendations, fetchUserContext, fetchTrendingMovies, fetchPlaces, fetchEvents, fetchMealSuggestions } from "@/shared/api/client";
import { getUserId } from "@/shared/storage";

const sections = [
  { key: "romantic" as const, title: "Com cara de date de verdade", subtitle: "Boas apostas para vocês saírem do automático sem cair no clichê." },
  { key: "cultural" as const, title: "Cultura que rende conversa", subtitle: "Sugestões com repertório, mas sem cara de tarefa ou programa técnico." },
  { key: "nearby" as const, title: "Mais perto e mais fácil", subtitle: "Quando a prioridade é decidir rápido e não transformar a noite em logística." },
  { key: "cozy" as const, title: "Pequeno, gostoso e sem barulho", subtitle: "Rolês que respeitam o ritmo do casal e favorecem presença." },
];

export default function HomeScreen() {
  const userId = getUserId();
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);

  const { data: couple } = useQuery({ queryKey: ["couple-me"], queryFn: fetchCoupleMe });
  const { data: context } = useQuery({ queryKey: ["context", couple?.city || "Sao Paulo"], queryFn: () => fetchUserContext(couple?.city || "Sao Paulo") });

  const { data: trendingMovies } = useQuery({
    queryKey: ["trending-movies"],
    queryFn: fetchTrendingMovies,
  });

  const { data: restaurants } = useQuery({
    queryKey: ["home-restaurants"],
    queryFn: () => fetchPlaces("Sao Paulo", "catering.restaurant"),
  });

  const { data: events } = useQuery({
    queryKey: ["home-events"],
    queryFn: () => fetchEvents("Sao Paulo"),
  });

  const { data: randomMeal } = useQuery({
    queryKey: ["home-meal"],
    queryFn: () => fetchMealSuggestions("random"),
  });

  const allItems = useMemo(() => {
    const combined = [
      ...(trendingMovies || []),
      ...(restaurants || []),
      ...(events || []),
    ].filter((item) => !hiddenIds.includes(item.id));
    return combined;
  }, [trendingMovies, restaurants, events, hiddenIds]);

  const movieItems = useMemo(() => (trendingMovies || []).filter((item) => !hiddenIds.includes(item.id)).slice(0, 4), [trendingMovies, hiddenIds]);
  const restaurantItems = useMemo(() => (restaurants || []).filter((item) => !hiddenIds.includes(item.id)).slice(0, 4), [restaurants, hiddenIds]);
  const eventItems = useMemo(() => (events || []).filter((item) => !hiddenIds.includes(item.id)).slice(0, 4), [events, hiddenIds]);
  const dailyMeal = randomMeal?.[0];

  const brief = useMemo(
    () => buildDayBrief(allItems, context || buildFallbackContext(couple?.city || "Sao Paulo"), couple || undefined),
    [allItems, context, couple]
  );

  const hasContent = allItems.length > 0;

  const onCardAction = (id: string, action: "like" | "dislike" | "save" | "skip") => {
    if (action === "dislike") {
      setHiddenIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    }
  };

  return (
    <section className="space-y-7">
      {/* Hero Brief */}
      <div className="hero-mesh overflow-hidden rounded-[2.5rem] border border-white/8 p-6 md:p-8">
        <div className="grid gap-8 lg:grid-cols-[1.25fr_0.85fr]">
          <div className="space-y-5">
            <div className="space-y-3">
              <p className="text-[11px] uppercase tracking-[0.34em] text-[#f4d06f]">Brief do dia</p>
              <h2 className="max-w-3xl text-4xl font-semibold leading-[1.02] text-white md:text-6xl">{brief.headline}</h2>
              <p className="max-w-2xl text-base text-white/72">{brief.summary}</p>
            </div>

            <div className="flex flex-wrap gap-2">
              {brief.chips.map((chip) => (
                <span key={chip} className="rounded-full border border-white/10 bg-white/7 px-4 py-2 text-sm text-white/78">
                  {chip}
                </span>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <div className="rounded-[1.8rem] border border-white/10 bg-black/18 p-5">
              <p className="text-[11px] uppercase tracking-[0.28em] text-white/48">Curadas para hoje</p>
              <p className="mt-3 text-4xl font-semibold text-white">{allItems.length}</p>
              <p className="mt-2 text-sm text-white/62">recomendações de filmes, restaurantes e eventos.</p>
            </div>
            <div className="weather-badge rounded-[1.8rem] p-5">
              <p className="text-[11px] uppercase tracking-[0.28em] text-white/48">Leitura do clima</p>
              <div className="mt-3 flex items-center gap-2">
                {context?.icon_url && (
                  <img src={context.icon_url} alt="" className="h-10 w-10" />
                )}
                <p className="text-2xl font-semibold text-white">{context?.weather_label || "tempo estável"}</p>
              </div>
              <p className="mt-2 text-sm text-white/62">{context?.weather_note || "Priorizei lugares confortáveis."}</p>
            </div>
            <div className="rounded-[1.8rem] border border-white/10 bg-black/18 p-5">
              <p className="text-[11px] uppercase tracking-[0.28em] text-white/48">Fontes ativas</p>
              <p className="mt-3 text-2xl font-semibold text-white">TMDB · Geoapify · Ticketmaster</p>
              <p className="mt-2 text-sm text-white/62">Dados reais de APIs públicas, sem conteúdo inventado.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Trending Movies */}
      {movieItems.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.32em] text-[#f4d06f]">Em alta agora</p>
            <h3 className="mt-2 text-3xl font-semibold">Filmes e séries do momento</h3>
            <p className="mt-2 text-sm text-white/66">Trending desta semana no TMDB. Posters, notas e sinopses reais.</p>
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            {movieItems.map((item) => (
              <DiscoveryCard key={item.id} item={item} userId={userId} onAction={(_, action) => onCardAction(item.id, action)} />
            ))}
          </div>
        </motion.div>
      )}

      {/* Restaurants & Events side by side */}
      {(restaurantItems.length > 0 || eventItems.length > 0) && (
        <div className="grid gap-6 xl:grid-cols-2">
          {restaurantItems.length > 0 && (
            <div className="space-y-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.32em] text-[#f4d06f]">Perto de vocês</p>
                <h3 className="mt-2 text-3xl font-semibold">Restaurantes para hoje</h3>
                <p className="mt-2 text-sm text-white/66">Lugares reais encontrados pelo Geoapify perto de São Paulo.</p>
              </div>
              <div className="grid gap-4">
                {restaurantItems.map((item) => (
                  <DiscoveryCard key={item.id} item={item} userId={userId} onAction={(_, action) => onCardAction(item.id, action)} />
                ))}
              </div>
            </div>
          )}

          {eventItems.length > 0 && (
            <div className="space-y-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.32em] text-[#f4d06f]">Eventos</p>
                <h3 className="mt-2 text-3xl font-semibold">O que está acontecendo na cidade</h3>
                <p className="mt-2 text-sm text-white/66">Shows, exposições e eventos reais via Ticketmaster.</p>
              </div>
              <div className="grid gap-4">
                {eventItems.map((item) => (
                  <DiscoveryCard key={item.id} item={item} userId={userId} onAction={(_, action) => onCardAction(item.id, action)} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Daily Meal Suggestion */}
      {dailyMeal && (
        <div className="space-y-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.32em] text-[#f4d06f]">Se a noite for em casa</p>
            <h3 className="mt-2 text-3xl font-semibold">Ideia para cozinhar juntos</h3>
            <p className="mt-2 text-sm text-white/66">Receita aleatória do TheMealDB. Cada reload traz uma nova.</p>
          </div>
          <div className="recipe-card max-w-xl overflow-hidden rounded-[1.5rem]">
            {dailyMeal.image_url && (
              <div className="relative aspect-video overflow-hidden">
                <img src={dailyMeal.image_url} alt={dailyMeal.title} className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <h4 className="absolute bottom-3 left-4 text-xl font-semibold text-white drop-shadow-lg">{dailyMeal.title}</h4>
              </div>
            )}
            <div className="space-y-2 p-5">
              <div className="flex flex-wrap gap-2">
                {dailyMeal.tags?.slice(0, 3).map((tag: string) => (
                  <span key={tag} className="rounded-full bg-[#f4d06f]/12 px-3 py-1 text-[11px] text-[#f4d06f]">{tag}</span>
                ))}
              </div>
              {dailyMeal.description && (
                <p className="line-clamp-3 text-sm text-white/65">{dailyMeal.description}</p>
              )}
              {dailyMeal.youtube_url && (
                <a href={dailyMeal.youtube_url} target="_blank" rel="noopener noreferrer"
                   className="inline-flex items-center gap-1.5 rounded-full bg-red-500/15 px-3 py-2 text-xs font-medium text-red-400 transition hover:bg-red-500/25">
                  ▶ Ver no YouTube
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Vibe sections */}
      {hasContent ? sections.map((section) => {
        const sectionItems = pickForVibe(allItems, section.key).slice(0, 3);
        if (sectionItems.length === 0) return null;

        return (
          <div key={section.key} className="space-y-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.32em] text-[#f4d06f]">Vibe</p>
              <h3 className="mt-2 text-3xl font-semibold">{section.title}</h3>
              <p className="mt-2 text-sm text-white/66">{section.subtitle}</p>
            </div>
            <div className="grid gap-4 xl:grid-cols-3">
              {sectionItems.map((item) => (
                <DiscoveryCard key={item.id} item={item} userId={userId} onAction={(_, action) => onCardAction(item.id, action)} />
              ))}
            </div>
          </div>
        );
      }) : (
        <div className="editorial-card rounded-[2rem] p-5 text-sm text-white/72">
          Carregando recomendações das APIs externas. Se nenhum dado aparecer, verifique as API keys no ambiente.
        </div>
      )}
    </section>
  );
}
