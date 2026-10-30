"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw, Sparkles } from "lucide-react";

import CoupleWeatherBadge from "@/components/discovery/couple-weather-badge";
import MediaDetailModal from "@/components/discovery/media-detail-modal";
import DateNightPlanCard from "@/components/date-night/plan-card";
import {
  buildDateNightPlan,
  buildFallbackContext,
  curateRecommendations,
  pickForVibe,
} from "@/features/catalog/curation";
import {
  fetchCoupleMe,
  fetchRecommendationSources,
  fetchUserContext,
  sendFeedback,
} from "@/shared/api/client";
import { RECOMMENDATION_POOL_LIMIT } from "@/shared/api/config";
import { useContinualLearning } from "@/shared/hooks/use-continual-learning";
import { getUserId, upsertAgendaItem, upsertSavedItem } from "@/shared/storage";
import { requireAccountForChange } from "@/shared/account-sync";
import { DateNightPlan, Recommendation } from "@life/shared-types";

const SOURCE_STALE_MS = 5 * 60_000;

type DateMood = "balanced" | "romantic" | "cultural" | "indoor" | "surprise";

const MOOD_OPTIONS: Array<{ key: DateMood; label: string }> = [
  { key: "balanced", label: "✨ Equilibrado (IA)" },
  { key: "romantic", label: "🍷 Romântico & Intimista" },
  { key: "cultural", label: "🏛️ Cultural & Conversa" },
  { key: "indoor", label: "☔ 100% Coberto" },
  { key: "surprise", label: "🎲 Surpreenda-nos" },
];

export default function DateNightScreen() {
  const userId = getUserId();
  const [mood, setMood] = useState<DateMood>("balanced");
  const [plan, setPlan] = useState<DateNightPlan | null>(null);
  const [stepOffsets, setStepOffsets] = useState<[number, number, number]>([0, 0, 0]);
  const [itinerarySaved, setItinerarySaved] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Recommendation | null>(null);

  const { data: couple } = useQuery({ queryKey: ["couple-me"], queryFn: fetchCoupleMe });
  const city = couple?.city || "Sao Paulo";

  const { data: context } = useQuery({
    queryKey: ["context", city, couple?.neighborhood || ""],
    queryFn: () => fetchUserContext(couple || undefined),
    staleTime: SOURCE_STALE_MS,
  });

  const { data: sources = [], isLoading } = useQuery({
    queryKey: ["recommendation-sources", userId, city],
    queryFn: () => fetchRecommendationSources(city),
    staleTime: SOURCE_STALE_MS,
  });

  const { feedbackHistory, version: mlVersion } = useContinualLearning(couple, context);

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

  const moodPool = useMemo(() => {
    if (!recommendations.length) return [];
    let filtered = recommendations;
    if (mood === "romantic") filtered = pickForVibe(recommendations, "romantic");
    else if (mood === "cultural") filtered = pickForVibe(recommendations, "cultural");
    else if (mood === "indoor") filtered = recommendations.filter((i) => i.indoor_outdoor === "indoor");
    else if (mood === "surprise") {
      filtered = [...recommendations].sort((a, b) => {
        const aNovel = a.personalization_label ? 0 : 1;
        const bNovel = b.personalization_label ? 0 : 1;
        return bNovel - aNovel || (b.quality_score || 0) - (a.quality_score || 0);
      });
    }
    return filtered.length >= 3 ? filtered : recommendations;
  }, [recommendations, mood]);

  const computeCustomPlan = useCallback(
    (offsets: [number, number, number]) => {
      if (moodPool.length < 3) return null;
      const safeContext = context || buildFallbackContext(city);
      const basePlan = buildDateNightPlan({
        recommendations: moodPool,
        context: safeContext,
        couple: couple || undefined,
      });
      if (!basePlan) return null;

      const warmupCandidates = moodPool.filter(
        (i) => i.domain === "events_exhibitions" || i.category === "cafe" || i.category === "bookstore"
      );
      const cultureCandidates = moodPool.filter(
        (i) => i.domain === "movies_series" || i.domain === "events_exhibitions"
      );
      const diningCandidates = moodPool.filter(
        (i) => i.domain === "dining_out" || i.domain === "delivery"
      );

      const pickStep = (
        candidates: Recommendation[],
        offset: number,
        fallbackActivity: DateNightPlan["activity_1"],
        usedIds: Set<string>
      ): DateNightPlan["activity_1"] => {
        const available = candidates.filter((c) => !usedIds.has(c.id));
        if (!available.length) return fallbackActivity;
        const chosen = available[offset % available.length];
        usedIds.add(chosen.id);
        return {
          title: chosen.title,
          type: chosen.category,
          reason:
            chosen.couple_fit_reason ||
            chosen.reason ||
            chosen.description ||
            fallbackActivity.reason,
          recommendation_id: chosen.id,
          time_window: fallbackActivity.time_window,
          is_indoor: chosen.indoor_outdoor === "indoor",
          is_new_vs_familiar: chosen.related_favorite ? "familiar" : "new",
          image_url: chosen.image_url || null,
          cta_url: chosen.booking_url || chosen.url || null,
          spoiler_hint: `Em ${chosen.neighborhood || chosen.location || "SP"} · ${
            chosen.distance_label || "boa logística"
          }.`,
        };
      };

      const usedIds = new Set<string>();
      const act1 = pickStep(
        warmupCandidates.length ? warmupCandidates : moodPool,
        offsets[0],
        basePlan.activity_1,
        usedIds
      );
      const act2 = pickStep(
        cultureCandidates.length ? cultureCandidates : moodPool,
        offsets[1],
        basePlan.activity_2,
        usedIds
      );
      const act3 = pickStep(
        diningCandidates.length ? diningCandidates : moodPool,
        offsets[2],
        basePlan.activity_3,
        usedIds
      );

      return {
        ...basePlan,
        activity_1: act1,
        activity_2: act2,
        activity_3: act3,
        source_recommendation_ids: [act1.recommendation_id, act2.recommendation_id, act3.recommendation_id].filter(
          Boolean
        ) as string[],
      };
    },
    [moodPool, context, city, couple]
  );

  useEffect(() => {
    const generated = computeCustomPlan(stepOffsets);
    if (generated) setPlan(generated);
  }, [computeCustomPlan, stepOffsets]);

  const handleRegenerateAll = () => {
    setItinerarySaved(false);
    setStepOffsets(([a, b, c]) => [a + 1, b + 1, c + 1]);
  };

  const handleSwapStep = (stepIndex: 0 | 1 | 2) => {
    setItinerarySaved(false);
    setStepOffsets((prev) => {
      const next: [number, number, number] = [...prev] as [number, number, number];
      next[stepIndex] += 1;
      return next;
    });
  };

  const handleSaveItinerary = (items: Recommendation[]) => {
    if (!requireAccountForChange()) return;
    for (const item of items) {
      upsertSavedItem({ ...item, collection: "Noite a Dois" });
      upsertAgendaItem(item);
      void sendFeedback(userId, item.id, "save", {
        title: item.title,
        tags: item.tags,
        domain: item.domain,
        category: item.category,
        neighborhood: item.neighborhood || undefined,
      });
    }
    setItinerarySaved(true);
  };

  return (
    <section className="space-y-8">
      <header className="animate-fade-up space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 space-y-2">
            <p className="inline-flex items-center gap-1.5 text-xs font-medium text-[#f4d06f]">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Planejador Inteligente de Encontros</span>
            </p>
            <h2 className="font-display text-3xl font-semibold text-white sm:text-4xl">Noite a Dois</h2>
            <p className="max-w-xl text-sm text-white/60">
              Três momentos automáticos encadeados com base no clima, horário e aprendizado contínuo do casal. Troque
              qualquer etapa individualmente ou salve o roteiro completo.
            </p>
          </div>
          <CoupleWeatherBadge context={context} couple={couple || undefined} compact />
        </div>

        {/* Mood Selector & Regenerate Button */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {MOOD_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => {
                  setMood(opt.key);
                  setStepOffsets([0, 0, 0]);
                  setItinerarySaved(false);
                }}
                className={`rounded-full px-3.5 py-2 text-xs font-medium transition ${
                  mood === opt.key
                    ? "bg-gradient-to-r from-[#ff7a59] to-[#f97352] text-white shadow-md"
                    : "border border-white/10 bg-white/[0.04] text-white/70 hover:text-white"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleRegenerateAll}
            disabled={!moodPool.length}
            className="btn-ghost gap-2 text-xs sm:text-sm disabled:opacity-50"
          >
            <RefreshCw className="h-4 w-4 text-[#f4d06f]" />
            <span>Sortear nova combinação</span>
          </button>
        </div>
      </header>

      {isLoading && !plan ? (
        <div className="grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((idx) => (
            <div key={idx} className="experience-card aspect-[4/5] shimmer" />
          ))}
        </div>
      ) : null}

      {plan ? (
        <DateNightPlanCard
          plan={plan}
          recommendations={recommendations}
          onSwapStep={handleSwapStep}
          onSaveItinerary={handleSaveItinerary}
          onOpenDetail={setSelectedItem}
          itinerarySaved={itinerarySaved}
        />
      ) : !isLoading ? (
        <div className="surface p-5 text-sm text-white/55">
          Montando o roteiro com base no clima e no perfil do casal…
        </div>
      ) : null}

      <MediaDetailModal
        item={selectedItem}
        userId={userId}
        onClose={() => setSelectedItem(null)}
      />
    </section>
  );
}
