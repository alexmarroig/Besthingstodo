"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import DiscoveryCard from "../../components/discovery/discovery-card";
import { fetchRecommendations } from "../../lib/api";
import { getUserId } from "../../lib/storage";
import { Recommendation } from "../../lib/types";

export default function HomePage() {
  const userId = getUserId();
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);

  const { data, isLoading } = useQuery({ queryKey: ["home-recos", userId], queryFn: () => fetchRecommendations(userId) });

  const items = useMemo(() => {
    const rows = data || [];
    const byId = new Map<string, Recommendation>();
    for (const row of rows) {
      if (!byId.has(row.id)) byId.set(row.id, row);
    }
    return Array.from(byId.values()).filter((x) => !hiddenIds.includes(x.id));
  }, [data, hiddenIds]);

  const filmsAndSeries = items.filter((x) => ["movie", "series", "cinema"].includes((x.category || "").toLowerCase()));
  const culture = items.filter((x) => ["event", "exhibition"].includes((x.category || "").toLowerCase()));
  const food = items.filter((x) => ["restaurant", "cafe"].includes((x.category || "").toLowerCase()));

  const topIds = new Set<string>();
  const topForTonight = items.slice(0, 4);
  topForTonight.forEach((x) => topIds.add(x.id));

  const onCardAction = (item: Recommendation, action: "like" | "dislike" | "save" | "skip") => {
    if (action === "like" || action === "dislike") {
      setHiddenIds((prev) => (prev.includes(item.id) ? prev : [...prev, item.id]));
    }
  };

  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-semibold">Discovery Feed</h2>
      <p className="text-sm text-white/60">Somente dados reais de fontes externas (sem mock).</p>

      {isLoading ? <p className="text-sm text-white/60">Carregando eventos reais...</p> : null}

      {!isLoading && items.length === 0 ? (
        <div className="glass rounded-2xl p-4 text-sm text-white/80">
          Nenhuma recomendação real disponível agora. Inicie o crawler e rode o backend para popular com eventos reais.
        </div>
      ) : null}

      <div className="space-y-2">
        <h3 className="text-lg font-medium text-accent">Para vocês hoje</h3>
        <div className="grid gap-4 md:grid-cols-2">
          {topForTonight.map((item) => (
            <DiscoveryCard key={item.id} item={item} userId={userId} onAction={onCardAction} />
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-lg font-medium text-accent">Filmes & séries</h3>
        <div className="grid gap-4 md:grid-cols-2">
          {filmsAndSeries.map((item) => (
            <DiscoveryCard key={item.id} item={item} userId={userId} onAction={onCardAction} />
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-lg font-medium text-accent">Cultura</h3>
        <div className="grid gap-4 md:grid-cols-2">
          {culture.map((item) => (
            <DiscoveryCard key={item.id} item={item} userId={userId} onAction={onCardAction} />
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-lg font-medium text-accent">Gastronomia</h3>
        <div className="grid gap-4 md:grid-cols-2">
          {food.map((item) => (
            <DiscoveryCard key={item.id} item={item} userId={userId} onAction={onCardAction} />
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {items
          .filter((x) => !topIds.has(x.id))
          .map((item) => (
            <DiscoveryCard key={item.id} item={item} userId={userId} onAction={onCardAction} />
          ))}
      </div>
    </section>
  );
}