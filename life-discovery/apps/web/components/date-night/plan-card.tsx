"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { BookmarkCheck, ExternalLink, MapPin, RefreshCw, Sparkles } from "lucide-react";

import ExperienceImage from "@/components/discovery/experience-image";
import { DateNightPlan, Recommendation } from "@life/shared-types";

function labelTimeWindow(value?: "morning" | "afternoon" | "night") {
  if (value === "morning") return "Manhã";
  if (value === "afternoon") return "Tarde";
  return "Noite";
}

const STEP_LABELS = ["1 · Aquecimento", "2 · Experiência Principal", "3 · Jantar & Fechamento"];

function resolveFullRecommendation(
  activity: DateNightPlan["activity_1"],
  index: number,
  pool: Recommendation[]
): Recommendation {
  const found = pool.find(
    (item) => item.id === activity.recommendation_id || item.title.toLowerCase() === activity.title.toLowerCase()
  );
  if (found) return found;
  return {
    id: activity.recommendation_id || `plan-${index}`,
    title: activity.title,
    description: activity.reason,
    category: index === 2 ? "restaurant" : index === 0 ? "museum" : "cinema",
    domain: index === 2 ? "dining_out" : "events_exhibitions",
    city: "São Paulo",
    location: "São Paulo",
    image_url: activity.image_url || null,
    image_fallback_key: index === 2 ? "dining" : "editorial",
    url: activity.cta_url || null,
    tags: [],
    source: "Noite a Dois",
  };
}

export default function DateNightPlanCard({
  plan,
  recommendations = [],
  onSwapStep,
  onSaveItinerary,
  onOpenDetail,
  itinerarySaved = false,
}: {
  plan: DateNightPlan;
  recommendations?: Recommendation[];
  onSwapStep?: (stepIndex: 0 | 1 | 2) => void;
  onSaveItinerary?: (items: Recommendation[]) => void;
  onOpenDetail?: (item: Recommendation) => void;
  itinerarySaved?: boolean;
}) {
  const [openSpoiler, setOpenSpoiler] = useState<string | null>(null);
  const activities = [plan.activity_1, plan.activity_2, plan.activity_3] as const;
  const resolvedItems = activities.map((act, idx) => resolveFullRecommendation(act, idx, recommendations));

  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="space-y-5"
    >
      <div className="surface-strong flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6">
        <div className="space-y-1.5">
          <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#f4d06f]">
            <Sparkles className="h-3.5 w-3.5" />
            Roteiro sequencial calibrado por IA
          </p>
          <h3 className="font-display text-2xl font-semibold text-white sm:text-3xl">
            Três momentos encadeados
          </h3>
          <p className="max-w-2xl text-sm text-white/65">{plan.weather_note || plan.reasoning}</p>
        </div>

        {onSaveItinerary ? (
          <button
            type="button"
            disabled={itinerarySaved}
            onClick={() => onSaveItinerary(resolvedItems)}
            className={`btn-primary gap-2 text-xs sm:text-sm ${
              itinerarySaved ? "bg-emerald-600 shadow-none" : ""
            }`}
          >
            <BookmarkCheck className="h-4 w-4" />
            <span>{itinerarySaved ? "✓ Roteiro salvo na coleção" : "Salvar roteiro completo"}</span>
          </button>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {activities.map((activity, index) => {
          const item = resolvedItems[index];
          const mapQuery = encodeURIComponent(
            `${item.title} ${item.neighborhood || item.location || ""} São Paulo`
          );

          return (
            <article key={`${item.id}-${index}`} className="experience-card flex flex-col justify-between overflow-hidden">
              <div>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => onOpenDetail?.(item)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") onOpenDetail?.(item);
                  }}
                  className="relative aspect-[4/3] cursor-pointer"
                >
                  <ExperienceImage item={item} mode="tile" className="absolute inset-0 h-full w-full" />
                  <div className="absolute left-3 top-3">
                    <span className="pill-accent text-[10px] backdrop-blur-md">
                      {STEP_LABELS[index]} · {labelTimeWindow(activity.time_window)}
                    </span>
                  </div>
                </div>

                <div className="space-y-2.5 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h4
                      onClick={() => onOpenDetail?.(item)}
                      className=" line-clamp-2 cursor-pointer text-base font-semibold text-white hover:text-[#ffb89a]"
                    >
                      {activity.title}
                    </h4>
                  </div>

                  {item.neighborhood ? (
                    <p className="flex items-center gap-1 text-xs text-[#f4d06f]">
                      <MapPin className="h-3 w-3" />
                      <span>{item.neighborhood}</span>
                      {item.distance_label ? <span className="text-white/45">· {item.distance_label}</span> : null}
                    </p>
                  ) : null}

                  <p className="line-clamp-3 text-xs leading-relaxed text-white/65">{activity.reason}</p>
                </div>
              </div>

              <div className="space-y-2.5 border-t border-white/[0.06] p-4 pt-3">
                <div className="flex flex-wrap items-center gap-2">
                  {onSwapStep ? (
                    <button
                      type="button"
                      onClick={() => onSwapStep(index as 0 | 1 | 2)}
                      className="btn-ghost gap-1.5 py-1.5 px-3 text-[11px]"
                      title="Trocar apenas este momento por outra recomendação da IA"
                    >
                      <RefreshCw className="h-3 w-3 text-[#f4d06f]" />
                      <span>Trocar etapa</span>
                    </button>
                  ) : null}

                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${mapQuery}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-ghost py-1.5 px-3 text-[11px] text-[#38bdf8]"
                  >
                    📍 Rota
                  </a>

                  {activity.cta_url ? (
                    <a
                      href={activity.cta_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-ghost gap-1 py-1.5 px-3 text-[11px]"
                    >
                      <ExternalLink className="h-3 w-3" />
                      <span>Abrir</span>
                    </a>
                  ) : null}

                  {activity.spoiler_hint ? (
                    <button
                      type="button"
                      onClick={() => setOpenSpoiler(openSpoiler === activity.title ? null : activity.title)}
                      className="btn-ghost py-1.5 px-2.5 text-[11px]"
                    >
                      💡 Dica
                    </button>
                  ) : null}
                </div>

                {openSpoiler === activity.title && activity.spoiler_hint ? (
                  <p className="rounded-xl bg-white/[0.05] px-3 py-2 text-xs text-white/70">
                    {activity.spoiler_hint}
                  </p>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>

      {plan.planning_notes?.length ? (
        <div className="surface p-4 sm:p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#f4d06f]">
            Notas logísticas do encontro
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {plan.planning_notes.map((note) => (
              <span key={note} className="pill text-xs">
                {note}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </motion.section>
  );
}
