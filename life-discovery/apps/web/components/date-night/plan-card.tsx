"use client";

import { useState } from "react";
import { motion } from "framer-motion";

import ExperienceImage from "@/components/discovery/experience-image";
import { DateNightPlan } from "../../lib/types";
import { Recommendation } from "@life/shared-types";

function labelTimeWindow(value?: "morning" | "afternoon" | "night") {
  if (value === "morning") return "Manhã";
  if (value === "afternoon") return "Tarde";
  return "Noite";
}

function activityToRecommendation(activity: DateNightPlan["activity_1"], index: number): Recommendation {
  return {
    id: activity.recommendation_id || `plan-${index}`,
    title: activity.title,
    description: activity.reason,
    category: "event",
    domain: "events_exhibitions",
    city: "São Paulo",
    location: "São Paulo",
    image_url: activity.image_url || null,
    image_fallback_key: "dining",
    url: activity.cta_url || null,
    tags: [],
    source: "Noite a Dois",
  };
}

export default function DateNightPlanCard({ plan }: { plan: DateNightPlan }) {
  const [openSpoiler, setOpenSpoiler] = useState<string | null>(null);
  const activities = [plan.activity_1, plan.activity_2, plan.activity_3];

  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="space-y-5"
    >
      <div className="surface p-5 sm:p-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#f4d06f]">Seu roteiro</p>
        <h2 className="mt-2 font-display text-2xl font-semibold text-white sm:text-3xl">Três momentos</h2>
        <p className="mt-2 text-sm text-white/55">{plan.weather_note || plan.reasoning}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {activities.map((activity, index) => {
          const item = activityToRecommendation(activity, index);
          return (
            <article key={item.id} className="experience-card overflow-hidden">
              <div className="relative aspect-[4/3]">
                <ExperienceImage item={item} mode="tile" className="absolute inset-0 h-full w-full" />
                <div className="absolute left-3 top-3">
                  <span className="pill-accent text-[10px] backdrop-blur-md">
                    {index + 1} · {labelTimeWindow(activity.time_window)}
                  </span>
                </div>
              </div>

              <div className="space-y-3 p-4">
                <h3 className="line-clamp-2 text-[15px] font-semibold text-white">{activity.title}</h3>
                <p className="line-clamp-3 text-sm text-white/55">{activity.reason}</p>

                <div className="flex flex-wrap gap-2">
                  {activity.cta_url ? (
                    <a href={activity.cta_url} target="_blank" rel="noopener noreferrer" className="btn-primary py-2 text-xs">
                      Abrir
                    </a>
                  ) : (
                    <span className="pill text-[10px]">Sem link</span>
                  )}
                  {activity.spoiler_hint ? (
                    <button
                      type="button"
                      onClick={() => setOpenSpoiler(openSpoiler === activity.title ? null : activity.title)}
                      className="btn-ghost py-2 text-xs"
                    >
                      Dica
                    </button>
                  ) : null}
                </div>

                {openSpoiler === activity.title && activity.spoiler_hint ? (
                  <p className="rounded-xl bg-white/[0.04] px-3 py-2 text-xs text-white/60">{activity.spoiler_hint}</p>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>

      {plan.planning_notes?.length ? (
        <div className="surface p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#f4d06f]">Resumo</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {plan.planning_notes.map((note) => (
              <span key={note} className="pill text-[11px]">
                {note}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </motion.section>
  );
}
