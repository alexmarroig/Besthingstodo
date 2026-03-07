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
      <h2 className="text-2xl font-semibold">Date Night AI</h2>
      <button onClick={() => mutation.mutate()} className="rounded-2xl bg-primary px-4 py-3 text-sm font-medium shadow-glow">
        Generate date night plan
      </button>
      {mutation.data ? <DateNightPlanCard plan={mutation.data} /> : null}
    </section>
  );
}

