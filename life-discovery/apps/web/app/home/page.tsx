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
  const [weather, setWeather] = useState("clear");

  const { data, isLoading } = useQuery({
    queryKey: ["home-recos", userId, weather],
    queryFn: () => fetchRecommendations(userId, "Sao Paulo", undefined, weather)
  });

  const items = useMemo(() => {
    const rows = data || [];
    const byId = new Map<string, Recommendation>();
    for (const row of rows) {
      if (!byId.has(row.id)) byId.set(row.id, row);
    }
    return Array.from(byId.values()).filter((x) => !hiddenIds.includes(x.id));
  }, [data, hiddenIds]);

  const filmsAndSeries = items.filter((x) => (x.domain || "") === "movies_series");
  const culture = items.filter((x) => (x.domain || "") === "events_exhibitions");
  const food = items.filter((x) => (x.domain || "") === "dining_out");
  const delivery = items.filter((x) => (x.domain || "") === "delivery");

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
      <p className="text-sm text-white/60">Recomendacoes por dominio com aprendizado por feedback.</p>

      <div className="glass flex items-center gap-2 rounded-2xl p-3 text-xs">
        <span>Clima:</span>
        <button onClick={() => setWeather("clear")} className="rounded-full bg-white/10 px-3 py-1">Sem chuva</button>
        <button onClick={() => setWeather("rain")} className="rounded-full bg-white/10 px-3 py-1">Chuva</button>
      </div>

      {isLoading ? <p className="text-sm text-white/60">Carregando recomendacoes...</p> : null}

      {!isLoading && items.length === 0 ? (
        <div className="glass rounded-2xl p-4 text-sm text-white/80">
          Nenhuma recomendacao disponivel agora. Rode onboarding, seed de dados e backend.
        </div>
      ) : null}

      <div className="space-y-2">
        <h3 className="text-lg font-medium text-accent">Para voces hoje</h3>
        <div className="grid gap-4 md:grid-cols-2">
          {topForTonight.map((item) => (
            <DiscoveryCard key={item.id} item={item} userId={userId} onAction={onCardAction} />
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-lg font-medium text-accent">Filmes e series</h3>
        <div className="grid gap-4 md:grid-cols-2">
          {filmsAndSeries.map((item) => (
            <DiscoveryCard key={item.id} item={item} userId={userId} onAction={onCardAction} />
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-lg font-medium text-accent">Gastronomia no local</h3>
        <div className="grid gap-4 md:grid-cols-2">
          {food.map((item) => (
            <DiscoveryCard key={item.id} item={item} userId={userId} onAction={onCardAction} />
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-lg font-medium text-accent">Delivery</h3>
        <div className="grid gap-4 md:grid-cols-2">
          {delivery.map((item) => (
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
