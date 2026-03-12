"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import ExperienceMap from "../../components/discovery/experience-map";
import { fetchRecommendations } from "../../lib/api";
import { getUserId } from "../../lib/storage";

export default function MapPage() {
  const userId = getUserId();
  const [focus, setFocus] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const value = params.get("focus") || undefined;
    setFocus(value);
  }, []);

  const { data } = useQuery({ queryKey: ["map-recos", userId], queryFn: () => fetchRecommendations(userId) });

  return (
    <section className="space-y-4">
      <div className="glass rounded-[2rem] p-6">
        <h2 className="text-3xl font-semibold">Mapa de experiências</h2>
        <p className="mt-2 max-w-2xl text-sm text-white/68">
          Use o mapa para encontrar rapidamente opções com contexto local, mesmo se o token do Mapbox ainda não estiver configurado.
        </p>
      </div>
      <ExperienceMap items={data || []} focusTitle={focus} />
    </section>
  );
}
