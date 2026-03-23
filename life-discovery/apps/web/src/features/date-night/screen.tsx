"use client";

import { useMutation, useQuery } from "@tanstack/react-query";

import DateNightPlanCard from "@/components/date-night/plan-card";
import { fetchCoupleMe, fetchRecommendations, fetchUserContext, generateDateNightPlan } from "@/shared/api/client";
import { getUserId } from "@/shared/storage";

export default function DateNightScreen() {
  const userId = getUserId();
  const { data: couple } = useQuery({ queryKey: ["couple-me"], queryFn: fetchCoupleMe });
  const { data: context } = useQuery({ queryKey: ["context", couple?.city || "Sao Paulo"], queryFn: () => fetchUserContext(couple?.city || "Sao Paulo") });
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

  return (
    <section className="space-y-5">
      <div className="glass rounded-[2.2rem] p-6">
        <p className="text-[11px] uppercase tracking-[0.32em] text-[#f4d06f]">Roteiro editorial</p>
        <h2 className="mt-2 text-4xl font-semibold">Noite a Dois</h2>
        <p className="mt-3 max-w-3xl text-sm text-white/68">
          Em vez de roteiro genérico, esta tela monta uma noite com começo, meio e fim a partir das sugestões mais aderentes ao casal e ao contexto de hoje.
        </p>
        <button onClick={() => mutation.mutate()} className="mt-5 rounded-full bg-[#f97352] px-5 py-3 text-sm font-medium text-white shadow-[0_18px_35px_rgba(249,115,82,0.28)]">
          Montar plano da noite
        </button>
      </div>

      {mutation.data ? (
        <DateNightPlanCard plan={mutation.data} />
      ) : (
        <div className="editorial-card rounded-[2rem] p-5 text-sm text-white/70">
          {hasLiveRecommendations
            ? "O plano vai combinar um aquecimento leve, um momento cultural e um fechamento confortável, respeitando clima, restrições e estilo do casal."
            : "Sem recomendações reais suficientes, esta tela não gera roteiro sintético. Assim que a base live estiver boa, o plano sai só de conteúdo real."}
        </div>
      )}
    </section>
  );
}

