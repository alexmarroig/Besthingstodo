"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import ProfileNudge from "@/components/profile/profile-nudge";
import CoupleWeatherBadge from "@/components/discovery/couple-weather-badge";
import HeroBanner from "@/components/discovery/hero-banner";
import MediaDetailModal from "@/components/discovery/media-detail-modal";
import MediaRail from "@/components/discovery/media-rail";
import QuickActions from "@/components/discovery/quick-actions";
import { buildDayBrief, buildFallbackContext, buildHomeRails, curateRecommendations } from "@/features/catalog/curation";
import { fetchCoupleMe, fetchRecommendationSources, fetchUserContext } from "@/shared/api/client";
import { RECOMMENDATION_POOL_LIMIT } from "@/shared/api/config";
import { getProfileCompleteness } from "@/shared/profile-completeness";
import { getFeedbackHistory, getUserId } from "@/shared/storage";
import Link from "next/link";
import { Recommendation } from "@life/shared-types";

const SOURCE_STALE_MS = 5 * 60_000;

const RAILS = [
  { key: "forYou", title: "Para vocês", subtitle: "Escolhas feitas sob medida pro casal", stagger: "stagger-2" },
  { key: "romantic", title: "Cara de date", subtitle: "Romântico, calmo e com boa conversa", stagger: "stagger-3" },
  { key: "restaurants", title: "Restaurantes", subtitle: "Jantar alinhado ao perfil de vocês", stagger: "stagger-4" },
  { key: "movies", title: "Filmes & séries", subtitle: "Trending com match do casal", variant: "poster" as const, stagger: "stagger-5" },
  { key: "events", title: "Eventos", subtitle: "Agenda cultural de SP", stagger: "stagger-6" },
  { key: "editorial", title: "Radar SP", subtitle: "Críticas e aberturas", stagger: "stagger-7" },
  { key: "nearby", title: "Perto de vocês", subtitle: "Menos deslocamento, mais presença", stagger: "stagger-8" },
] as const;

export default function HomeScreen() {
  const userId = getUserId();
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);
  const [selectedItem, setSelectedItem] = useState<Recommendation | null>(null);

  const { data: couple } = useQuery({ queryKey: ["couple-me"], queryFn: fetchCoupleMe });
  const city = couple?.city || "Sao Paulo";
  const greetingName = couple?.neighborhood || couple?.city || "casal";

  const { data: context } = useQuery({
    queryKey: ["context", city, couple?.neighborhood || ""],
    queryFn: () => fetchUserContext(couple || undefined),
    staleTime: SOURCE_STALE_MS,
  });

  const { data: sources = [], isLoading: sourcesLoading } = useQuery({
    queryKey: ["recommendation-sources", userId, city],
    queryFn: () => fetchRecommendationSources(city),
    staleTime: SOURCE_STALE_MS,
  });

  const recommendations = useMemo(() => {
    if (!sources.length) return [];
    return curateRecommendations(sources, {
      context: context || buildFallbackContext(city),
      couple: couple || undefined,
      feedback: getFeedbackHistory(),
      limit: RECOMMENDATION_POOL_LIMIT,
    });
  }, [sources, context, couple, city]);

  const items = useMemo(
    () => recommendations.filter((item) => !hiddenIds.includes(item.id)),
    [recommendations, hiddenIds]
  );

  const rails = useMemo(() => buildHomeRails(recommendations, hiddenIds), [recommendations, hiddenIds]);
  const { hero: heroItem, forYou, romantic, restaurants, movies, events, editorial, nearby } = rails;

  const railItems: Record<(typeof RAILS)[number]["key"], Recommendation[]> = {
    forYou: forYou.length ? forYou : items.slice(0, 10),
    romantic,
    restaurants,
    movies,
    events,
    editorial,
    nearby,
  };

  const brief = useMemo(
    () => buildDayBrief(items, context || buildFallbackContext(city), couple || undefined),
    [items, context, couple, city]
  );

  const profileCompleteness = useMemo(() => getProfileCompleteness(couple), [couple]);
  const railsLoading = sourcesLoading && recommendations.length === 0;

  const onCardAction = (id: string, action: "like" | "dislike" | "save" | "skip") => {
    if (action === "dislike") {
      setHiddenIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
      if (selectedItem?.id === id) setSelectedItem(null);
    }
  };

  return (
    <section className="space-y-8 md:space-y-10">
      <header className="animate-fade-up space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 space-y-1">
            <p className="text-xs font-medium text-white/45">Bom momento para sair</p>
            <h2 className="font-display text-3xl font-semibold leading-tight text-white sm:text-4xl">
              O roteiro de hoje, {greetingName}
            </h2>
            <p className="max-w-md text-sm leading-relaxed text-white/55">{brief.headline}</p>
          </div>
          <CoupleWeatherBadge context={context} couple={couple || undefined} compact />
        </div>

        <div className="flex flex-wrap gap-2">
          {brief.chips.slice(0, 4).map((chip) => (
            <span key={chip} className="pill">
              {chip}
            </span>
          ))}
          {!railsLoading ? (
            <span className="pill-accent">{items.length} sugestões</span>
          ) : null}
        </div>
      </header>

      <div className="animate-fade-up stagger-1">
        <QuickActions />
      </div>

      <ProfileNudge couple={couple} />

      {profileCompleteness.percent < 40 && !railsLoading ? (
        <div className="surface animate-fade-up p-5 text-center sm:p-6">
          <p className="font-display text-xl font-semibold text-white">2 minutos para sugestões perfeitas</p>
          <p className="mt-2 text-sm text-white/55">Cidade, culinárias e favoritos deixam tudo menos genérico.</p>
          <Link href="/onboarding" className="btn-primary mt-4">
            Montar perfil do casal
          </Link>
        </div>
      ) : null}

      <div className="animate-fade-up stagger-1">
        {railsLoading ? (
          <div className="experience-card overflow-hidden rounded-[1.75rem] sm:rounded-[2rem]">
            <div className="aspect-[16/10] min-h-[240px] w-full shimmer sm:aspect-[21/9]" />
          </div>
        ) : heroItem ? (
          <HeroBanner item={heroItem} onOpen={setSelectedItem} />
        ) : null}
      </div>

      {RAILS.map((rail) => (
        <MediaRail
          key={rail.key}
          title={rail.title}
          subtitle={rail.subtitle}
          items={railItems[rail.key]}
          onOpen={setSelectedItem}
          variant={"variant" in rail ? rail.variant : "landscape"}
          loading={railsLoading}
          className={`animate-slide-up ${rail.stagger}`}
        />
      ))}

      {!railsLoading && items.length === 0 ? (
        <div className="surface p-5 text-sm text-white/60">
          Nenhuma sugestão agora. Complete o perfil do casal e tente de novo.
        </div>
      ) : null}

      <MediaDetailModal
        item={selectedItem}
        userId={userId}
        onClose={() => setSelectedItem(null)}
        onAction={onCardAction}
      />
    </section>
  );
}
