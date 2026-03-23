"use client";

import { motion } from "framer-motion";

import { DateNightPlan } from "../../lib/types";

export default function DateNightPlanCard({ plan }: { plan: DateNightPlan }) {
  return (
    <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="editorial-card space-y-5 rounded-[2rem] p-6">
      <div>
        <p className="text-[11px] uppercase tracking-[0.3em] text-[#ffd27a]">Roteiro sugerido</p>
        <h2 className="mt-2 text-3xl font-semibold">Plano da noite</h2>
        <p className="mt-3 max-w-3xl text-sm text-white/70">{plan.reasoning}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {[plan.activity_1, plan.activity_2, plan.activity_3].map((activity, index) => (
          <article key={index} className="rounded-[1.6rem] border border-white/10 bg-white/5 p-5">
            <p className="text-[11px] uppercase tracking-[0.26em] text-[#ffd27a]">Momento {index + 1}</p>
            <h3 className="mt-3 text-xl font-medium text-white">{activity.title}</h3>
            <p className="mt-3 text-sm text-white/72">{activity.reason}</p>
          </article>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {plan.weather_note ? (
          <div className="rounded-[1.4rem] border border-white/10 bg-white/5 p-4">
            <p className="text-[11px] uppercase tracking-[0.26em] text-[#ffd27a]">Clima e ritmo</p>
            <p className="mt-2 text-sm text-white/72">{plan.weather_note}</p>
          </div>
        ) : null}
        {plan.couple_note ? (
          <div className="rounded-[1.4rem] border border-white/10 bg-white/5 p-4">
            <p className="text-[11px] uppercase tracking-[0.26em] text-[#ffd27a]">Leitura do casal</p>
            <p className="mt-2 text-sm text-white/72">{plan.couple_note}</p>
          </div>
        ) : null}
      </div>

      {plan.planning_notes?.length ? (
        <div className="rounded-[1.6rem] border border-white/10 bg-white/5 p-4">
          <p className="text-[11px] uppercase tracking-[0.26em] text-[#ffd27a]">Notas práticas</p>
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

