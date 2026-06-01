"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import ProfileNudge from "@/components/profile/profile-nudge";
import CoupleWeatherBadge from "@/components/discovery/couple-weather-badge";
import HeroBanner from "@/components/discovery/hero-banner";
import MediaDetailModal from "@/components/discovery/media-detail-modal";
import MediaRail from "@/components/discovery/media-rail";
import { buildDayBrief, buildFallbackContext, buildHomeRails } from "@/features/catalog/curation";
import { fetchCoupleMe, fetchRecommendations, fetchUserContext } from "@/shared/api/client";
import { getProfileCompleteness } from "@/shared/profile-completeness";
import { getUserId } from "@/shared/storage";
import Link from "next/link";
import { Recommendation } from "@life/shared-types";

export default function HomeScreen() {
  const userId = getUserId();
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);
  const [selectedItem, setSelectedItem] = useState<Recommendation | null>(null);

  const { data: couple } = useQuery({ queryKey: ["couple-me"], queryFn: fetchCoupleMe });
  const city = couple?.city || "Sao Paulo";

  const { data: context } = useQuery({
    queryKey: ["context", city, couple?.neighborhood || ""],
    queryFn: () => fetchUserContext(couple || undefined),
  });

  const { data: recommendations, isLoading } = useQuery({
    queryKey: ["home-recos", userId, city, context?.weather || "unknown", couple?.neighborhood || ""],
    queryFn: () =>
      fetchRecommendations(userId, city, undefined, context?.weather || undefined, couple || undefined, context || undefined),
  });

  const items = useMemo(
    () => (recommendations || []).filter((item) => !hiddenIds.includes(item.id)),
    [recommendations, hiddenIds]
  );

  const rails = useMemo(() => buildHomeRails(recommendations || [], hiddenIds), [recommendations, hiddenIds]);
  const { hero: heroItem, forYou, romantic, restaurants, movies, events, editorial, nearby } = rails;

  const brief = useMemo(
    () => buildDayBrief(items, context || buildFallbackContext(city), couple || undefined),
    [items, context, couple, city]
  );

  const profileCompleteness = useMemo(() => getProfileCompleteness(couple), [couple]);

  const onCardAction = (id: string, action: "like" | "dislike" | "save" | "skip") => {
    if (action === "dislike") {
      setHiddenIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
      if (selectedItem?.id === id) setSelectedItem(null);
    }
  };

  return (
    <section className="space-y-10">
      <div className="hero-mesh overflow-hidden rounded-[2.5rem] border border-white/8 p-6 md:p-8">
        <div className="grid gap-8 lg:grid-cols-[1.25fr_0.85fr]">
          <div className="space-y-5">
            <div className="space-y-3">
              <p className="text-[11px] uppercase tracking-[0.34em] text-[#f4d06f]">Para vocês hoje</p>
              <h2 className="max-w-3xl text-4xl font-semibold leading-[1.02] text-white md:text-5xl">{brief.headline}</h2>
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

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <div className="rounded-[1.8rem] border border-white/10 bg-black/18 p-5">
              <p className="text-[11px] uppercase tracking-[0.28em] text-white/48">Escolhidas para hoje</p>
              <p className="mt-3 text-4xl font-semibold text-white">{items.length}</p>
              <p className="mt-2 text-sm text-white/62">ranking com perfil do casal + histórico de cliques.</p>
            </div>
            <CoupleWeatherBadge context={context} couple={couple || undefined} />
          </div>
        </div>
      </div>

      <ProfileNudge couple={couple} />

      {profileCompleteness.percent < 40 && !isLoading ? (
        <div className="editorial-card rounded-[2rem] p-6 text-center">
          <p className="text-lg font-semibold text-white">Monte o perfil do casal em 2 minutos</p>
          <p className="mt-2 text-sm text-white/65">
            Com cidade, culinárias e favoritos, as sugestões deixam de ser genéricas.
          </p>
          <Link
            href="/onboarding"
            className="mt-4 inline-flex rounded-full bg-[#f97352] px-6 py-3 text-sm font-medium text-white"
          >
            Começar onboarding
          </Link>
        </div>
      ) : null}

      {isLoading ? (
        <div className="rounded-[1.5rem] border border-white/10 p-6 text-sm text-white/60">Montando recomendações...</div>
      ) : null}

      {!isLoading && heroItem ? <HeroBanner item={heroItem} onOpen={setSelectedItem} /> : null}

      <MediaRail title="Para vocês" subtitle="Apostas personalizadas pelo motor de recomendação" items={forYou.length ? forYou : items.slice(0, 10)} onOpen={setSelectedItem} />
      <MediaRail title="Com cara de date" subtitle="Romântico, calmo e com boa conversa" items={romantic} onOpen={setSelectedItem} />
      <MediaRail title="Restaurantes" subtitle="Jantar perto do perfil de vocês" items={restaurants} onOpen={setSelectedItem} />
      <MediaRail title="Filmes e séries" subtitle="Trending e estreias com match do casal" items={movies} onOpen={setSelectedItem} variant="poster" />
      <MediaRail title="Eventos" subtitle="Agenda local e experiências da semana" items={events} onOpen={setSelectedItem} />
      <MediaRail title="Radar SP" subtitle="Críticas, aberturas e matérias editoriais" items={editorial} onOpen={setSelectedItem} />
      <MediaRail title="Perto e fácil" subtitle="Menos logística, mais presença" items={nearby} onOpen={setSelectedItem} />

      {!isLoading && items.length === 0 ? (
        <div className="editorial-card rounded-[2rem] p-5 text-sm text-white/72">
          Nenhuma recomendação disponível agora. Complete o cadastro do casal e tente novamente.
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
