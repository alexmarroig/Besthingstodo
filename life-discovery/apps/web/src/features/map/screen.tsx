"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { fetchCoupleMe, fetchRecommendations, fetchUserContext } from "@/shared/api/client";
import { getUserId } from "@/shared/storage";

const ExperienceMap = dynamic(() => import("@/components/discovery/experience-map"), {
  ssr: false,
  loading: () => <div className="editorial-card rounded-[2rem] p-5 text-sm text-white/72">Carregando visão de bairros...</div>
});

export default function MapScreen() {
  const userId = getUserId();
  const [focus, setFocus] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const value = params.get("focus") || undefined;
    setFocus(value);
  }, []);

  const { data: couple } = useQuery({ queryKey: ["couple-me"], queryFn: fetchCoupleMe });
  const { data: context } = useQuery({ queryKey: ["context", couple?.city || "Sao Paulo"], queryFn: () => fetchUserContext(couple?.city || "Sao Paulo") });
  const { data } = useQuery({
    queryKey: ["map-recos", userId, couple?.city || "Sao Paulo", context?.weather || "unknown"],
    queryFn: () => fetchRecommendations(userId, couple?.city || "Sao Paulo", undefined, context?.weather || undefined, couple || undefined, context || undefined)
  });
  const hasLiveItems = (data || []).length > 0;

  return (
    <section className="space-y-5">
      <div className="glass rounded-[2.2rem] p-6">
        <p className="text-[11px] uppercase tracking-[0.32em] text-[#f4d06f]">Leitura espacial</p>
        <h2 className="mt-2 text-4xl font-semibold">Bairros e deslocamento</h2>
        <p className="mt-3 max-w-3xl text-sm text-white/68">
          Em vez de um mapa genérico, esta tela organiza as opções por bairro, distância e tipo de noite que faz sentido agora.
        </p>
      </div>
      {hasLiveItems ? (
        <ExperienceMap items={data || []} focusTitle={focus} />
      ) : (
        <div className="editorial-card rounded-[2rem] p-5 text-sm text-white/72">
          Sem recomendações reais suficientes para compor a leitura por bairros agora. Preferi mostrar um estado honesto em vez de um mapa artificial.
        </div>
      )}
    </section>
  );
}
