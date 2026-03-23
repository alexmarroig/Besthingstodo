"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";

import { fetchCoupleMe, fetchCulturalDNA, patchCoupleProfile } from "@/shared/api/client";
import { getUserId } from "@/shared/storage";

function listToText(value?: string[]) {
  return (value || []).join(", ");
}

function textToList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function ProfileScreen() {
  const userId = getUserId();
  const { data: couple, refetch } = useQuery({ queryKey: ["couple-me"], queryFn: fetchCoupleMe });
  const { data } = useQuery({ queryKey: ["dna", userId], queryFn: () => fetchCulturalDNA(userId) });
  const [form, setForm] = useState({
    city: "São Paulo",
    neighborhood: "Campo Belo",
    max_drive_minutes: "40",
    search_radius_km: "10",
    transport: "car",
    avoid_going_out_when_rain: true,
    member_1_name: "Alex",
    member_1_interests: "technology, science, psychology, astrology",
    member_1_dislikes: "crowded places, nightclubs, bars",
    member_2_name: "Camila",
    member_2_interests: "psychology, astrology",
    member_2_dislikes: "crowded places, nightclubs, bars"
  });

  useEffect(() => {
    if (!couple) return;
    setForm({
      city: couple.city || "São Paulo",
      neighborhood: couple.neighborhood || "Campo Belo",
      max_drive_minutes: String(couple.max_drive_minutes || 40),
      search_radius_km: String(couple.search_radius_km || 10),
      transport: couple.transport || "car",
      avoid_going_out_when_rain: couple.avoid_going_out_when_rain ?? true,
      member_1_name: couple.members?.[0]?.full_name || "Alex",
      member_1_interests: listToText(couple.members?.[0]?.interests),
      member_1_dislikes: listToText(couple.members?.[0]?.dislikes),
      member_2_name: couple.members?.[1]?.full_name || "Camila",
      member_2_interests: listToText(couple.members?.[1]?.interests),
      member_2_dislikes: listToText(couple.members?.[1]?.dislikes)
    });
  }, [couple]);

  const mutation = useMutation({
    mutationFn: () =>
      patchCoupleProfile({
        city: form.city,
        neighborhood: form.neighborhood,
        max_drive_minutes: Number(form.max_drive_minutes),
        search_radius_km: Number(form.search_radius_km),
        transport: form.transport,
        avoid_going_out_when_rain: form.avoid_going_out_when_rain,
        members: [
          {
            full_name: form.member_1_name,
            drinks_alcohol: false,
            smokes: false,
            interests: textToList(form.member_1_interests),
            dislikes: textToList(form.member_1_dislikes)
          },
          {
            full_name: form.member_2_name,
            drinks_alcohol: false,
            smokes: false,
            interests: textToList(form.member_2_interests),
            dislikes: textToList(form.member_2_dislikes)
          }
        ]
      }),
    onSuccess: () => {
      refetch();
    }
  });

  return (
    <section className="space-y-5">
      <div className="glass rounded-[2.2rem] p-6">
        <p className="text-[11px] uppercase tracking-[0.32em] text-[#f4d06f]">Ajustes do casal</p>
        <h2 className="mt-2 text-4xl font-semibold">Preferências e contexto</h2>
        <p className="mt-3 max-w-3xl text-sm text-white/68">
          Esta área saiu da navegação principal para não parecer painel técnico, mas continua disponível para calibrar o que o app entende sobre vocês.
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          <div className="editorial-card rounded-[2rem] p-5">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2 text-sm text-white/72">
                <span>Cidade base</span>
                <input value={form.city} onChange={(event) => setForm((prev) => ({ ...prev, city: event.target.value }))} className="w-full rounded-[1rem] border border-white/8 bg-white/6 px-4 py-3 text-white" />
              </label>
              <label className="space-y-2 text-sm text-white/72">
                <span>Bairro base</span>
                <input value={form.neighborhood} onChange={(event) => setForm((prev) => ({ ...prev, neighborhood: event.target.value }))} className="w-full rounded-[1rem] border border-white/8 bg-white/6 px-4 py-3 text-white" />
              </label>
              <label className="space-y-2 text-sm text-white/72">
                <span>Máximo de deslocamento (min)</span>
                <input value={form.max_drive_minutes} onChange={(event) => setForm((prev) => ({ ...prev, max_drive_minutes: event.target.value }))} className="w-full rounded-[1rem] border border-white/8 bg-white/6 px-4 py-3 text-white" />
              </label>
              <label className="space-y-2 text-sm text-white/72">
                <span>Raio de busca (km)</span>
                <input value={form.search_radius_km} onChange={(event) => setForm((prev) => ({ ...prev, search_radius_km: event.target.value }))} className="w-full rounded-[1rem] border border-white/8 bg-white/6 px-4 py-3 text-white" />
              </label>
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, transport: prev.transport === "car" ? "ride" : "car" }))}
                className="rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm text-white/78"
              >
                Transporte: {form.transport}
              </button>
              <button
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, avoid_going_out_when_rain: !prev.avoid_going_out_when_rain }))}
                className="rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm text-white/78"
              >
                {form.avoid_going_out_when_rain ? "priorizar cobertos" : "mais flexível com clima"}
              </button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {[
              {
                key: "member_1",
                title: "Pessoa 1",
                name: form.member_1_name,
                interests: form.member_1_interests,
                dislikes: form.member_1_dislikes
              },
              {
                key: "member_2",
                title: "Pessoa 2",
                name: form.member_2_name,
                interests: form.member_2_interests,
                dislikes: form.member_2_dislikes
              }
            ].map((person) => (
              <div key={person.key} className="editorial-card rounded-[2rem] p-5">
                <p className="text-[11px] uppercase tracking-[0.28em] text-[#f4d06f]">{person.title}</p>
                <div className="mt-4 space-y-3">
                  <input
                    value={person.name}
                    onChange={(event) => setForm((prev) => ({ ...prev, [`${person.key}_name`]: event.target.value }))}
                    className="w-full rounded-[1rem] border border-white/8 bg-white/6 px-4 py-3 text-white"
                  />
                  <textarea
                    value={person.interests}
                    onChange={(event) => setForm((prev) => ({ ...prev, [`${person.key}_interests`]: event.target.value }))}
                    rows={3}
                    className="w-full rounded-[1rem] border border-white/8 bg-white/6 px-4 py-3 text-white"
                    placeholder="Interesses separados por vírgula"
                  />
                  <textarea
                    value={person.dislikes}
                    onChange={(event) => setForm((prev) => ({ ...prev, [`${person.key}_dislikes`]: event.target.value }))}
                    rows={3}
                    className="w-full rounded-[1rem] border border-white/8 bg-white/6 px-4 py-3 text-white"
                    placeholder="Coisas a evitar separadas por vírgula"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <button onClick={() => mutation.mutate()} className="rounded-full bg-[#f97352] px-5 py-3 text-sm font-medium text-white">Salvar ajustes</button>
            <Link href="/onboarding" className="text-sm text-white/58 transition hover:text-white/82">
              Abrir onboarding guiado
            </Link>
          </div>
          {mutation.isSuccess ? <p className="text-sm text-[#f4d06f]">Ajustes salvos com sucesso.</p> : null}
        </div>

        <div className="space-y-4">
          <div className="editorial-card rounded-[2rem] p-5">
            <p className="text-[11px] uppercase tracking-[0.28em] text-[#f4d06f]">Conta atual</p>
            <h3 className="mt-2 text-2xl font-semibold">{couple?.account_name || "Alex & Camila"}</h3>
            <p className="mt-3 text-sm text-white/68">{couple?.city || "São Paulo"}{couple?.neighborhood ? ` • ${couple.neighborhood}` : ""}</p>
            <p className="mt-2 text-sm text-white/60">{couple?.members?.map((member) => member.full_name).join(" + ") || "Perfil local em fallback"}</p>
          </div>

          <div className="editorial-card rounded-[2rem] p-5">
            <p className="text-[11px] uppercase tracking-[0.28em] text-[#f4d06f]">DNA cultural</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {data?.cultural_dna
                ? Object.entries(data.cultural_dna).map(([key, value]) => (
                    <div key={key} className="rounded-[1.3rem] border border-white/10 bg-white/5 p-4">
                      <p className="text-[11px] uppercase tracking-[0.22em] text-white/48">{key.replaceAll("_", " ")}</p>
                      <p className="mt-2 text-lg font-medium capitalize text-white">{String(value)}</p>
                    </div>
                  ))
                : <p className="text-sm text-white/62">Complete o onboarding para enriquecer o perfil cultural.</p>}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

