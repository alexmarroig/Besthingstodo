"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BrainCircuit, Compass, Sparkles, Wand2, X } from "lucide-react";

import DiscoveryCard from "@/components/discovery/discovery-card";
import MediaDetailModal from "@/components/discovery/media-detail-modal";
import {
  buildConciergeResponse,
  buildFallbackContext,
  curateRecommendations,
} from "@/features/catalog/curation";
import { fetchCoupleMe, fetchRecommendationSources, fetchUserContext } from "@/shared/api/client";
import { RECOMMENDATION_POOL_LIMIT } from "@/shared/api/config";
import { useContinualLearning } from "@/shared/hooks/use-continual-learning";
import { getRecommendationSourceMeta } from "@/shared/source";
import {
  getConciergeMemory,
  getUserId,
  setConciergeMemory,
} from "@/shared/storage";
import { Recommendation } from "@life/shared-types";

const QUICK_PROMPTS = [
  "Jantar romântico e intimista perto de nós",
  "Lugar coberto para hoje à noite sem barulho",
  "Programa cultural + café com conversa calma",
  "Passeio econômico ou gratuito em São Paulo",
];

function groupBySource(items: Recommendation[]) {
  const map = new Map<string, { label: string; badge: string; items: Recommendation[] }>();

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
  const [promptInput, setPromptInput] = useState("");
  const [activePrompt, setActivePrompt] = useState("Jantar romântico e intimista perto de nós");
  const [memory, setMemory] = useState<string[]>(() => getConciergeMemory());
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);
  const [selectedItem, setSelectedItem] = useState<Recommendation | null>(null);

  const { data: couple } = useQuery({ queryKey: ["couple-me"], queryFn: fetchCoupleMe });
  const city = couple?.city || "Sao Paulo";

  const { data: context } = useQuery({
    queryKey: ["context", city, couple?.neighborhood || ""],
    queryFn: () => fetchUserContext(couple || undefined),
  });

  const { data: sources = [], isLoading } = useQuery({
    queryKey: ["recommendation-sources", userId, city],
    queryFn: () => fetchRecommendationSources(city),
  });

  const { feedbackHistory, version: mlVersion, insights } = useContinualLearning(couple, context);

  const safeContext = context || buildFallbackContext(city);

  const items = useMemo(() => {
    void mlVersion;
    if (!sources.length) return [];
    return curateRecommendations(sources, {
      context: safeContext,
      couple: couple || undefined,
      feedback: feedbackHistory,
      limit: RECOMMENDATION_POOL_LIMIT,
    }).filter((item) => !hiddenIds.includes(item.id));
  }, [sources, safeContext, couple, feedbackHistory, mlVersion, hiddenIds]);

  const conciergePlan = useMemo(() => {
    if (!items.length) return null;
    return buildConciergeResponse({
      message: activePrompt,
      recommendations: items,
      context: safeContext,
      couple: couple || undefined,
      memory,
    });
  }, [activePrompt, items, safeContext, couple, memory]);

  const handleApplyPrompt = (text: string) => {
    const clean = text.trim();
    if (!clean) return;
    setActivePrompt(clean);
    const updated = buildConciergeResponse({
      message: clean,
      recommendations: items,
      context: safeContext,
      couple: couple || undefined,
      memory,
    });
    setMemory(updated.memory);
    setConciergeMemory(updated.memory);
  };

  const handleClearMemory = () => {
    setMemory([]);
    setConciergeMemory([]);
    setActivePrompt("Programa leve para hoje");
  };

  const onCardAction = (id: string, action: "like" | "dislike" | "save" | "skip") => {
    if (action === "dislike") {
      setHiddenIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    }
  };

  const topPicks = items.slice(0, 4);
  const diningAndDelivery = items
    .filter((item) => item.domain === "dining_out" || item.domain === "delivery")
    .slice(0, 4);
  const cinemaAndCulture = items
    .filter((item) => item.domain === "movies_series" || item.domain === "events_exhibitions")
    .slice(0, 4);
  const radarSp = items.filter((item) => item.editorial_source || item.content_tier === "signature").slice(0, 4);
  const personalized = items.filter((item) => item.personalization_label || item.related_favorite).slice(0, 4);
  const bySource = useMemo(() => groupBySource(items), [items]);
  const hasLiveItems = items.length > 0;

  return (
    <section className="space-y-8">
      {/* Header & Metrics */}
      <div className="hero-mesh overflow-hidden rounded-[2.25rem] border border-white/10 p-6 md:p-8">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4">
            <div>
              <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#f4d06f]">
                <BrainCircuit className="h-3.5 w-3.5" />
                <span>Concierge Neural & Listas Editoriais</span>
              </p>
              <h2 className="mt-2 max-w-3xl font-display text-3xl font-semibold leading-tight text-white sm:text-4xl md:text-5xl">
                Coleções vivas e planos sob medida sem fricção
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/70">
                Combine restrições de momento (clima, orçamento, bairro, silêncio) com o aprendizado contínuo do casal (
                {insights.confidencePercent}% calibrado) para gerar planos imediatos ou navegar por fonte oficial.
              </p>
            </div>

            {/* Interactive Concierge Filter Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleApplyPrompt(promptInput);
                setPromptInput("");
              }}
              className="flex flex-col gap-2 pt-1 sm:flex-row"
            >
              <input
                type="text"
                value={promptInput}
                onChange={(e) => setPromptInput(e.target.value)}
                placeholder="Ex.: Jantar romântico coberto perto de nós sem álcool..."
                className="min-w-0 flex-1 rounded-full border border-white/12 bg-black/35 px-4 py-2.5 text-sm text-white placeholder:text-white/40 focus:border-[#ff7a59]/60 focus:outline-none"
              />
              <button type="submit" className="btn-primary shrink-0 gap-1.5 py-2.5 text-xs">
                <Wand2 className="h-3.5 w-3.5" />
                <span>Calibrar Concierge</span>
              </button>
            </form>

            <div className="flex flex-wrap gap-1.5">
              {QUICK_PROMPTS.map((qp) => (
                <button
                  key={qp}
                  type="button"
                  onClick={() => handleApplyPrompt(qp)}
                  className={`rounded-full px-3 py-1 text-xs transition ${
                    activePrompt === qp
                      ? "bg-[#ff7a59]/25 text-white ring-1 ring-[#ff7a59]/50"
                      : "border border-white/10 bg-white/[0.04] text-white/68 hover:bg-white/[0.09] hover:text-white"
                  }`}
                >
                  {qp}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <div className="rounded-[1.6rem] border border-white/10 bg-black/20 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#f4d06f]">
                Pool Curado (MMR + SGD)
              </p>
              <p className="mt-1.5 text-3xl font-semibold text-white">{items.length}</p>
              <p className="mt-1 text-xs text-white/60">recomendações ordenadas pelo perfil do casal.</p>
            </div>
            <div className="rounded-[1.6rem] border border-white/10 bg-black/20 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/48">
                Fontes Verificadas
              </p>
              <p className="mt-1.5 text-3xl font-semibold text-white">{bySource.length}</p>
              <p className="mt-1 text-xs text-white/60">origens editoriais separadas com transparência.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Live Concierge 3-Option Output */}
      {conciergePlan && conciergePlan.options.length > 0 ? (
        <div className="surface-strong space-y-4 rounded-[2rem] border border-white/10 p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#f4d06f]">
                <Sparkles className="h-3.5 w-3.5" />
                Resposta Instantânea do Concierge: &quot;{activePrompt}&quot;
              </p>
              <p className="mt-1 text-sm text-white/75">{conciergePlan.intro}</p>
            </div>
            {conciergePlan.memory.length > 0 ? (
              <div className="flex flex-wrap items-center gap-1.5">
                {conciergePlan.memory.map((mem) => (
                  <span key={mem} className="pill-accent text-[10px]">
                    ✓ {mem}
                  </span>
                ))}
                <button
                  type="button"
                  onClick={handleClearMemory}
                  className="rounded-full p-1 text-white/45 hover:text-white"
                  title="Limpar restrições"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : null}
          </div>

          <div className="grid gap-3.5 md:grid-cols-3">
            {conciergePlan.options.map((opt, idx) => {
              const linkedItem = items.find((i) => i.id === opt.recommendation_ids?.[0]);
              return (
                <div
                  key={`${opt.title}-${idx}`}
                  className="experience-card flex flex-col justify-between p-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="pill text-[10px]">Opção {idx + 1}</span>
                      {linkedItem?.quality_score ? (
                        <span className="text-xs font-semibold text-[#f4d06f]">
                          {Math.round(linkedItem.quality_score)}% Match
                        </span>
                      ) : null}
                    </div>
                    <h4 className="text-base font-semibold text-white">{opt.title}</h4>
                    <p className="text-xs text-white/50">{opt.summary}</p>
                    <p className="text-xs leading-relaxed text-white/75">{opt.why_it_fits}</p>
                  </div>

                  <div className="mt-4 border-t border-white/[0.06] pt-3">
                    {linkedItem ? (
                      <button
                        type="button"
                        onClick={() => setSelectedItem(linkedItem)}
                        className="btn-ghost w-full justify-center py-1.5 text-xs text-[#f4d06f]"
                      >
                        <Compass className="h-3.5 w-3.5" />
                        <span>Ver análise completa</span>
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {isLoading ? <p className="text-sm text-white/60">Organizando as coleções recomendadas...</p> : null}

      {!hasLiveItems && !isLoading ? (
        <div className="editorial-card rounded-[2rem] p-5 text-sm text-white/70">
          Sem recomendações suficientes para montar as coleções agora.
        </div>
      ) : null}

      {topPicks.length ? (
        <div className="space-y-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.32em] text-[#f4d06f]">Mais confiáveis agora</p>
            <h3 className="mt-2 font-display text-2xl font-semibold sm:text-3xl">
              As melhores apostas do momento
            </h3>
            <p className="mt-1 text-sm text-white/60">
              O ponto de partida mais forte quando vocês só querem abrir a plataforma e decidir.
            </p>
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            {topPicks.map((item) => (
              <DiscoveryCard key={item.id} item={item} userId={userId} onAction={onCardAction} />
            ))}
          </div>
        </div>
      ) : null}

      {radarSp.length ? (
        <div className="space-y-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.32em] text-[#f4d06f]">Radar SP</p>
            <h3 className="mt-2 font-display text-2xl font-semibold sm:text-3xl">
              Crítica, aberturas e agenda editorial
            </h3>
            <p className="mt-1 text-sm text-white/60">
              Guia Michelin, Paladar, Folha e Catraca com peso editorial na recomendação.
            </p>
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            {radarSp.map((item) => (
              <DiscoveryCard key={item.id} item={item} userId={userId} onAction={onCardAction} />
            ))}
          </div>
        </div>
      ) : null}

      {bySource.length ? (
        <div className="space-y-5">
          <div>
            <p className="text-[11px] uppercase tracking-[0.32em] text-[#f4d06f]">Por fonte</p>
            <h3 className="mt-2 font-display text-2xl font-semibold sm:text-3xl">
              Coleções que mostram de onde vem a recomendação
            </h3>
          </div>

          {bySource.map((group) => (
            <div key={group.label} className="space-y-3">
              <div>
                <h4 className="text-xl font-semibold text-white">{group.label}</h4>
                <p className="mt-0.5 text-xs text-white/55">{group.badge}</p>
              </div>
              <div className="grid gap-4 xl:grid-cols-3">
                {group.items.map((item) => (
                  <DiscoveryCard key={item.id} item={item} userId={userId} onAction={onCardAction} />
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
            <h3 className="mt-2 font-display text-2xl font-semibold sm:text-3xl">
              Favoritos, parecidos e sinais reais do casal
            </h3>
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            {personalized.map((item) => (
              <DiscoveryCard key={item.id} item={item} userId={userId} onAction={onCardAction} />
            ))}
          </div>
        </div>
      ) : null}

      {diningAndDelivery.length || cinemaAndCulture.length ? (
        <div className="grid gap-6 xl:grid-cols-2">
          {diningAndDelivery.length ? (
            <div className="space-y-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.32em] text-[#f4d06f]">Comer bem</p>
                <h3 className="mt-2 font-display text-2xl font-semibold">
                  Jantar e delivery com maior aderência
                </h3>
              </div>
              <div className="grid gap-4">
                {diningAndDelivery.map((item) => (
                  <DiscoveryCard key={item.id} item={item} userId={userId} onAction={onCardAction} />
                ))}
              </div>
            </div>
          ) : null}

          {cinemaAndCulture.length ? (
            <div className="space-y-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.32em] text-[#f4d06f]">Ver e sair</p>
                <h3 className="mt-2 font-display text-2xl font-semibold">
                  Cinema, séries e cultura numa leitura só
                </h3>
              </div>
              <div className="grid gap-4">
                {cinemaAndCulture.map((item) => (
                  <DiscoveryCard key={item.id} item={item} userId={userId} onAction={onCardAction} />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      <MediaDetailModal
        item={selectedItem}
        userId={userId}
        onClose={() => setSelectedItem(null)}
        onAction={onCardAction}
      />
    </section>
  );
}
