"use client";

import { useEffect, useMemo } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";

import CoupleWeatherBadge from "@/components/discovery/couple-weather-badge";
import DateNightPlanCard from "@/components/date-night/plan-card";
import { buildFallbackContext, curateRecommendations } from "@/features/catalog/curation";
import { fetchCoupleMe, fetchRecommendationSources, fetchUserContext, generateDateNightPlan } from "@/shared/api/client";
import { RECOMMENDATION_POOL_LIMIT } from "@/shared/api/config";
import { getFeedbackHistory, getUserId } from "@/shared/storage";

const SOURCE_STALE_MS = 5 * 60_000;

export default function DateNightScreen() {
  const userId = getUserId();
  const { data: couple } = useQuery({ queryKey: ["couple-me"], queryFn: fetchCoupleMe });
  const city = couple?.city || "Sao Paulo";

  const { data: context } = useQuery({
    queryKey: ["context", city, couple?.neighborhood || ""],
    queryFn: () => fetchUserContext(couple || undefined),
    staleTime: SOURCE_STALE_MS,
  });

  const { data: sources = [] } = useQuery({
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

  const mutation = useMutation({
    mutationFn: () =>
      generateDateNightPlan(userId, city, {
        recommendations,
        context: context || buildFallbackContext(city),
        couple: couple || undefined,
      }),
  });

  const hasLiveRecommendations = recommendations.length > 0;
  const canGenerate = hasLiveRecommendations && !!context && !!couple;

  useEffect(() => {
    if (!canGenerate) return;
    if (mutation.data || mutation.isPending) return;
    mutation.mutate();
  }, [canGenerate, mutation, mutation.data, mutation.isPending]);

  return (
    <section className="space-y-8">
      <header className="animate-fade-up space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 space-y-2">
            <p className="text-xs text-white/45">Roteiro pronto</p>
            <h2 className="font-display text-3xl font-semibold text-white sm:text-4xl">Noite a Dois</h2>
            <p className="max-w-md text-sm text-white/55">
              Três momentos automáticos com base no clima, horário e perfil de vocês.
            </p>
          </div>
          <CoupleWeatherBadge context={context} couple={couple || undefined} compact />
        </div>

        <button
          type="button"
          onClick={() => mutation.mutate()}
          disabled={!canGenerate || mutation.isPending}
          className="btn-primary disabled:cursor-not-allowed disabled:opacity-50"
        >
          {mutation.isPending ? "Montando roteiro…" : "Atualizar roteiro"}
        </button>
      </header>

      {mutation.isPending ? (
        <div className="grid gap-3 sm:grid-cols-3">
          {[1, 2, 3].map((idx) => (
            <div key={idx} className="experience-card aspect-[4/5] shimmer" />
          ))}
        </div>
      ) : null}

      {mutation.data ? (
        <DateNightPlanCard plan={mutation.data} />
      ) : !mutation.isPending ? (
        <div className="surface p-5 text-sm text-white/55">
          {hasLiveRecommendations
            ? "Montando o roteiro com base no clima e no perfil do casal…"
            : "Carregando sugestões — o roteiro aparece em instantes."}
        </div>
      ) : null}
    </section>
  );
}
