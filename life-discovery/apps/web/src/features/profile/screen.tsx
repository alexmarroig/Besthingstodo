"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";

import { fetchCoupleMe, fetchCulturalDNA, patchCoupleProfile } from "@/shared/api/client";
import { getUserId } from "@/shared/storage";
import { CoupleSnapshot } from "@life/shared-types";

const MOVIE_GENRES = ["ação", "comédia", "drama", "romance", "suspense", "sci-fi", "terror"];
const SERIES_GENRES = ["drama", "comédia", "suspense", "documentário", "romance", "true crime"];
const MUSIC_GENRES = ["mpb", "pop", "jazz", "indie", "eletrônica", "rock", "samba"];
const CUISINES = ["italiana", "japonesa", "brasileira", "mexicana", "árabe", "vegetariana", "contemporânea"];
const ACTIVITIES = ["cinema", "teatro", "museu", "show", "livraria", "jantar", "café", "parque"];
const ROMANTIC_WALKS = ["jantar intimista", "cinema", "teatro", "museu", "show ao vivo", "livraria + café"];

function toggleArray(value: string[], target: string) {
  return value.includes(target) ? value.filter((item) => item !== target) : [...value, target];
}

function ChipGroup({
  title,
  options,
  values,
  onToggle,
}: {
  title: string;
  options: string[];
  values: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs uppercase tracking-[0.22em] text-white/50">{title}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onToggle(option)}
            className={`rounded-full px-3 py-1.5 text-xs transition ${
              values.includes(option)
                ? "bg-[#f97352] text-white"
                : "border border-white/12 bg-white/6 text-white/70 hover:bg-white/10"
            }`}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function ProfileScreen() {
  const userId = getUserId();
  const { data: couple, refetch } = useQuery({ queryKey: ["couple-me"], queryFn: fetchCoupleMe });
  const { data } = useQuery({ queryKey: ["dna", userId], queryFn: () => fetchCulturalDNA(userId) });
  const [form, setForm] = useState<CoupleSnapshot>({
    account_name: "Alex & Camila",
    city: "São Paulo",
    neighborhood: "Campo Belo",
    max_drive_minutes: 40,
    search_radius_km: 10,
    transport: "car",
    avoid_going_out_when_rain: true,
    members: [
      {
        full_name: "Alex",
        drinks_alcohol: false,
        smokes: false,
        interests: [],
        dislikes: [],
        movie_genres: [],
        series_genres: [],
        music_genres: [],
        prefers_theater: false,
        likes_party: false,
        allergies: [],
        intolerances: [],
        food_dislikes: [],
      },
      {
        full_name: "Camila",
        drinks_alcohol: false,
        smokes: false,
        interests: [],
        dislikes: [],
        movie_genres: [],
        series_genres: [],
        music_genres: [],
        prefers_theater: false,
        likes_party: false,
        allergies: [],
        intolerances: [],
        food_dislikes: [],
      },
    ],
    preferences: {
      preferred_cuisines: [],
      avoided_cuisines: [],
      romantic_walk_types: [],
      preferred_dayparts: ["night"],
      preferred_activities: [],
      budget_range: "medium",
      alcohol_policy: "none_drink",
      avoids_outdoor_when_rain: true,
    },
  });

  useEffect(() => {
    if (!couple) return;
    setForm((prev) => ({
      ...prev,
      ...couple,
      city: couple.city || "São Paulo",
      neighborhood: couple.neighborhood || "Campo Belo",
      max_drive_minutes: couple.max_drive_minutes || 40,
      search_radius_km: couple.search_radius_km || 10,
      transport: couple.transport || "car",
      avoid_going_out_when_rain: couple.avoid_going_out_when_rain ?? true,
      members: [couple.members?.[0] || prev.members[0], couple.members?.[1] || prev.members[1]],
      preferences: {
        ...prev.preferences,
        ...(couple.preferences || {}),
      },
    }));
  }, [couple]);

  const mutation = useMutation({
    mutationFn: () =>
      patchCoupleProfile({
        ...form,
        max_drive_minutes: Number(form.max_drive_minutes || 40),
        search_radius_km: Number(form.search_radius_km || 10),
      }),
    onSuccess: () => {
      refetch();
    }
  });

  return (
    <section className="space-y-5">
      <div className="glass rounded-[2.2rem] p-6">
        <p className="text-[11px] uppercase tracking-[0.32em] text-[#f4d06f]">Ajustes do casal</p>
        <h2 className="mt-2 text-4xl font-semibold">Perfil do casal</h2>
        <p className="mt-3 max-w-3xl text-sm text-white/68">
          Preencha os gostos de vocês de forma estruturada para melhorar filmes, restaurantes, eventos e o plano da noite.
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          <div className="editorial-card rounded-[2rem] p-5">
            <p className="text-[11px] uppercase tracking-[0.28em] text-[#f4d06f]">Contexto</p>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2 text-sm text-white/72">
                <span>Cidade base</span>
                <input value={form.city} onChange={(event) => setForm((prev) => ({ ...prev, city: event.target.value }))} className="w-full rounded-[1rem] border border-white/8 bg-white/6 px-4 py-3 text-white" />
              </label>
              <label className="space-y-2 text-sm text-white/72">
                <span>Bairro base</span>
                <input value={form.neighborhood ?? ""} onChange={(event) => setForm((prev) => ({ ...prev, neighborhood: event.target.value }))} className="w-full rounded-[1rem] border border-white/8 bg-white/6 px-4 py-3 text-white" />
              </label>
              <label className="space-y-2 text-sm text-white/72">
                <span>Máximo de deslocamento (min)</span>
                <input type="number" min={5} max={180} value={form.max_drive_minutes || 40} onChange={(event) => setForm((prev) => ({ ...prev, max_drive_minutes: Number(event.target.value) }))} className="w-full rounded-[1rem] border border-white/8 bg-white/6 px-4 py-3 text-white" />
              </label>
              <label className="space-y-2 text-sm text-white/72">
                <span>Raio de busca (km)</span>
                <input type="number" min={1} max={60} value={form.search_radius_km || 10} onChange={(event) => setForm((prev) => ({ ...prev, search_radius_km: Number(event.target.value) }))} className="w-full rounded-[1rem] border border-white/8 bg-white/6 px-4 py-3 text-white" />
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
              <button
                type="button"
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    preferences: {
                      ...(prev.preferences || {}),
                      budget_range:
                        prev.preferences?.budget_range === "low"
                          ? "medium"
                          : prev.preferences?.budget_range === "medium"
                            ? "high"
                            : "low",
                    },
                  }))
                }
                className="rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm text-white/78"
              >
                orçamento: {form.preferences?.budget_range || "medium"}
              </button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {[0, 1].map((idx) => {
              const member = form.members?.[idx] || { full_name: "" };
              return (
                <div key={idx} className="editorial-card rounded-[2rem] p-5">
                  <p className="text-[11px] uppercase tracking-[0.28em] text-[#f4d06f]">Pessoa {idx + 1}</p>
                  <div className="mt-4 space-y-4">
                    <input
                      value={member.full_name ?? ""}
                      onChange={(event) =>
                        setForm((prev) => {
                          const nextMembers = [...(prev.members || [])];
                          nextMembers[idx] = { ...nextMembers[idx], full_name: event.target.value };
                          return { ...prev, members: nextMembers };
                        })
                      }
                      className="w-full rounded-[1rem] border border-white/8 bg-white/6 px-4 py-3 text-white"
                    />
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setForm((prev) => {
                            const nextMembers = [...(prev.members || [])];
                            nextMembers[idx] = { ...nextMembers[idx], drinks_alcohol: !nextMembers[idx]?.drinks_alcohol };
                            return { ...prev, members: nextMembers };
                          })
                        }
                        className="rounded-full border border-white/12 bg-white/6 px-3 py-1.5 text-xs text-white/70"
                      >
                        {member.drinks_alcohol ? "bebe álcool" : "não bebe álcool"}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setForm((prev) => {
                            const nextMembers = [...(prev.members || [])];
                            nextMembers[idx] = { ...nextMembers[idx], likes_party: !nextMembers[idx]?.likes_party };
                            return { ...prev, members: nextMembers };
                          })
                        }
                        className="rounded-full border border-white/12 bg-white/6 px-3 py-1.5 text-xs text-white/70"
                      >
                        {member.likes_party ? "gosta de balada" : "evita balada"}
                      </button>
                    </div>
                    <ChipGroup
                      title="gêneros de filme"
                      options={MOVIE_GENRES}
                      values={member.movie_genres || []}
                      onToggle={(value) =>
                        setForm((prev) => {
                          const nextMembers = [...(prev.members || [])];
                          nextMembers[idx] = {
                            ...nextMembers[idx],
                            movie_genres: toggleArray(nextMembers[idx]?.movie_genres || [], value),
                          };
                          return { ...prev, members: nextMembers };
                        })
                      }
                    />
                    <ChipGroup
                      title="gêneros de série"
                      options={SERIES_GENRES}
                      values={member.series_genres || []}
                      onToggle={(value) =>
                        setForm((prev) => {
                          const nextMembers = [...(prev.members || [])];
                          nextMembers[idx] = {
                            ...nextMembers[idx],
                            series_genres: toggleArray(nextMembers[idx]?.series_genres || [], value),
                          };
                          return { ...prev, members: nextMembers };
                        })
                      }
                    />
                    <ChipGroup
                      title="música"
                      options={MUSIC_GENRES}
                      values={member.music_genres || []}
                      onToggle={(value) =>
                        setForm((prev) => {
                          const nextMembers = [...(prev.members || [])];
                          nextMembers[idx] = {
                            ...nextMembers[idx],
                            music_genres: toggleArray(nextMembers[idx]?.music_genres || [], value),
                          };
                          return { ...prev, members: nextMembers };
                        })
                      }
                    />
                    <label className="space-y-2 text-sm text-white/72">
                      <span>Alergias/intolerâncias (vírgula)</span>
                      <input
                        value={[...(member.allergies || []), ...(member.intolerances || [])].join(", ")}
                        onChange={(event) =>
                          setForm((prev) => {
                            const values = event.target.value.split(",").map((item) => item.trim()).filter(Boolean);
                            const nextMembers = [...(prev.members || [])];
                            nextMembers[idx] = {
                              ...nextMembers[idx],
                              allergies: values,
                              intolerances: [],
                            };
                            return { ...prev, members: nextMembers };
                          })
                        }
                        className="w-full rounded-[1rem] border border-white/8 bg-white/6 px-4 py-3 text-white"
                      />
                    </label>
                    <label className="space-y-2 text-sm text-white/72">
                      <span>Não come / evita (vírgula)</span>
                      <input
                        value={(member.food_dislikes || []).join(", ")}
                        onChange={(event) =>
                          setForm((prev) => {
                            const values = event.target.value.split(",").map((item) => item.trim()).filter(Boolean);
                            const nextMembers = [...(prev.members || [])];
                            nextMembers[idx] = {
                              ...nextMembers[idx],
                              food_dislikes: values,
                            };
                            return { ...prev, members: nextMembers };
                          })
                        }
                        className="w-full rounded-[1rem] border border-white/8 bg-white/6 px-4 py-3 text-white"
                      />
                    </label>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="editorial-card rounded-[2rem] p-5">
            <p className="text-[11px] uppercase tracking-[0.28em] text-[#f4d06f]">Preferências do casal</p>
            <div className="mt-4 space-y-4">
              <ChipGroup
                title="culinárias preferidas"
                options={CUISINES}
                values={form.preferences?.preferred_cuisines || []}
                onToggle={(value) =>
                  setForm((prev) => ({
                    ...prev,
                    preferences: {
                      ...(prev.preferences || {}),
                      preferred_cuisines: toggleArray(prev.preferences?.preferred_cuisines || [], value),
                    },
                  }))
                }
              />
              <ChipGroup
                title="culinárias a evitar"
                options={CUISINES}
                values={form.preferences?.avoided_cuisines || []}
                onToggle={(value) =>
                  setForm((prev) => ({
                    ...prev,
                    preferences: {
                      ...(prev.preferences || {}),
                      avoided_cuisines: toggleArray(prev.preferences?.avoided_cuisines || [], value),
                    },
                  }))
                }
              />
              <ChipGroup
                title="tipos de passeio"
                options={ACTIVITIES}
                values={form.preferences?.preferred_activities || []}
                onToggle={(value) =>
                  setForm((prev) => ({
                    ...prev,
                    preferences: {
                      ...(prev.preferences || {}),
                      preferred_activities: toggleArray(prev.preferences?.preferred_activities || [], value),
                    },
                  }))
                }
              />
              <ChipGroup
                title="passeios românticos"
                options={ROMANTIC_WALKS}
                values={form.preferences?.romantic_walk_types || []}
                onToggle={(value) =>
                  setForm((prev) => ({
                    ...prev,
                    preferences: {
                      ...(prev.preferences || {}),
                      romantic_walk_types: toggleArray(prev.preferences?.romantic_walk_types || [], value),
                    },
                  }))
                }
              />
            </div>
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
              {data
                ? Object.entries(data).map(([key, value]) => (
                    <div key={key} className="rounded-[1.3rem] border border-white/10 bg-white/5 p-4">
                      <p className="text-[11px] uppercase tracking-[0.22em] text-white/48">{key.replaceAll("_", " ")}</p>
                      <p className="mt-2 text-lg font-medium capitalize text-white">{Array.isArray(value) ? value.join(", ") : String(value)}</p>
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

