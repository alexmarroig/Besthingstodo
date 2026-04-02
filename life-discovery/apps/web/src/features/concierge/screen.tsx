"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import DiscoveryCard from "@/components/discovery/discovery-card";
import { fetchCoupleMe, fetchRecommendations, fetchUserContext } from "@/shared/api/client";
import { getRecommendationSourceMeta } from "@/shared/source";
import { getUserId } from "@/shared/storage";

function groupBySource(items: any[]) {
  const map = new Map<string, { label: string; badge: string; items: any[] }>();

  for (const item of items) {
    const meta = getRecommendationSourceMeta(item);
    const key = `${meta.label}::${meta.badge}`;
    const current = map.get(key);
    if (current) {
      current.items.push(item);
      continue;
    }
    map.set(key, { label: meta.label, badge: meta.badge, items: [item] });
  }

  return Array.from(map.values())
    .map((group) => ({ ...group, items: group.items.slice(0, 3) }))
    .filter((group) => group.items.length > 0)
    .slice(0, 4);
}

export default function ConciergeScreen() {
  const userId = getUserId();
  const { data: couple } = useQuery({ queryKey: ["couple-me"], queryFn: fetchCoupleMe });
  const { data: context } = useQuery({ queryKey: ["context", couple?.city || "Sao Paulo"], queryFn: () => fetchUserContext(couple?.city || "Sao Paulo") });
  const { data: recommendations, isLoading } = useQuery({
    queryKey: ["collections-recos", userId, couple?.city || "Sao Paulo", context?.weather || "unknown"],
    queryFn: () => fetchRecommendations(userId, couple?.city || "Sao Paulo", undefined, context?.weather || undefined, couple || undefined, context || undefined)
  });

  const items = recommendations || [];
  const topPicks = items.slice(0, 4);
  const diningAndDelivery = items.filter((item) => item.domain === "dining_out" || item.domain === "delivery").slice(0, 4);
  const cinemaAndCulture = items.filter((item) => item.domain === "movies_series" || item.domain === "events_exhibitions").slice(0, 4);
  const personalized = items.filter((item) => item.personalization_label || item.related_favorite).slice(0, 4);
  const bySource = useMemo(() => groupBySource(items), [items]);
  const hasLiveItems = items.length > 0;

  return (
    <section className="space-y-6">
      <div className="hero-mesh overflow-hidden rounded-[2.5rem] border border-white/8 p-6 md:p-8">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.34em] text-[#f4d06f]">Plataforma de recomendacoes</p>
              <h2 className="mt-2 max-w-3xl text-4xl font-semibold leading-[1.04] text-white md:text-5xl">
                Colecoes prontas para decidir sem depender de chat.
              </h2>
              <p className="mt-3 max-w-2xl text-sm text-white/72">
                Esta area deixou de ser conversa com IA. Agora ela funciona como uma vitrine editorial de recomendacoes reais,
                organizadas por fonte, contexto e aderencia ao casal.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-white/10 bg-white/7 px-4 py-2 text-sm text-white/78">sem chat</span>
              <span className="rounded-full border border-white/10 bg-white/7 px-4 py-2 text-sm text-white/78">mais fonte oficial</span>
              <span className="rounded-full border border-white/10 bg-white/7 px-4 py-2 text-sm text-white/78">mais criterio editorial</span>
              <span className="rounded-full border border-white/10 bg-white/7 px-4 py-2 text-sm text-white/78">{context?.weather_label || "contexto estavel"}</span>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <div className="rounded-[1.8rem] border border-white/10 bg-black/18 p-5">
              <p className="text-[11px] uppercase tracking-[0.28em] text-white/48">Pistas fortes</p>
              <p className="mt-3 text-4xl font-semibold text-white">{items.length}</p>
              <p className="mt-2 text-sm text-white/62">recomendacoes ordenadas pela curadoria do casal.</p>
            </div>
            <div className="rounded-[1.8rem] border border-white/10 bg-black/18 p-5">
              <p className="text-[11px] uppercase tracking-[0.28em] text-white/48">Fontes em destaque</p>
              <p className="mt-3 text-4xl font-semibold text-white">{bySource.length}</p>
              <p className="mt-2 text-sm text-white/62">origens fortes na tela, sem misturar tudo como feed opaco.</p>
            </div>
            <div className="rounded-[1.8rem] border border-white/10 bg-black/18 p-5">
              <p className="text-[11px] uppercase tracking-[0.28em] text-white/48">Mais pessoais</p>
              <p className="mt-3 text-4xl font-semibold text-white">{personalized.length}</p>
              <p className="mt-2 text-sm text-white/62">ligadas diretamente a favoritos, wishlist ou sinais reais do casal.</p>
            </div>
          </div>
        </div>
      </div>

      {isLoading ? <p className="text-sm text-white/60">Organizando as colecoes recomendadas...</p> : null}

      {!hasLiveItems ? (
        <div className="editorial-card rounded-[2rem] p-5 text-sm text-white/70">
          Sem recomendacoes reais suficientes para montar as colecoes agora. Esta tela nao inventa respostas de chat nem sugestoes sintéticas.
        </div>
      ) : null}

      {topPicks.length ? (
        <div className="space-y-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.32em] text-[#f4d06f]">Mais confiaveis agora</p>
            <h3 className="mt-2 text-3xl font-semibold">As melhores apostas do momento</h3>
            <p className="mt-2 text-sm text-white/66">O ponto de partida mais forte quando voces so querem abrir a plataforma e decidir.</p>
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            {topPicks.map((item) => (
              <DiscoveryCard key={item.id} item={item} userId={userId} />
            ))}
          </div>
        </div>
      ) : null}

      {bySource.length ? (
        <div className="space-y-5">
          <div>
            <p className="text-[11px] uppercase tracking-[0.32em] text-[#f4d06f]">Por fonte</p>
            <h3 className="mt-2 text-3xl font-semibold">Colecoes que mostram de onde vem a recomendacao</h3>
            <p className="mt-2 text-sm text-white/66">Fonte forte ajuda a confiar. Aqui cada bloco mostra uma origem clara em vez de esconder tudo num ranking opaco.</p>
          </div>

          {bySource.map((group) => (
            <div key={group.label} className="space-y-3">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h4 className="text-2xl font-semibold text-white">{group.label}</h4>
                  <p className="mt-1 text-sm text-white/62">{group.badge}</p>
                </div>
              </div>
              <div className="grid gap-4 xl:grid-cols-3">
                {group.items.map((item) => (
                  <DiscoveryCard key={item.id} item={item} userId={userId} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {personalized.length ? (
        <div className="space-y-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.32em] text-[#f4d06f]">Mais pessoais</p>
            <h3 className="mt-2 text-3xl font-semibold">Favoritos, parecidos e sinais reais do casal</h3>
            <p className="mt-2 text-sm text-white/66">Aqui entram favoritos diretos e lugares que se parecem com o repertorio de voces.</p>
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            {personalized.map((item) => (
              <DiscoveryCard key={item.id} item={item} userId={userId} />
            ))}
          </div>
        </div>
      ) : null}

      {(diningAndDelivery.length || cinemaAndCulture.length) ? (
        <div className="grid gap-6 xl:grid-cols-2">
          {diningAndDelivery.length ? (
            <div className="space-y-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.32em] text-[#f4d06f]">Comer bem</p>
                <h3 className="mt-2 text-3xl font-semibold">Jantar e delivery com mais aderencia</h3>
                <p className="mt-2 text-sm text-white/66">Restaurante e pedido em casa no mesmo lugar, mas sem perder o criterio da noite a dois.</p>
              </div>
              <div className="grid gap-4">
                {diningAndDelivery.map((item) => (
                  <DiscoveryCard key={item.id} item={item} userId={userId} />
                ))}
              </div>
            </div>
          ) : null}

          {cinemaAndCulture.length ? (
            <div className="space-y-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.32em] text-[#f4d06f]">Ver e sair</p>
                <h3 className="mt-2 text-3xl font-semibold">Cinema, series e cultura numa leitura so</h3>
                <p className="mt-2 text-sm text-white/66">Para quando a decisao real e entre sair para um programa cultural ou puxar algo bom para assistir juntos.</p>
              </div>
              <div className="grid gap-4">
                {cinemaAndCulture.map((item) => (
                  <DiscoveryCard key={item.id} item={item} userId={userId} />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
