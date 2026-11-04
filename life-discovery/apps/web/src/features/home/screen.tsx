"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BrainCircuit, ArrowRight, Search, SlidersHorizontal, X } from "lucide-react";

import HeroBanner from "@/components/discovery/hero-banner";
import MediaDetailModal from "@/components/discovery/media-detail-modal";
import MediaRail from "@/components/discovery/media-rail";
import MediaTile from "@/components/discovery/media-tile";
import NeuralRadarPanel from "@/components/discovery/neural-radar-panel";
import QuickActions from "@/components/discovery/quick-actions";
import SmartCaptureModal from "@/components/discovery/smart-capture-modal";
import {
  buildFallbackContext,
  buildHomeRails,
  curateRecommendations,
  pickForVibe,
} from "@/features/catalog/curation";
import { fetchCoupleMe, fetchRecommendationSources, fetchUserContext } from "@/shared/api/client";
import { RECOMMENDATION_POOL_LIMIT } from "@/shared/api/config";
import { useContinualLearning } from "@/shared/hooks/use-continual-learning";
import { getProfileCompleteness } from "@/shared/profile-completeness";
import { getUserId } from "@/shared/storage";
import Link from "next/link";
import { Recommendation } from "@life/shared-types";

const SOURCE_STALE_MS = 5 * 60_000;

const RAILS = [
  { key: "forYou", title: "Escolhidos para você", subtitle: "Descobertas inspiradas no que você gosta", stagger: "stagger-2" },
  { key: "romantic", title: "Para viver a dois", subtitle: "Romântico, calmo e com boa conversa", stagger: "stagger-3" },
  { key: "restaurants", title: "Restaurantes", subtitle: "Lugares para comer bem e descobrir novos sabores", stagger: "stagger-4" },
  { key: "cafes", title: "Cafés & boas pausas", subtitle: "Cafeterias para descobrir, conversar ou desacelerar", stagger: "stagger-5" },
  { key: "movies", title: "Filmes & séries", subtitle: "Boas histórias para sua próxima sessão", variant: "poster" as const, stagger: "stagger-5" },
  { key: "events", title: "Cultura & Exposições", subtitle: "Museus, centros culturais e agenda de SP", stagger: "stagger-6" },
  { key: "editorial", title: "Radar SP", subtitle: "Críticas, Michelin, Paladar e aberturas", stagger: "stagger-7" },
  { key: "nearby", title: "Perto de você", subtitle: "Menos deslocamento, mais presença", stagger: "stagger-8" },
  { key: "outdoor", title: "Ao ar livre", subtitle: "Ideias para aproveitar a cidade do lado de fora", stagger: "stagger-8" },
] as const;

type VibeFilterKey = "all" | "romantic" | "cultural" | "nearby" | "indoor" | "top_ml";

const VIBE_FILTERS: Array<{ key: VibeFilterKey; label: string }> = [
  { key: "all", label: "Tudo" },
  { key: "top_ml", label: "Para você" },
  { key: "romantic", label: "A dois" },
  { key: "cultural", label: "Cultura" },
  { key: "nearby", label: "Por perto" },
  { key: "indoor", label: "Ambientes internos" },
];

export default function HomeScreen() {
  const userId = getUserId();
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);
  const [selectedItem, setSelectedItem] = useState<Recommendation | null>(null);
  const [captureOpen, setCaptureOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeVibe, setActiveVibe] = useState<VibeFilterKey>("all");
  const [nowMode, setNowMode] = useState(false);
  const [showAllRails, setShowAllRails] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);

  const { data: couple } = useQuery({ queryKey: ["couple-me"], queryFn: fetchCoupleMe });
  const city = couple?.city || "Sao Paulo";
  const neighborhood = couple?.neighborhood || city;

  const { data: context } = useQuery({
    queryKey: ["context", city, couple?.neighborhood || ""],
    queryFn: () => fetchUserContext(couple || undefined),
    staleTime: SOURCE_STALE_MS,
  });

  const { data: sources = [], isLoading: sourcesLoading } = useQuery({
    queryKey: ["recommendation-sources", userId, city],
    queryFn: () => fetchRecommendationSources(city),
    staleTime: SOURCE_STALE_MS,
  });

  const {
    version: mlVersion,
    feedbackHistory,
    insights,
    toast,
    dismissToast,
    resetLearning,
  } = useContinualLearning(couple, context);

  const recommendations = useMemo(() => {
    void mlVersion;
    if (!sources.length) return [];
    return curateRecommendations(sources, {
      context: context || buildFallbackContext(city),
      couple: couple || undefined,
      feedback: feedbackHistory,
      limit: RECOMMENDATION_POOL_LIMIT,
    });
  }, [sources, context, couple, city, feedbackHistory, mlVersion]);

  const items = useMemo(
    () => recommendations.filter((item) => !hiddenIds.includes(item.id)),
    [recommendations, hiddenIds]
  );

  // Filtered view when user searches or selects a specific vibe chip
  const filteredItems = useMemo(() => {
    let list = items;
    if (activeVibe === "romantic") list = pickForVibe(list, "romantic");
    else if (activeVibe === "cultural") list = pickForVibe(list, "cultural");
    else if (activeVibe === "nearby") list = pickForVibe(list, "nearby");
    else if (activeVibe === "indoor") list = list.filter((i) => i.indoor_outdoor === "indoor");
    else if (activeVibe === "top_ml") list = list.slice(0, 24);

    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((item) => {
        const hay = [
          item.title,
          item.description,
          item.neighborhood,
          item.location,
          item.category,
          ...(item.tags || []),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      });
    }
    return list;
  }, [items, activeVibe, searchQuery]);

  const nowSuggestions = useMemo(() => {
    const candidates = filteredItems.filter((item) => item.domain !== "movies_series" && item.domain !== "delivery");
    const seenCategories = new Set<string>();
    const distinct = candidates.filter((item) => {
      if (seenCategories.has(item.category)) return false;
      seenCategories.add(item.category);
      return true;
    });
    return [...distinct, ...candidates.filter((item) => !distinct.includes(item))].slice(0, 3);
  }, [filteredItems]);

  const isFiltering = activeVibe !== "all" || searchQuery.trim().length > 0;

  const rails = useMemo(() => buildHomeRails(recommendations, hiddenIds), [recommendations, hiddenIds]);
  const { hero: heroItem, forYou, romantic, restaurants, movies, events, editorial, nearby } = rails;

  const railItems: Record<(typeof RAILS)[number]["key"], Recommendation[]> = {
    forYou: forYou.length ? forYou : items.slice(0, 10),
    romantic,
    restaurants,
    cafes: items.filter((item) => item.category === "cafe" || item.tags?.some((tag) => /caf[eé]|coffee/i.test(tag))).slice(0, 16),
    movies,
    events,
    editorial,
    nearby,
    outdoor: items.filter((item) => item.indoor_outdoor === "outdoor" || item.indoor_outdoor === "mixed").slice(0, 16),
  };

  const profileCompleteness = useMemo(() => getProfileCompleteness(couple), [couple]);
  const railsLoading = sourcesLoading && recommendations.length === 0;

  const onCardAction = (id: string, action: "like" | "dislike" | "save" | "skip") => {
    if (action === "dislike") {
      setHiddenIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
      if (selectedItem?.id === id) setSelectedItem(null);
    }
  };

  return (
    <section className="space-y-7 md:space-y-9">
      <header className="space-y-4 pt-3 md:pt-6">
        <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[#d5bd8b]">
          {neighborhood}{context?.temperature != null ? ` · ${Math.round(context.temperature)}°` : ""} · uma cidade para descobrir
        </p>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-[790px]">
            <h2 className="font-display text-[clamp(2.25rem,5vw,4.25rem)] font-medium leading-[1.06] tracking-[-0.055em] text-[#f4f0e8]">Descubra algo que vale a pena.</h2>
            <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-white/55 sm:text-base">Lugares, encontros e histórias para sair do habitual.</p>
          </div>
          <Link href="/map" className="inline-flex min-h-11 items-center gap-2 border-b border-[#d7bc88]/55 pb-1 text-sm font-medium text-[#e7d5af] hover:text-white">Explorar no mapa <ArrowRight className="h-4 w-4" strokeWidth={1.5}/></Link>
        </div>
      </header>
      <section className="relative overflow-hidden rounded-[24px] border border-white/[0.09] bg-[#151c23] px-5 py-6 sm:px-8 sm:py-8" aria-label="Sua seleção do momento">
        <div className="flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-end">
          <div className="max-w-xl">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#d9bb84]">THE NOW EDIT</p>
            <h3 className="font-display text-[clamp(1.65rem,3vw,2.4rem)] font-medium leading-tight tracking-[-0.035em] text-white">Três ideias. Um bom dia.</h3>
            <p className="mt-3 text-sm leading-relaxed text-white/55">Uma seleção curta para você decidir sem perder tempo.</p>
          </div>
          <button type="button" onClick={() => setNowMode((value) => !value)} aria-expanded={nowMode}
            className="inline-flex min-h-11 items-center gap-2 rounded-[10px] bg-[#e7c994] px-5 py-3 text-[13px] font-semibold text-[#161b20] transition-colors hover:bg-[#f3dbae] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e7c994]">
            {nowMode ? "Fechar seleção" : "Ver três ideias"} <ArrowRight className="h-4 w-4" strokeWidth={1.7}/>
          </button>
        </div>
        {nowMode ? (
          <div className="mt-6 border-t border-white/10 pt-6" aria-live="polite">
            {nowSuggestions.length ? (
              <div className="grid gap-5 sm:grid-cols-3">
                {nowSuggestions.map((item) => <div key={item.id} className="min-w-0 [&>div]:w-full"><MediaTile item={item} onOpen={setSelectedItem} /></div>)}
              </div>
            ) : <p className="text-sm text-white/65">Ainda não encontramos opções para estes filtros. Experimente outra seleção.</p>}
            <p className="mt-5 text-[11px] text-white/40">Confira horários e disponibilidade diretamente com o estabelecimento.</p>
          </div>
        ) : null}
      </section>

      {/* Instant Search & Vibe Filter Bar */}
      <div id="explorar" className="space-y-3 scroll-mt-24">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="O que você gostaria de descobrir?"
              className="w-full min-h-[52px] rounded-xl border border-white/10 bg-[#131b23] py-3 pl-11 pr-11 text-sm text-white placeholder:text-white/40 focus:border-[#d7bc88]/55 focus:outline-none"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-white/45 hover:text-white"
                aria-label="Limpar busca"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {VIBE_FILTERS.map((vibe) => {
            const active = activeVibe === vibe.key;
            return (
              <button
                key={vibe.key}
                type="button"
                onClick={() => setActiveVibe(vibe.key)}
                aria-pressed={active}
                className={`shrink-0 rounded-lg px-3.5 py-2 text-xs font-medium transition ${
                  active
                    ? "border border-[#d7bc88]/50 bg-[#d7bc88]/10 text-[#f2ddb6]"
                    : "border border-white/10 text-white/55 hover:border-white/25 hover:text-white"
                }`}
              >
                {vibe.label}
              </button>
            );
          })}
        </div>
      </div>

      <QuickActions />
      {profileCompleteness.percent < 40 && !railsLoading ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-y border-white/10 py-4">
          <p className="text-sm text-white/60">Ajuste suas preferências para encontrar mais do que você gosta.</p>
          <Link href="/onboarding" className="text-sm font-medium text-[#e7c994] underline decoration-[#e7c994]/30 underline-offset-4 hover:decoration-[#e7c994]">Personalizar</Link>
        </div>
      ) : null}
      <div>
        <button type="button" onClick={() => setShowPreferences((value) => !value)} aria-expanded={showPreferences}
          className="inline-flex min-h-11 items-center gap-2 text-xs text-white/45 transition hover:text-white/85">
          <SlidersHorizontal className="h-3.5 w-3.5" strokeWidth={1.5}/> Preferências da curadoria
        </button>
        {showPreferences ? (
          <div className="mt-2">
            <NeuralRadarPanel insights={insights} onOpenCapture={() => setCaptureOpen(true)}
              onResetLearning={() => { resetLearning(); setHiddenIds([]); }}/>
          </div>
        ) : null}
      </div>

      {isFiltering ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="rail-title">Resultados filtrados ({filteredItems.length})</h3>
              <p className="text-xs text-white/50">Ordenados por afinidade e relevância</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setActiveVibe("all");
                setSearchQuery("");
              }}
              className="btn-ghost py-1.5 text-xs"
            >
              Limpar filtros
            </button>
          </div>

          {filteredItems.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {filteredItems.slice(0, 24).map((item) => (
                <div key={item.id} className="w-full [&>div]:w-full">
                  <MediaTile item={item} onOpen={setSelectedItem} />
                </div>
              ))}
            </div>
          ) : (
            <div className="surface p-6 text-center text-sm text-white/60">
              <p>Nenhum resultado por aqui. Tente outro termo ou categoria.</p>
              <button
                type="button"
                onClick={() => setCaptureOpen(true)}
                className="btn-primary mt-3 text-xs"
              >
                Adicionar um lugar
              </button>
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="">
            {railsLoading ? (
              <div className="experience-card overflow-hidden rounded-[1.75rem] sm:rounded-[2rem]">
                <div className="aspect-[16/10] min-h-[240px] w-full shimmer sm:aspect-[21/9]" />
              </div>
            ) : heroItem ? (
              <HeroBanner item={heroItem} onOpen={setSelectedItem} />
            ) : null}
          </div>

          {RAILS.slice(0, showAllRails ? RAILS.length : 6).map((rail) => (
            <MediaRail
              key={rail.key}
              title={rail.title}
              subtitle={rail.subtitle}
              items={railItems[rail.key]}
              onOpen={setSelectedItem}
              variant={"variant" in rail ? rail.variant : "landscape"}
              loading={railsLoading}
              className={`animate-slide-up ${rail.stagger}`}
            />
          ))}
          {RAILS.length > 6 ? (
            <div className="flex justify-center pt-2">
              <button
                type="button"
                aria-expanded={showAllRails}
                onClick={() => setShowAllRails((previous) => !previous)}
                className="btn-ghost min-h-11 border-white/15 px-6 text-sm hover:border-[#f4d06f]/40"
              >
                {showAllRails ? "Ver menos" : "Ver mais coleções"}
              </button>
            </div>
          ) : null}
        </>
      )}

      {!railsLoading && items.length === 0 ? (
        <div className="surface p-5 text-sm text-white/60">
          Nenhuma sugestão agora. Experimente novos filtros ou personalize suas preferências.
        </div>
      ) : null}

      <MediaDetailModal
        item={selectedItem}
        userId={userId}
        onClose={() => setSelectedItem(null)}
        onAction={onCardAction}
      />

      <SmartCaptureModal
        open={captureOpen}
        onClose={() => setCaptureOpen(false)}
        city={city}
        onCaptured={(newItem) => setSelectedItem(newItem)}
      />

      {/* Live Continual Learning Toast */}
      {toast ? (
        <div className="fixed bottom-24 right-4 z-40 max-w-sm animate-slide-up md:bottom-6">
          <div className="glass flex items-center gap-3 rounded-2xl border border-[#f4d06f]/30 px-4 py-3 shadow-float">
            <BrainCircuit className="h-4 w-4 shrink-0 text-[#f4d06f]" />
            <p className="text-xs font-medium leading-snug text-white/90">{toast.text}</p>
            <button
              type="button"
              onClick={dismissToast}
              className="ml-1 rounded-full p-1 text-white/45 hover:text-white"
              aria-label="Fechar aviso"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
