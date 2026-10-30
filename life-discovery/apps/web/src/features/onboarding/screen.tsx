"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ChipGroup } from "@/components/profile/chip-group";
import { FavoritePicker } from "@/components/profile/favorite-picker";
import {
  ACTIVITIES,
  BUDGETS,
  CROWD_OPTIONS,
  CUISINES,
  DATE_GOALS,
  MOODS,
  MOVIE_GENRES,
  MUSIC_GENRES,
  NOISE_OPTIONS,
  ROMANTIC_WALKS,
  SERIES_GENRES,
  toggleArray,
} from "@/components/profile/profile-constants";
import { SelectCard } from "@/components/profile/select-card";
import { StepShell } from "@/components/profile/step-shell";
import { fetchCoupleMe, patchCoupleProfile } from "@/shared/api/client";
import { getProfileCompleteness } from "@/shared/profile-completeness";
import type { CoupleSnapshot } from "@life/shared-types";

import { mergeProfile, profileChanges } from "@/shared/account-state";

const TOTAL_STEPS = 6;

const emptyMember = (name: string) => ({
  full_name: name,
  drinks_alcohol: false,
  smokes: false,
  interests: [] as string[],
  dislikes: [] as string[],
  movie_genres: [] as string[],
  series_genres: [] as string[],
  music_genres: [] as string[],
  prefers_theater: false,
  likes_party: false,
  allergies: [] as string[],
  intolerances: [] as string[],
  food_dislikes: [] as string[],
});

export default function OnboardingScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const initialStep = Number(searchParams.get("step") || "0");
  const [step, setStep] = useState(Math.min(Math.max(initialStep, 0), TOTAL_STEPS - 1));

  const { data: couple } = useQuery({ queryKey: ["couple-me"], queryFn: fetchCoupleMe });
  const [form, setForm] = useState<CoupleSnapshot>({
    account_name: "Nosso casal",
    city: "São Paulo",
    neighborhood: "",
    max_drive_minutes: 40,
    search_radius_km: 10,
    transport: "car",
    avoid_going_out_when_rain: true,
    members: [emptyMember(""), emptyMember("")],
    preferences: {
      preferred_cuisines: [],
      avoided_cuisines: [],
      romantic_walk_types: [],
      preferred_dayparts: ["night"],
      preferred_activities: [],
      budget_range: "medium",
      alcohol_policy: "none_drink",
      avoids_outdoor_when_rain: true,
      favorite_restaurants: [],
      favorite_places: [],
      favorite_movies: [],
      favorite_series: [],
      wishlist: [],
      crowd_tolerance: "avoid",
      noise_tolerance: "low",
      date_goal: "discover",
      mood: "romantic",
      onboarding_complete: false,
    },
  });

  const baseline = useRef<CoupleSnapshot | null>(null);
  useEffect(() => {
    if (!couple) return;
    const previous = baseline.current;
    setForm(prev => mergeProfile(couple, previous ? profileChanges(previous, prev) : {}) as CoupleSnapshot);
    baseline.current = couple;
  }, [couple]);

  const saveMutation = useMutation({
    mutationFn: (payload: Partial<CoupleSnapshot>) => patchCoupleProfile(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["couple-me"] });
      queryClient.invalidateQueries({ queryKey: ["home-recos"] });
    },
  });

  const persist = async (nextStep?: number, complete = false) => {
    await saveMutation.mutateAsync({
      ...form,
      preferences: {
        ...form.preferences,
        onboarding_complete: complete,
      },
    });
    if (nextStep != null) setStep(nextStep);
    if (complete) router.push("/");
  };

  const completeness = useMemo(() => getProfileCompleteness(form), [form]);

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm text-white/72">
              <span>Cidade</span>
              <input
                value={form.city}
                onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
                className="w-full rounded-[1rem] border border-white/8 bg-white/6 px-4 py-3 text-white"
              />
            </label>
            <label className="space-y-2 text-sm text-white/72">
              <span>Bairro base</span>
              <input
                value={form.neighborhood ?? ""}
                onChange={(e) => setForm((p) => ({ ...p, neighborhood: e.target.value }))}
                className="w-full rounded-[1rem] border border-white/8 bg-white/6 px-4 py-3 text-white"
              />
            </label>
            <label className="space-y-2 text-sm text-white/72">
              <span>Raio de busca (km)</span>
              <input
                type="number"
                min={1}
                max={60}
                value={form.search_radius_km || 10}
                onChange={(e) => setForm((p) => ({ ...p, search_radius_km: Number(e.target.value) }))}
                className="w-full rounded-[1rem] border border-white/8 bg-white/6 px-4 py-3 text-white"
              />
            </label>
            <label className="space-y-2 text-sm text-white/72">
              <span>Deslocamento máximo (min)</span>
              <input
                type="number"
                min={5}
                max={180}
                value={form.max_drive_minutes || 40}
                onChange={(e) => setForm((p) => ({ ...p, max_drive_minutes: Number(e.target.value) }))}
                className="w-full rounded-[1rem] border border-white/8 bg-white/6 px-4 py-3 text-white"
              />
            </label>
            <div className="flex flex-wrap gap-2 md:col-span-2">
              <button
                type="button"
                onClick={() => setForm((p) => ({ ...p, transport: p.transport === "car" ? "ride" : "car" }))}
                className="rounded-full border border-white/12 bg-white/6 px-4 py-2 text-sm text-white/78"
              >
                Transporte: {form.transport === "car" ? "Carro" : "App"}
              </button>
              <button
                type="button"
                onClick={() => setForm((p) => ({ ...p, avoid_going_out_when_rain: !p.avoid_going_out_when_rain }))}
                className="rounded-full border border-white/12 bg-white/6 px-4 py-2 text-sm text-white/78"
              >
                {form.avoid_going_out_when_rain ? "Priorizar cobertos na chuva" : "Flexível com clima"}
              </button>
            </div>
          </div>
        );
      case 1:
        return (
          <div className="space-y-5">
            <div>
              <p className="mb-2 text-xs uppercase tracking-wide text-white/50">Objetivo da noite</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {DATE_GOALS.map((item) => (
                  <SelectCard
                    key={item.id}
                    label={item.label}
                    selected={form.preferences?.date_goal === item.id}
                    onClick={() =>
                      setForm((p) => ({
                        ...p,
                        preferences: { ...p.preferences, date_goal: item.id },
                      }))
                    }
                  />
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs uppercase tracking-wide text-white/50">Vibe do casal</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {MOODS.map((item) => (
                  <SelectCard
                    key={item.id}
                    label={item.label}
                    selected={form.preferences?.mood === item.id}
                    onClick={() => setForm((p) => ({ ...p, preferences: { ...p.preferences, mood: item.id } }))}
                  />
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs uppercase tracking-wide text-white/50">Orçamento</p>
              <div className="grid gap-2 sm:grid-cols-3">
                {BUDGETS.map((item) => (
                  <SelectCard
                    key={item.id}
                    label={item.label}
                    selected={form.preferences?.budget_range === item.id}
                    onClick={() =>
                      setForm((p) => ({
                        ...p,
                        preferences: { ...p.preferences, budget_range: item.id },
                      }))
                    }
                  />
                ))}
              </div>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-5">
            <div>
              <p className="mb-2 text-xs uppercase tracking-wide text-white/50">Lotação</p>
              <div className="grid gap-2 sm:grid-cols-3">
                {CROWD_OPTIONS.map((item) => (
                  <SelectCard
                    key={item.id}
                    label={item.label}
                    selected={form.preferences?.crowd_tolerance === item.id}
                    onClick={() =>
                      setForm((p) => ({
                        ...p,
                        preferences: { ...p.preferences, crowd_tolerance: item.id },
                      }))
                    }
                  />
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs uppercase tracking-wide text-white/50">Barulho</p>
              <div className="grid gap-2 sm:grid-cols-3">
                {NOISE_OPTIONS.map((item) => (
                  <SelectCard
                    key={item.id}
                    label={item.label}
                    selected={form.preferences?.noise_tolerance === item.id}
                    onClick={() =>
                      setForm((p) => ({
                        ...p,
                        preferences: { ...p.preferences, noise_tolerance: item.id },
                      }))
                    }
                  />
                ))}
              </div>
            </div>
            <ChipGroup
              title="Culinárias a evitar"
              options={CUISINES}
              values={form.preferences?.avoided_cuisines || []}
              onToggle={(value) =>
                setForm((p) => ({
                  ...p,
                  preferences: {
                    ...p.preferences,
                    avoided_cuisines: toggleArray(p.preferences?.avoided_cuisines || [], value),
                  },
                }))
              }
            />
            <FavoritePicker
              title="Restrições alimentares"
              placeholder="Ex.: glúten, lactose"
              values={form.preferences?.food_restrictions || []}
              onChange={(values) =>
                setForm((p) => ({
                  ...p,
                  preferences: { ...p.preferences, food_restrictions: values },
                }))
              }
            />
          </div>
        );
      case 3:
        return (
          <div className="grid gap-4 md:grid-cols-2">
            {[0, 1].map((idx) => {
              const member = form.members[idx];
              return (
                <div key={idx} className="space-y-4 rounded-2xl border border-white/8 p-4">
                  <input
                    value={member.full_name}
                    onChange={(e) =>
                      setForm((p) => {
                        const members = [...p.members];
                        members[idx] = { ...members[idx], full_name: e.target.value };
                        return { ...p, members };
                      })
                    }
                    className="w-full rounded-[1rem] border border-white/8 bg-white/6 px-4 py-2 text-white"
                  />
                  <ChipGroup
                    title="Filmes"
                    options={MOVIE_GENRES}
                    values={member.movie_genres || []}
                    onToggle={(value) =>
                      setForm((p) => {
                        const members = [...p.members];
                        members[idx] = {
                          ...members[idx],
                          movie_genres: toggleArray(members[idx].movie_genres || [], value),
                        };
                        return { ...p, members };
                      })
                    }
                  />
                  <ChipGroup
                    title="Séries"
                    options={SERIES_GENRES}
                    values={member.series_genres || []}
                    onToggle={(value) =>
                      setForm((p) => {
                        const members = [...p.members];
                        members[idx] = {
                          ...members[idx],
                          series_genres: toggleArray(members[idx].series_genres || [], value),
                        };
                        return { ...p, members };
                      })
                    }
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setForm((p) => {
                        const members = [...p.members];
                        members[idx] = { ...members[idx], prefers_theater: !members[idx].prefers_theater };
                        return { ...p, members };
                      })
                    }
                    className="rounded-full border border-white/12 px-3 py-1.5 text-xs text-white/70"
                  >
                    {member.prefers_theater ? "Gosta de teatro" : "Teatro: neutro"}
                  </button>
                </div>
              );
            })}
          </div>
        );
      case 4:
        return (
          <div className="space-y-5">
            <ChipGroup
              title="Culinárias preferidas"
              options={CUISINES}
              values={form.preferences?.preferred_cuisines || []}
              onToggle={(value) =>
                setForm((p) => ({
                  ...p,
                  preferences: {
                    ...p.preferences,
                    preferred_cuisines: toggleArray(p.preferences?.preferred_cuisines || [], value),
                  },
                }))
              }
            />
            <FavoritePicker
              title="Restaurantes favoritos"
              placeholder="Ex.: Lellis Trattoria"
              values={form.preferences?.favorite_restaurants || []}
              onChange={(values) =>
                setForm((p) => ({
                  ...p,
                  preferences: { ...p.preferences, favorite_restaurants: values },
                }))
              }
            />
            <FavoritePicker
              title="Filmes que marcaram"
              placeholder="Ex.: Interstellar"
              values={form.preferences?.favorite_movies || []}
              onChange={(values) =>
                setForm((p) => ({
                  ...p,
                  preferences: { ...p.preferences, favorite_movies: values },
                }))
              }
            />
            <FavoritePicker
              title="Séries favoritas"
              placeholder="Ex.: The Bear"
              values={form.preferences?.favorite_series || []}
              onChange={(values) =>
                setForm((p) => ({
                  ...p,
                  preferences: { ...p.preferences, favorite_series: values },
                }))
              }
            />
            <FavoritePicker
              title="Lugares especiais"
              placeholder="Ex.: MASP, Livraria da Travessa"
              values={form.preferences?.favorite_places || []}
              onChange={(values) =>
                setForm((p) => ({
                  ...p,
                  preferences: { ...p.preferences, favorite_places: values },
                }))
              }
            />
            <FavoritePicker
              title="Wishlist"
              placeholder="Ex.: Theatro Municipal"
              values={form.preferences?.wishlist || []}
              onChange={(values) =>
                setForm((p) => ({
                  ...p,
                  preferences: { ...p.preferences, wishlist: values },
                }))
              }
            />
            <ChipGroup
              title="Passeios românticos"
              options={ROMANTIC_WALKS}
              values={form.preferences?.romantic_walk_types || []}
              onToggle={(value) =>
                setForm((p) => ({
                  ...p,
                  preferences: {
                    ...p.preferences,
                    romantic_walk_types: toggleArray(p.preferences?.romantic_walk_types || [], value),
                  },
                }))
              }
            />
            <ChipGroup
              title="Atividades"
              options={ACTIVITIES}
              values={form.preferences?.preferred_activities || []}
              onToggle={(value) =>
                setForm((p) => ({
                  ...p,
                  preferences: {
                    ...p.preferences,
                    preferred_activities: toggleArray(p.preferences?.preferred_activities || [], value),
                  },
                }))
              }
            />
          </div>
        );
      default:
        return (
          <div className="space-y-4 text-sm text-white/75">
            <p className="text-2xl font-semibold text-white">Perfil {completeness.percent}% completo</p>
            <p>Com essas respostas o app passa a cruzar clima, distância, culinária, favoritos e histórico de cliques.</p>
            <ul className="space-y-2">
              <li>Restaurantes: {(form.preferences?.favorite_restaurants || []).length} favoritos</li>
              <li>Culinárias: {(form.preferences?.preferred_cuisines || []).join(", ") || "—"}</li>
              <li>Filmes/séries: {(form.preferences?.favorite_movies || []).length + (form.preferences?.favorite_series || []).length} referências</li>
              <li>Wishlist: {(form.preferences?.wishlist || []).length} lugares</li>
            </ul>
          </div>
        );
    }
  };

  const titles = [
    { title: "Onde vocês circulam", subtitle: "Cidade, bairro e logística para sugerir perto de vocês." },
    { title: "Ritmo do casal", subtitle: "Objetivo, vibe e orçamento da noite." },
    { title: "Limites reais", subtitle: "Lotação, barulho e restrições que precisam ser respeitadas." },
    { title: "Pessoa 1 e Pessoa 2", subtitle: "Gêneros e preferências individuais." },
    { title: "Repertório do casal", subtitle: "Favoritos e wishlist viram atalho nas recomendações." },
    { title: "Revisão", subtitle: "Confira o resumo antes de ativar o feed personalizado." },
  ];

  const current = titles[step];

  return (
    <main className="mx-auto max-w-4xl">
      <StepShell
        step={step}
        totalSteps={TOTAL_STEPS}
        title={current.title}
        subtitle={current.subtitle}
        onBack={step > 0 ? () => setStep((s) => s - 1) : undefined}
        onSkip={() => persist(step < TOTAL_STEPS - 1 ? step + 1 : undefined, step === TOTAL_STEPS - 1)}
        onNext={() => {
          if (step < TOTAL_STEPS - 1) void persist(step + 1);
          else void persist(undefined, true);
        }}
        isLast={step === TOTAL_STEPS - 1}
      >
        {renderStep()}
      </StepShell>
    </main>
  );
}
