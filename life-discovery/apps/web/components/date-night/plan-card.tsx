"use client";

import { useState } from "react";
import { motion } from "framer-motion";

import { DateNightPlan } from "../../lib/types";

function labelTimeWindow(value?: "morning" | "afternoon" | "night") {
  if (value === "morning") return "manhã";
  if (value === "afternoon") return "tarde";
  return "noite";
}

export default function DateNightPlanCard({ plan }: { plan: DateNightPlan }) {
  const [openSpoiler, setOpenSpoiler] = useState<string | null>(null);
  const activities = [plan.activity_1, plan.activity_2, plan.activity_3];

  return (
    <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="editorial-card space-y-5 rounded-[2rem] p-6">
      <div>
        <p className="text-[11px] uppercase tracking-[0.3em] text-[#ffd27a]">Plano automático</p>
        <h2 className="mt-2 text-3xl font-semibold">O que fazer agora</h2>
        <p className="mt-3 max-w-3xl text-sm text-white/70">{plan.weather_note || plan.reasoning}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {activities.map((activity, index) => (
          <article key={activity.recommendation_id || `${activity.title}-${index}`} className="overflow-hidden rounded-[1.6rem] border border-white/10 bg-white/5">
            <div className="relative aspect-[4/3] bg-black/30">
              {activity.image_url ? (
                <img src={activity.image_url} alt={activity.title} className="h-full w-full object-cover" loading="lazy" />
              ) : (
                <div className="flex h-full items-center justify-center text-xs uppercase tracking-[0.22em] text-white/45">
                  Sem imagem
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <p className="absolute left-3 top-3 rounded-full bg-black/55 px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-[#ffd27a]">
                Momento {index + 1} · {labelTimeWindow(activity.time_window)}
              </p>
              <p className="absolute bottom-3 left-3 rounded-full bg-black/55 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-white/80">
                {activity.is_new_vs_familiar === "familiar" ? "vocês já gostam" : "vale testar"}
              </p>
            </div>

            <div className="space-y-3 p-4">
              <h3 className="line-clamp-2 text-lg font-medium text-white">{activity.title}</h3>
              <p className="line-clamp-3 text-sm text-white/72">{activity.reason}</p>

              <div className="flex flex-wrap gap-2">
                {activity.cta_url ? (
                  <a
                    href={activity.cta_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full bg-[#f97352] px-3 py-2 text-xs font-medium text-white"
                  >
                    Abrir opção
                  </a>
                ) : (
                  <button type="button" className="rounded-full border border-white/15 px-3 py-2 text-xs text-white/70">
                    Sem link direto
                  </button>
                )}
                {activity.spoiler_hint ? (
                  <button
                    type="button"
                    onClick={() => setOpenSpoiler(openSpoiler === activity.title ? null : activity.title)}
                    className="rounded-full border border-white/15 px-3 py-2 text-xs text-white/70"
                  >
                    Dica rápida
                  </button>
                ) : null}
              </div>

              {openSpoiler === activity.title && activity.spoiler_hint ? (
                <p className="rounded-xl bg-white/6 px-3 py-2 text-xs text-white/70">{activity.spoiler_hint}</p>
              ) : null}
            </div>
          </article>
        ))}
      </div>

      {plan.planning_notes?.length ? (
        <div className="rounded-[1.6rem] border border-white/10 bg-white/5 p-4">
          <p className="text-[11px] uppercase tracking-[0.26em] text-[#ffd27a]">Resumo rápido</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {plan.planning_notes.map((note) => (
              <span key={note} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
                {note}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </motion.section>
  );
}

