"use client";

import { motion } from "framer-motion";

import { DateNightPlan } from "../../lib/types";

export default function DateNightPlanCard({ plan }: { plan: DateNightPlan }) {
  return (
    <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass space-y-4 rounded-[2rem] p-5">
      <h2 className="text-2xl font-semibold">Plano da noite</h2>
      {[plan.activity_1, plan.activity_2, plan.activity_3].map((a, i) => (
        <article key={i} className="rounded-2xl bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.22em] text-[#ffd166]">Momento {i + 1}</p>
          <h3 className="mt-2 text-lg font-medium">{a.title}</h3>
          <p className="mt-1 text-sm text-white/70">{a.reason}</p>
        </article>
      ))}
      <p className="text-sm text-white/60">{plan.reasoning}</p>
    </motion.section>
  );
}
