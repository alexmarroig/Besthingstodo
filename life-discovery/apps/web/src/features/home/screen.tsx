"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import DiscoveryCard from "@/components/discovery/discovery-card";
import { buildDayBrief, buildFallbackContext, pickForVibe } from "@/features/catalog/curation";
import { fetchCoupleMe, fetchRecommendations, fetchUserContext } from "@/shared/api/client";
import { getUserId } from "@/shared/storage";

const sections = [
  { key: "romantic" as const, title: "Com cara de date de verdade", subtitle: "Boas apostas para vocês saírem do automático sem cair no clichê." },
  { key: "cultural" as const, title: "Cultura que rende conversa", subtitle: "Sugestões com repertório, mas sem cara de tarefa ou programa técnico." },
  { key: "nearby" as const, title: "Mais perto e mais fácil", subtitle: "Quando a prioridade é decidir rápido e não transformar a noite em logística." },
  { key: "cozy" as const, title: "Pequeno, gostoso e sem barulho", subtitle: "Rolês que respeitam o ritmo do casal e favorecem presença." }
];

export default function HomeScreen() {
  const userId = getUserId();
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);

  const { data: couple } = useQuery({ queryKey: ["couple-me"], queryFn: fetchCoupleMe });
  const { data: context } = useQuery({ queryKey: ["context", couple?.city || "Sao Paulo"], queryFn: () => fetchUserContext(couple?.city || "Sao Paulo") });
  const { data, isLoading } = useQuery({
    queryKey: ["home-recos", userId, couple?.city || "Sao Paulo", context?.weather || "unknown"],
    queryFn: () => fetchRecommendations(userId, couple?.city || "Sao Paulo", undefined, context?.weather || undefined, couple || undefined, context || undefined)
  });
  const { data: deliveryData } = useQuery({
    queryKey: ["home-delivery", userId, couple?.city || "Sao Paulo", context?.weather || "unknown"],
    queryFn: () => fetchRecommendations(userId, couple?.city || "Sao Paulo", "delivery", context?.weather || undefined, couple || undefined, context || undefined)
  });
  const { data: watchData } = useQuery({
    queryKey: ["home-watch-preview", userId, couple?.city || "Sao Paulo", context?.weather || "unknown"],
    queryFn: () => fetchRecommendations(userId, couple?.city || "Sao Paulo", "movies_series", context?.weather || undefined, couple || undefined, context || undefined)
  });

  const items = useMemo(() => (data || []).filter((item) => !hiddenIds.includes(item.id)), [data, hiddenIds]);
  const deliveryItems = useMemo(() => (deliveryData || []).filter((item) => !hiddenIds.includes(item.id)).slice(0, 3), [deliveryData, hiddenIds]);
  const watchPreviewItems = useMemo(
    () =>
      (watchData || [])
        .filter((item) => !hiddenIds.includes(item.id))
        .filter((item) => item.category === "movie" || item.category === "series")
        .slice(0, 3),
    [watchData, hiddenIds]
  );
  const brief = useMemo(() => buildDayBrief(items, context || buildFallbackContext(couple?.city || "Sao Paulo"), couple || undefined), [items, context, couple]);
  const heroCards = items.slice(0, 4);
  const hasLiveItems = items.length > 0;

  const onCardAction = (id: string, action: "like" | "dislike" | "save" | "skip") => {
    if (action === "dislike") {
      setHiddenIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    }
  };

  return (
    <section className="space-y-7">
      <div className="hero-mesh overflow-hidden rounded-[2.5rem] border border-white/8 p-6 md:p-8">
        <div className="grid gap-8 lg:grid-cols-[1.25fr_0.85fr]">
          <div className="space-y-5">
            <div className="space-y-3">
              <p className="text-[11px] uppercase tracking-[0.34em] text-[#f4d06f]">Brief do dia</p>
              <h2 className="max-w-3xl text-4xl font-semibold leading-[1.02] text-white md:text-6xl">{brief.headline}</h2>
              <p className="max-w-2xl text-base text-white/72">{brief.summary}</p>
            </div>

            <div className="flex flex-wrap gap-2">
              {brief.chips.map((chip) => (
                <span key={chip} className="rounded-full border border-white/10 bg-white/7 px-4 py-2 text-sm text-white/78">
                  {chip}
                </span>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <div className="rounded-[1.8rem] border border-white/10 bg-black/18 p-5">
              <p className="text-[11px] uppercase tracking-[0.28em] text-white/48">Curadas para hoje</p>
              <p className="mt-3 text-4xl font-semibold text-white">{items.length}</p>
              <p className="mt-2 text-sm text-white/62">Entraram no feed depois de filtrar sugestões com cara de curso, bar ou ruído.</p>
            </div>
            <div className="rounded-[1.8rem] border border-white/10 bg-black/18 p-5">
              <p className="text-[11px] uppercase tracking-[0.28em] text-white/48">Leitura do clima</p>
              <p className="mt-3 text-2xl font-semibold text-white">{context?.weather_label || "tempo estável"}</p>
              <p className="mt-2 text-sm text-white/62">{context?.weather_note || "Priorizei lugares confortáveis mesmo sem clima ao vivo."}</p>
            </div>
            <div className="rounded-[1.8rem] border border-white/10 bg-black/18 p-5">
              <p className="text-[11px] uppercase tracking-[0.28em] text-white/48">Tom da noite</p>
              <p className="mt-3 text-2xl font-semibold text-white">calmo + cultural</p>
              <p className="mt-2 text-sm text-white/62">Sem álcool, sem lotação e com logística que não mata a espontaneidade.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.32em] text-[#f4d06f]">Prioridade</p>
            <h3 className="mt-2 text-3xl font-semibold">As melhores apostas para sair do zero</h3>
          </div>
        </div>

        {isLoading ? <p className="text-sm text-white/60">Montando a curadoria de hoje...</p> : null}

        {hasLiveItems ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {heroCards.map((item) => (
              <DiscoveryCard key={item.id} item={item} userId={userId} onAction={(_, action) => onCardAction(item.id, action)} />
            ))}
          </div>
        ) : (
          <div className="editorial-card rounded-[2rem] p-5 text-sm text-white/72">
            Ainda não recebi recomendações reais suficientes do backend para montar uma curadoria confiável. Assim que a base live estiver populada, esta tela passa a mostrar só conteúdo real.
          </div>
        )}
      </div>

      {watchPreviewItems.length || deliveryItems.length ? (
        <div className="grid gap-6 xl:grid-cols-2">
          {watchPreviewItems.length ? (
            <div className="space-y-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.32em] text-[#f4d06f]">Se a noite for em casa</p>
                <h3 className="mt-2 text-3xl font-semibold">Filmes e series mais sugeridos</h3>
                <p className="mt-2 text-sm text-white/66">O que eu colocaria primeiro para voces verem juntos hoje, sem transformar isso numa lista aleatoria de plataforma.</p>
              </div>
              <div className="grid gap-4">
                {watchPreviewItems.map((item) => (
                  <DiscoveryCard key={item.id} item={item} userId={userId} onAction={(_, action) => onCardAction(item.id, action)} />
                ))}
              </div>
            </div>
          ) : null}

          {deliveryItems.length ? (
            <div className="space-y-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.32em] text-[#f4d06f]">Em casa hoje</p>
                <h3 className="mt-2 text-3xl font-semibold">Delivery que ainda parece date</h3>
                <p className="mt-2 text-sm text-white/66">Pedidos com mais cara de noite gostosa a dois do que comida jogada para resolver fome.</p>
              </div>
              <div className="grid gap-4">
                {deliveryItems.map((item) => (
                  <DiscoveryCard key={item.id} item={item} userId={userId} onAction={(_, action) => onCardAction(item.id, action)} />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {hasLiveItems ? sections.map((section) => {
        const sectionItems = pickForVibe(items, section.key).slice(0, 3);
        if (sectionItems.length === 0) return null;

        return (
          <div key={section.key} className="space-y-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.32em] text-[#f4d06f]">Vibe</p>
              <h3 className="mt-2 text-3xl font-semibold">{section.title}</h3>
              <p className="mt-2 text-sm text-white/66">{section.subtitle}</p>
            </div>
            <div className="grid gap-4 xl:grid-cols-3">
              {sectionItems.map((item) => (
                <DiscoveryCard key={item.id} item={item} userId={userId} onAction={(_, action) => onCardAction(item.id, action)} />
              ))}
            </div>
          </div>
        );
      }) : null}
    </section>
  );
}


