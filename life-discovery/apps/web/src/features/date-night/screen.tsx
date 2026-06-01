"use client";

import { useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";

import CoupleWeatherBadge from "@/components/discovery/couple-weather-badge";
import DateNightPlanCard from "@/components/date-night/plan-card";
import { fetchCoupleMe, fetchRecommendations, fetchUserContext, generateDateNightPlan } from "@/shared/api/client";
import { getUserId } from "@/shared/storage";

export default function DateNightScreen() {
  const userId = getUserId();
  const { data: couple } = useQuery({ queryKey: ["couple-me"], queryFn: fetchCoupleMe });
  const { data: context } = useQuery({
    queryKey: ["context", couple?.city || "Sao Paulo", couple?.neighborhood || ""],
    queryFn: () => fetchUserContext(couple || undefined),
  });
  const { data: recommendations } = useQuery({
    queryKey: ["date-night-recos", userId, couple?.city || "Sao Paulo", context?.weather || "unknown"],
    queryFn: () => fetchRecommendations(userId, couple?.city || "Sao Paulo", undefined, context?.weather || undefined, couple || undefined, context || undefined)
  });

  const mutation = useMutation({
    mutationFn: () =>
      generateDateNightPlan(userId, couple?.city || "Sao Paulo", {
        recommendations: recommendations || [],
        context: context,
        couple: couple || undefined
      })
  });
  const hasLiveRecommendations = (recommendations || []).length > 0;
  const canGenerate = hasLiveRecommendations && !!context && !!couple;

  useEffect(() => {
    if (!canGenerate) return;
    if (mutation.data || mutation.isPending) return;
    mutation.mutate();
  }, [canGenerate, mutation, mutation.data, mutation.isPending]);

  return (
    <section className="space-y-5">
      <div className="glass rounded-[2.2rem] p-6">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <p className="text-[11px] uppercase tracking-[0.32em] text-[#f4d06f]">Noite a dois</p>
            <h2 className="mt-2 text-4xl font-semibold">Noite a Dois</h2>
            <p className="mt-3 max-w-3xl text-sm text-white/68">
              Plano automático baseado no clima, horário e localização de vocês. Toque para abrir cada opção.
            </p>
            <button
              onClick={() => mutation.mutate()}
              disabled={!canGenerate || mutation.isPending}
              className="mt-5 rounded-full bg-[#f97352] px-5 py-3 text-sm font-medium text-white shadow-[0_18px_35px_rgba(249,115,82,0.28)] disabled:cursor-not-allowed disabled:opacity-55"
            >
              {mutation.isPending ? "Atualizando..." : "Atualizar plano"}
            </button>
          </div>
          <CoupleWeatherBadge context={context || undefined} couple={couple || undefined} />
        </div>
      </div>

      {mutation.isPending ? (
        <div className="grid gap-4 lg:grid-cols-3">
          {[1, 2, 3].map((idx) => (
            <div key={idx} className="h-72 rounded-[1.6rem] border border-white/10 bg-white/5" />
          ))}
        </div>
      ) : null}

      {mutation.data ? (
        <DateNightPlanCard plan={mutation.data} />
      ) : (
        <div className="editorial-card rounded-[2rem] p-5 text-sm text-white/70">
          {hasLiveRecommendations
            ? "Montando plano automático com base no horário atual e no clima local."
            : "Sem recomendações suficientes agora. Assim que as opções carregarem, o plano aparece automático."}
        </div>
      )}
    </section>
  );
}

