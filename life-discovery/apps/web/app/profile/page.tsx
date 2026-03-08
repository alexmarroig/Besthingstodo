"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { fetchCoupleMe, fetchCulturalDNA } from "../../lib/api";
import { getUserId, setUserId } from "../../lib/storage";

export default function ProfilePage() {
  const [userId, setUid] = useState(getUserId());
  const { data } = useQuery({ queryKey: ["dna", userId], queryFn: () => fetchCulturalDNA(userId) });
  const { data: couple } = useQuery({ queryKey: ["couple-me"], queryFn: fetchCoupleMe });

  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-semibold">Profile</h2>
      <div className="glass space-y-2 rounded-2xl p-4">
        <p className="text-xs text-white/70">User ID</p>
        <input
          value={userId}
          onChange={(e) => setUid(e.target.value)}
          className="w-full rounded-xl bg-white/10 p-2 text-sm"
        />
        <button onClick={() => setUserId(userId)} className="rounded-xl bg-primary px-3 py-2 text-sm">Save user</button>
      </div>

      <div className="glass rounded-2xl p-4 text-sm text-white/80">
        <p className="font-medium">Conta casal</p>
        <p>{couple?.account_name || "Sem conta autenticada"}</p>
        <p>{couple?.city || ""} {couple?.neighborhood ? `- ${couple.neighborhood}` : ""}</p>
        <p>{(couple?.members || []).map((m: any) => m.full_name).join(" + ")}</p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {data?.cultural_dna
          ? Object.entries(data.cultural_dna).map(([k, v]) => (
              <div key={k} className="glass rounded-2xl p-4">
                <p className="text-xs uppercase text-white/60">{k}</p>
                <p className="mt-1 text-lg font-semibold">{String(v)}</p>
              </div>
            ))
          : <p className="text-sm text-white/60">No cultural DNA yet. Complete onboarding first.</p>}
      </div>
    </section>
  );
}
