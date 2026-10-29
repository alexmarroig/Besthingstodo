"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MapPinned } from "lucide-react";

import { buildFallbackContext, curateRecommendations } from "@/features/catalog/curation";
import { fetchCoupleMe, fetchRecommendationSources, fetchUserContext } from "@/shared/api/client";
import { RECOMMENDATION_POOL_LIMIT } from "@/shared/api/config";
import { useContinualLearning } from "@/shared/hooks/use-continual-learning";
import { getUserId } from "@/shared/storage";

const SOURCE_STALE_MS = 5 * 60_000;

const ExperienceMap = dynamic(() => import("@/components/discovery/experience-map"), {
  ssr: false,
  loading: () => (
    <div className="surface flex min-h-[340px] items-center justify-center p-6">
      <div className="space-y-3 text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-[#ff7a59]" />
        <p className="text-sm text-white/45">Carregando radar de bairros e mapa interativo…</p>
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

  const { feedbackHistory, version: mlVersion, insights } = useContinualLearning(couple, context);

  const items = useMemo(() => {
    void mlVersion;
    if (!sources.length) return [];
    return curateRecommendations(sources, {
      context: context || buildFallbackContext(city),
      couple: couple || undefined,
      feedback: feedbackHistory,
      limit: RECOMMENDATION_POOL_LIMIT,
    });
  }, [sources, context, couple, city, feedbackHistory, mlVersion]);

  const neighborhoods = useMemo(() => {
    const set = new Set<string>();
    for (const item of items) {
      if (item.neighborhood) set.add(item.neighborhood);
    }
    return set.size;
  }, [items]);

  return (
    <section className="space-y-7">
      <header className="hero-mesh animate-fade-up rounded-[2rem] border border-white/10 p-6 sm:p-8">
        <div className="space-y-2">
          <p className="inline-flex items-center gap-1.5 text-xs font-medium text-[#f4d06f]">
            <MapPinned className="h-3.5 w-3.5" />
            <span>Explorar a Cidade & Radar Geográfico IA</span>
          </p>
          <h2 className="font-display text-3xl font-semibold text-white sm:text-4xl">
            São Paulo por Bairro
          </h2>
          <p className="max-w-xl text-sm leading-relaxed text-white/65">
            Experiências agrupadas por região, distância e afinidade aprendida do casal — com mapa interativo embutido e
            rotas diretas no GPS.
          </p>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <span className="pill">{items.length} sugestões mapeadas</span>
          {neighborhoods > 0 ? <span className="pill">{neighborhoods} bairros ativos</span> : null}
          {couple?.neighborhood ? <span className="pill-accent">Base: {couple.neighborhood}</span> : null}
          <span className="pill">IA {insights.confidencePercent}% calibrada</span>
        </div>
      </header>

      {isLoading ? (
        <div className="surface min-h-[340px] shimmer" />
      ) : items.length > 0 ? (
        <div className="animate-slide-up stagger-2 overflow-hidden rounded-[2rem] ring-1 ring-white/[0.08]">
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
