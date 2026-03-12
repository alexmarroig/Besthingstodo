"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import DiscoveryCard from "../../components/discovery/discovery-card";
import { fetchRecommendations } from "../../lib/api";
import { getUserId } from "../../lib/storage";
import { Recommendation } from "../../lib/types";

const sections: Array<{ key: Recommendation["domain"]; title: string; subtitle: string }> = [
  { key: "events_exhibitions", title: "Cultura e eventos", subtitle: "Boas apostas para sair da rotina sem complicar a logística." },
  { key: "dining_out", title: "Para jantar fora", subtitle: "Lugares para transformar a noite em encontro memorável." },
  { key: "movies_series", title: "Cinema e tela", subtitle: "Sugestões para clima mais intimista ou pós-trabalho." },
  { key: "delivery", title: "Ficar em casa", subtitle: "Quando a melhor ideia é desacelerar sem abrir mão da experiência." }
];

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

  const topForTonight = items.slice(0, 4);
  const savedReady = items.filter((item) => (item.tags || []).length >= 3).length;
  const nearbyCount = items.filter((item) => item.location && item.location !== item.city).length;

  const onCardAction = (item: Recommendation, action: "like" | "dislike" | "save" | "skip") => {
    if (action === "like" || action === "dislike") {
      setHiddenIds((prev) => (prev.includes(item.id) ? prev : [...prev, item.id]));
    }
  };

  return (
    <section className="space-y-6">
      <div className="hero-mesh glass overflow-hidden rounded-[2rem] p-6 md:p-8">
        <div className="grid gap-6 md:grid-cols-[1.4fr_0.9fr] md:items-end">
          <div className="space-y-4">
            <p className="text-sm uppercase tracking-[0.28em] text-[#ffd166]">Pronto para uso</p>
            <div className="space-y-2">
              <h2 className="max-w-2xl text-3xl font-semibold leading-tight md:text-5xl">Descubram o que vale a pena fazer hoje sem depender de mil abas abertas.</h2>
              <p className="max-w-2xl text-sm text-white/72 md:text-base">
                O app agora consegue operar com curadoria local mesmo quando parte do backend estiver indisponível.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-sm">
              <button onClick={() => setWeather("clear")} className={`rounded-full px-4 py-2 ${weather === "clear" ? "bg-primary text-white" : "bg-white/10 text-white/80"}`}>
                Noite aberta
              </button>
              <button onClick={() => setWeather("rain")} className={`rounded-full px-4 py-2 ${weather === "rain" ? "bg-primary text-white" : "bg-white/10 text-white/80"}`}>
                Com chuva
              </button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 md:grid-cols-1">
            <div className="rounded-3xl border border-white/10 bg-black/15 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-white/55">Sugestões</p>
              <p className="mt-2 text-3xl font-semibold">{items.length}</p>
              <p className="mt-1 text-sm text-white/65">itens úteis agora</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-black/15 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-white/55">Com contexto</p>
              <p className="mt-2 text-3xl font-semibold">{savedReady}</p>
              <p className="mt-1 text-sm text-white/65">com tags e sinal suficiente</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-black/15 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-white/55">Fora de casa</p>
              <p className="mt-2 text-3xl font-semibold">{nearbyCount}</p>
              <p className="mt-1 text-sm text-white/65">com local definido</p>
            </div>
          </div>
        </div>
      </div>

      {isLoading ? <p className="text-sm text-white/60">Carregando sugestões para vocês...</p> : null}

      {!isLoading && items.length === 0 ? (
        <div className="glass rounded-3xl p-5 text-sm text-white/80">
          Nenhuma recomendação apareceu. Vale verificar as APIs ou recarregar os dados locais.
        </div>
      ) : null}

      <div className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h3 className="text-2xl font-semibold">Para hoje à noite</h3>
            <p className="text-sm text-white/65">As quatro opções mais promissoras para sair do zero mais rápido.</p>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {topForTonight.map((item) => (
            <DiscoveryCard key={item.id} item={item} userId={userId} onAction={onCardAction} />
          ))}
        </div>
      </div>

      {sections.map((section) => {
        const sectionItems = items.filter((item) => item.domain === section.key);
        if (sectionItems.length === 0) return null;

        return (
          <div key={section.key} className="space-y-3">
            <div>
              <h3 className="text-xl font-semibold text-[#ffd166]">{section.title}</h3>
              <p className="text-sm text-white/65">{section.subtitle}</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {sectionItems.map((item) => (
                <DiscoveryCard key={item.id} item={item} userId={userId} onAction={onCardAction} />
              ))}
            </div>
          </div>
        );
      })}
    </section>
  );
}
