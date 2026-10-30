"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BrainCircuit, ArrowRight, Clock3, Search, Sparkles, X } from "lucide-react";

import ProfileNudge from "@/components/profile/profile-nudge";
import CoupleWeatherBadge from "@/components/discovery/couple-weather-badge";
import HeroBanner from "@/components/discovery/hero-banner";
import MediaDetailModal from "@/components/discovery/media-detail-modal";
import MediaRail from "@/components/discovery/media-rail";
import MediaTile from "@/components/discovery/media-tile";
import NeuralRadarPanel from "@/components/discovery/neural-radar-panel";
import QuickActions from "@/components/discovery/quick-actions";
import SmartCaptureModal from "@/components/discovery/smart-capture-modal";
import {
  buildDayBrief,
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
  { key: "movies", title: "Filmes & séries", subtitle: "Boas histórias para sua próxima sessão", variant: "poster" as const, stagger: "stagger-5" },
  { key: "events", title: "Cultura & Exposições", subtitle: "Museus, centros culturais e agenda de SP", stagger: "stagger-6" },
  { key: "editorial", title: "Radar SP", subtitle: "Críticas, Michelin, Paladar e aberturas", stagger: "stagger-7" },
  { key: "nearby", title: "Perto de você", subtitle: "Menos deslocamento, mais presença", stagger: "stagger-8" },
] as const;

type VibeFilterKey = "all" | "romantic" | "cultural" | "nearby" | "indoor" | "top_ml";

const VIBE_FILTERS: Array<{ key: VibeFilterKey; label: string }> = [
  { key: "all", label: "✨ Todos" },
  { key: "top_ml", label: "✨ Boas combinações" },
  { key: "romantic", label: "🍷 Romântico & Intimista" },
  { key: "cultural", label: "🏛️ Cultura & Museus" },
  { key: "nearby", label: "📍 Por perto" },
  { key: "indoor", label: "☔ Coberto / Conforto" },
];

export default function HomeScreen() {
  const userId = getUserId();
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);
  const [selectedItem, setSelectedItem] = useState<Recommendation | null>(null);
  const [captureOpen, setCaptureOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeVibe, setActiveVibe] = useState<VibeFilterKey>("all");
  const [nowMode, setNowMode] = useState(false);
  const [nowPreference, setNowPreference] = useState<"all" | "indoor" | "outdoor" | "free">("all");

  const { data: couple } = useQuery({ queryKey: ["couple-me"], queryFn: fetchCoupleMe });
  const city = couple?.city || "Sao Paulo";
  const greetingName = couple?.account_name || "";

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
    else if (activeVibe === "top_ml") list = list.filter((i) => (i.quality_score || 0) >= 88);

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
    const candidates = filteredItems.filter((item) => {
      if (item.domain === "movies_series" || item.domain === "delivery") return false;
      if (nowPreference === "indoor") return item.indoor_outdoor === "indoor";
      if (nowPreference === "outdoor") return item.indoor_outdoor === "outdoor" || item.indoor_outdoor === "mixed";
      if (nowPreference === "free") return item.price === 0;
      return true;
    });
    const seenCategories = new Set<string>();
    const distinct = candidates.filter((item) => {
      if (seenCategories.has(item.category)) return false;
      seenCategories.add(item.category);
      return true;
    });
    return [...distinct, ...candidates.filter((item) => !distinct.includes(item))].slice(0, 3);
  }, [filteredItems, nowPreference]);

  const isFiltering = activeVibe !== "all" || searchQuery.trim().length > 0;

  const rails = useMemo(() => buildHomeRails(recommendations, hiddenIds), [recommendations, hiddenIds]);
  const { hero: heroItem, forYou, romantic, restaurants, movies, events, editorial, nearby } = rails;

  const railItems: Record<(typeof RAILS)[number]["key"], Recommendation[]> = {
    forYou: forYou.length ? forYou : items.slice(0, 10),
    romantic,
    restaurants,
    movies,
    events,
    editorial,
    nearby,
  };

  const brief = useMemo(
    () => buildDayBrief(items, context || buildFallbackContext(city), couple || undefined),
    [items, context, couple, city]
  );

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
      {/* Header & Live Context */}
      <header className="animate-fade-up space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 space-y-1.5">
            <p className="inline-flex items-center gap-1.5 text-xs font-medium text-[#f4d06f]">
              <Sparkles className="h-3.5 w-3.5" />
              <span>BestThingsToDo · Descobertas para a vida real</span>
            </p>
            <h2 className="font-display text-3xl font-semibold leading-tight text-white sm:text-4xl">
              O que vamos descobrir hoje{greetingName ? `, ${greetingName}` : ""}?
            </h2>
            <p className="max-w-xl text-sm leading-relaxed text-white/60">{brief.headline}</p>
          </div>
          <CoupleWeatherBadge context={context} couple={couple || undefined} compact />
        </div>

        <div className="flex flex-wrap gap-2">
          {brief.chips.slice(0, 4).map((chip) => (
            <span key={chip} className="pill">
              {chip}
            </span>
          ))}
          {!railsLoading ? <span className="pill-accent">{items.length} experiências ativas</span> : null}
        </div>
      </header>

      {/* Fast discovery: a short actionable shortlist, never a false open-now promise. */}
      <section className="relative overflow-hidden rounded-[1.75rem] border border-[#f4d06f]/20 bg-gradient-to-br from-[#202536] via-[#111c29] to-[#0a121c] p-5 shadow-float sm:p-7" aria-label="Descobrir agora">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-xl space-y-2">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#f4d06f]"><Clock3 className="h-4 w-4" /> BestThingsToDo Now</p>
            <h3 className="font-display text-2xl font-semibold text-white sm:text-3xl">Não sabe o que fazer hoje?</h3>
            <p className="text-sm leading-relaxed text-white/65">Troque a lista infinita por até três ideias selecionadas conforme suas preferências. Confira horários e disponibilidade antes de sair.</p>
          </div>
          <button type="button" onClick={() => setNowMode((previous) => !previous)} aria-expanded={nowMode} className="btn-primary inline-flex min-h-11 shrink-0 items-center justify-center gap-2 px-5">
            {nowMode ? "Voltar às descobertas" : "Me dê três ideias"} <ArrowRight className="h-4 w-4" />
          </button>
        </div>
        {nowMode ? (
          <div className="mt-6 border-t border-white/10 pt-5" aria-live="polite">
            <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Preferência para as sugestões">
              {([
                ["all", "Tudo"],
                ["indoor", "Lugar coberto"],
                ["outdoor", "Ao ar livre"],
                ["free", "Gratuito"],
              ] as const).map(([value, label]) => (
                <button key={value} type="button" onClick={() => setNowPreference(value)}
                  aria-pressed={nowPreference === value}
                  className={`rounded-full border px-3.5 py-2 text-xs transition ${nowPreference === value ? "border-[#f4d06f]/60 bg-[#f4d06f]/15 text-[#f4d06f]" : "border-white/10 text-white/65 hover:border-white/30"}`}>
                  {label}
                </button>
              ))}
            </div>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-lg font-semibold text-white">Sua seleção de agora</h4>
              <span className="text-xs text-white/55">Baseada no catálogo, sem confirmação de funcionamento em tempo real</span>
            </div>
            {nowSuggestions.length ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {nowSuggestions.map((item, index) => (
                  <div key={item.id} className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                    <p className="mb-2 text-xs font-medium text-[#f4d06f]">Ideia {index + 1}</p>
                    <div className="[&>div]:w-full"><MediaTile item={item} onOpen={setSelectedItem} /></div>
                    <p className="mt-2 text-xs text-white/60">{item.neighborhood ? `Em ${item.neighborhood} · ` : ""}Abra os detalhes para conferir a fonte e planejar.</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-white/65">Ainda não há experiências compatíveis no catálogo. Tente limpar os filtros ou explorar novas opções.</p>
            )}
          </div>
        ) : null}
      </section>

      {/* Continual Machine Learning Radar & Smart Web Capture */}
      <div className="animate-fade-up stagger-1">
        <NeuralRadarPanel
          insights={insights}
          onOpenCapture={() => setCaptureOpen(true)}
          onResetLearning={() => {
            resetLearning();
            setHiddenIds([]);
          }}
        />
      </div>

      {/* Instant Search & Vibe Filter Bar */}
      <div className="animate-fade-up stagger-1 space-y-3">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filtrar por restaurante, museu, bairro (ex.: Pinheiros, MASP, pizza)..."
              className="w-full rounded-full border border-white/10 bg-white/[0.04] py-2.5 pl-10 pr-9 text-sm text-white placeholder:text-white/38 focus:border-[#ff7a59]/50 focus:bg-white/[0.06] focus:outline-none"
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
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
                  active
                    ? "bg-gradient-to-r from-[#ff7a59] to-[#f97352] text-white shadow-md"
                    : "border border-white/10 bg-white/[0.04] text-white/70 hover:border-white/20 hover:text-white"
                }`}
              >
                {vibe.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="animate-fade-up stagger-1">
        <QuickActions />
      </div>

      <ProfileNudge couple={couple} />

      {profileCompleteness.percent < 40 && !railsLoading ? (
        <div className="surface animate-fade-up p-5 text-center sm:p-6">
          <p className="font-display text-xl font-semibold text-white">2 minutos para sugestões perfeitas</p>
          <p className="mt-2 text-sm text-white/55">Cidade, culinárias e favoritos deixam tudo menos genérico.</p>
          <Link href="/onboarding" className="btn-primary mt-4">
            Personalizar minhas descobertas
          </Link>
        </div>
      ) : null}

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
              <p>Nenhum item encontrado para esse filtro local.</p>
              <button
                type="button"
                onClick={() => setCaptureOpen(true)}
                className="btn-primary mt-3 text-xs"
              >
                Capturar &quot;{searchQuery || "novo lugar"}&quot; da web com IA
              </button>
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="animate-fade-up stagger-1">
            {railsLoading ? (
              <div className="experience-card overflow-hidden rounded-[1.75rem] sm:rounded-[2rem]">
                <div className="aspect-[16/10] min-h-[240px] w-full shimmer sm:aspect-[21/9]" />
              </div>
            ) : heroItem ? (
              <HeroBanner item={heroItem} onOpen={setSelectedItem} />
            ) : null}
          </div>

          {RAILS.map((rail) => (
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
