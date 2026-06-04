"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { buildFallbackContext, curateRecommendations } from "@/features/catalog/curation";
import { fetchCoupleMe, fetchRecommendationSources, fetchUserContext } from "@/shared/api/client";
import { RECOMMENDATION_POOL_LIMIT } from "@/shared/api/config";
import { getFeedbackHistory, getUserId } from "@/shared/storage";

const SOURCE_STALE_MS = 5 * 60_000;

const ExperienceMap = dynamic(() => import("@/components/discovery/experience-map"), {
  ssr: false,
  loading: () => (
    <div className="surface flex min-h-[320px] items-center justify-center p-6">
      <div className="space-y-3 text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-[#ff7a59]" />
        <p className="text-sm text-white/45">Carregando mapa de bairros…</p>
      </div>
    </div>
  ),
});

export default function MapScreen() {
  const userId = getUserId();
  const [focus, setFocus] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    setFocus(params.get("focus") || undefined);
  }, []);

  const { data: couple } = useQuery({ queryKey: ["couple-me"], queryFn: fetchCoupleMe });
  const city = couple?.city || "Sao Paulo";

  const { data: context } = useQuery({
    queryKey: ["context", city, couple?.neighborhood || ""],
    queryFn: () => fetchUserContext(couple || undefined),
    staleTime: SOURCE_STALE_MS,
  });

  const { data: sources = [], isLoading } = useQuery({
    queryKey: ["recommendation-sources", userId, city],
    queryFn: () => fetchRecommendationSources(city),
    staleTime: SOURCE_STALE_MS,
  });

  const items = useMemo(() => {
    if (!sources.length) return [];
    return curateRecommendations(sources, {
      context: context || buildFallbackContext(city),
      couple: couple || undefined,
      feedback: getFeedbackHistory(),
      limit: RECOMMENDATION_POOL_LIMIT,
    });
  }, [sources, context, couple, city]);

  const neighborhoods = useMemo(() => {
    const set = new Set<string>();
    for (const item of items) {
      if (item.neighborhood) set.add(item.neighborhood);
    }
    return set.size;
  }, [items]);

  return (
    <section className="space-y-8">
      <header className="animate-fade-up space-y-4">
        <div className="space-y-2">
          <p className="text-xs text-white/45">Explorar a cidade</p>
          <h2 className="font-display text-3xl font-semibold text-white sm:text-4xl">Por bairro</h2>
          <p className="max-w-lg text-sm text-white/55">
            Sugestões organizadas por distância e tipo de noite — sem mapa genérico.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="pill">{items.length} sugestões</span>
          {neighborhoods > 0 ? <span className="pill">{neighborhoods} bairros</span> : null}
          {couple?.neighborhood ? <span className="pill-accent">{couple.neighborhood}</span> : null}
        </div>
      </header>

      {isLoading ? (
        <div className="surface min-h-[320px] shimmer" />
      ) : items.length > 0 ? (
        <div className="animate-slide-up stagger-2 overflow-hidden rounded-[1.75rem] ring-1 ring-white/[0.06]">
          <ExperienceMap items={items} focusTitle={focus} />
        </div>
      ) : (
        <div className="surface p-5 text-sm text-white/55">
          Sem sugestões suficientes para montar a leitura por bairros agora.
        </div>
      )}
    </section>
  );
}
