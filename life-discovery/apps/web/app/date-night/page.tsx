"use client";

import { useMutation } from "@tanstack/react-query";

import DateNightPlanCard from "../../components/date-night/plan-card";
import { generateDateNightPlan } from "../../lib/api";
import { getUserId } from "../../lib/storage";

export default function DateNightPage() {
  const userId = getUserId();
  const mutation = useMutation({ mutationFn: () => generateDateNightPlan(userId) });

  return (
    <section className="space-y-4">
      <div className="glass rounded-[2rem] p-6">
        <h2 className="text-3xl font-semibold">Date Night AI</h2>
        <p className="mt-2 max-w-2xl text-sm text-white/68">
          Gere um roteiro equilibrado para o casal com começo leve, momento cultural e fechamento confortável.
        </p>
        <button onClick={() => mutation.mutate()} className="mt-5 rounded-2xl bg-[#ff7a59] px-4 py-3 text-sm font-medium text-white shadow-glow">
          Gerar plano da noite
        </button>
      </div>

      {mutation.data ? <DateNightPlanCard plan={mutation.data} /> : null}
    </section>
  );
}
