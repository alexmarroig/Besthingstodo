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
      <div className="glass rounded-[2rem] p-6">
        <h2 className="text-3xl font-semibold">Perfil operacional</h2>
        <p className="mt-2 max-w-2xl text-sm text-white/68">Ajuste o usuário ativo e acompanhe o DNA cultural usado para personalização.</p>
      </div>

      <div className="glass space-y-3 rounded-[1.75rem] p-4">
        <p className="text-xs uppercase tracking-[0.22em] text-white/58">User ID</p>
        <input value={userId} onChange={(e) => setUid(e.target.value)} className="w-full rounded-xl bg-white/10 p-3 text-sm" />
        <button onClick={() => setUserId(userId)} className="w-fit rounded-xl bg-[#ff7a59] px-4 py-2 text-sm text-white">Salvar usuário</button>
      </div>

      <div className="glass rounded-[1.75rem] p-4 text-sm text-white/82">
        <p className="font-medium">Conta do casal</p>
        <p className="mt-2">{couple?.account_name || "Sem conta autenticada no momento"}</p>
        <p>{couple?.city || "São Paulo"} {couple?.neighborhood ? `- ${couple.neighborhood}` : ""}</p>
        <p>{(couple?.members || []).map((m: any) => m.full_name).join(" + ") || "Perfil local em modo fallback"}</p>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {data?.cultural_dna
          ? Object.entries(data.cultural_dna).map(([k, v]) => (
              <div key={k} className="glass rounded-[1.75rem] p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-white/58">{k.replaceAll("_", " ")}</p>
                <p className="mt-2 text-xl font-semibold capitalize">{String(v)}</p>
              </div>
            ))
          : <p className="text-sm text-white/60">Complete o onboarding para enriquecer o perfil.</p>}
      </div>
    </section>
  );
}
