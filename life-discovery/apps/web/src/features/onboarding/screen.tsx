"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";

import { fetchCoupleMe, patchCoupleProfile } from "@/shared/api/client";

function listToText(value?: string[]) {
  return (value || []).join(", ");
}

function textToList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function OnboardingScreen() {
  const [status, setStatus] = useState("Ajuste localização, gostos e restrições. Tudo fica salvo no navegador.");
  const { data: couple, refetch } = useQuery({ queryKey: ["couple-me"], queryFn: fetchCoupleMe });
  const [form, setForm] = useState({
    city: "São Paulo",
    neighborhood: "Campo Belo",
    transport: "car",
    avoid_going_out_when_rain: true,
    member_1_name: "Pessoa A",
    member_1_interests: "",
    member_1_dislikes: "",
    member_2_name: "Pessoa B",
    member_2_interests: "",
    member_2_dislikes: "",
  });

  useEffect(() => {
    if (!couple) return;
    setForm({
      city: couple.city || "São Paulo",
      neighborhood: couple.neighborhood || "Campo Belo",
      transport: couple.transport || "car",
      avoid_going_out_when_rain: couple.avoid_going_out_when_rain ?? true,
      member_1_name: couple.members?.[0]?.full_name || "Pessoa A",
      member_1_interests: listToText(couple.members?.[0]?.interests),
      member_1_dislikes: listToText(couple.members?.[0]?.dislikes),
      member_2_name: couple.members?.[1]?.full_name || "Pessoa B",
      member_2_interests: listToText(couple.members?.[1]?.interests),
      member_2_dislikes: listToText(couple.members?.[1]?.dislikes),
    });
  }, [couple]);

  const saveMutation = useMutation({
    mutationFn: () =>
      patchCoupleProfile({
        city: form.city,
        neighborhood: form.neighborhood,
        transport: form.transport,
        avoid_going_out_when_rain: form.avoid_going_out_when_rain,
        account_name: `${form.member_1_name} & ${form.member_2_name}`,
        members: [
          {
            full_name: form.member_1_name,
            drinks_alcohol: false,
            smokes: false,
            interests: textToList(form.member_1_interests),
            dislikes: textToList(form.member_1_dislikes),
          },
          {
            full_name: form.member_2_name,
            drinks_alcohol: false,
            smokes: false,
            interests: textToList(form.member_2_interests),
            dislikes: textToList(form.member_2_dislikes),
          },
        ],
      }),
    onSuccess: () => {
      setStatus("✓ Preferências salvas. A curadoria já usa este contexto.");
      refetch();
    },
    onError: () => {
      setStatus("Não consegui salvar. Tente novamente.");
    },
  });

  return (
    <main className="space-y-5">
      <div className="glass rounded-[2.2rem] p-6">
        <p className="text-[11px] uppercase tracking-[0.32em] text-[#f4d06f]">Onboarding do casal</p>
        <h1 className="mt-2 text-4xl font-semibold">Configurar preferências</h1>
        <p className="mt-3 max-w-3xl text-sm text-white/68">
          Localização, transporte, interesses e o que evitar. Tudo salvo localmente no navegador e usado pela curadoria.
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-4">
          <div className="editorial-card rounded-[2rem] p-5">
            <p className="text-[11px] uppercase tracking-[0.28em] text-[#f4d06f]">Contexto base</p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <input value={form.city} onChange={(event) => setForm((prev) => ({ ...prev, city: event.target.value }))} className="rounded-[1rem] border border-white/8 bg-white/6 px-4 py-3 text-white" placeholder="Cidade" />
              <input value={form.neighborhood} onChange={(event) => setForm((prev) => ({ ...prev, neighborhood: event.target.value }))} className="rounded-[1rem] border border-white/8 bg-white/6 px-4 py-3 text-white" placeholder="Bairro" />
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <button onClick={() => setForm((prev) => ({ ...prev, transport: prev.transport === "car" ? "ride" : "car" }))} className="rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm text-white/78">
                Transporte: {form.transport === "car" ? "Carro" : "App/Uber"}
              </button>
              <button onClick={() => setForm((prev) => ({ ...prev, avoid_going_out_when_rain: !prev.avoid_going_out_when_rain }))} className="rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm text-white/78">
                {form.avoid_going_out_when_rain ? "☔ Preferir cobertos" : "🌤️ Aceitar tempo aberto"}
              </button>
            </div>
          </div>

          <div className="editorial-card rounded-[2rem] p-5">
            <p className="text-[11px] uppercase tracking-[0.28em] text-[#f4d06f]">Estado</p>
            <p className="mt-3 text-sm text-white/70">{status}</p>
            <p className="mt-3 text-sm text-white/56">Perfil: {couple?.account_name || "perfil local"}</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {[
            { key: "member_1", title: "Pessoa 1", name: form.member_1_name, interests: form.member_1_interests, dislikes: form.member_1_dislikes },
            { key: "member_2", title: "Pessoa 2", name: form.member_2_name, interests: form.member_2_interests, dislikes: form.member_2_dislikes },
          ].map((person) => (
            <div key={person.key} className="editorial-card rounded-[2rem] p-5">
              <p className="text-[11px] uppercase tracking-[0.28em] text-[#f4d06f]">{person.title}</p>
              <div className="mt-4 space-y-3">
                <input value={person.name} onChange={(event) => setForm((prev) => ({ ...prev, [`${person.key}_name`]: event.target.value }))} className="w-full rounded-[1rem] border border-white/8 bg-white/6 px-4 py-3 text-white" placeholder="Nome" />
                <textarea value={person.interests} onChange={(event) => setForm((prev) => ({ ...prev, [`${person.key}_interests`]: event.target.value }))} rows={3} className="w-full rounded-[1rem] border border-white/8 bg-white/6 px-4 py-3 text-white" placeholder="Interesses separados por vírgula" />
                <textarea value={person.dislikes} onChange={(event) => setForm((prev) => ({ ...prev, [`${person.key}_dislikes`]: event.target.value }))} rows={3} className="w-full rounded-[1rem] border border-white/8 bg-white/6 px-4 py-3 text-white" placeholder="O que evitar separado por vírgula" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <button onClick={() => saveMutation.mutate()} className="rounded-full bg-[#f97352] px-6 py-3 text-sm font-medium text-white shadow-[0_16px_30px_rgba(249,115,82,0.22)] transition hover:shadow-[0_20px_40px_rgba(249,115,82,0.3)]">
        Salvar preferências
      </button>
    </main>
  );
}
