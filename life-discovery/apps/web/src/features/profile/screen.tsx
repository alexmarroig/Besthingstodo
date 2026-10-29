"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ChipGroup } from "@/components/profile/chip-group";
import { FavoritePicker } from "@/components/profile/favorite-picker";
import {
  ACTIVITIES,
  CUISINES,
  MOVIE_GENRES,
  MUSIC_GENRES,
  ROMANTIC_WALKS,
  SERIES_GENRES,
  toggleArray,
} from "@/components/profile/profile-constants";
import { fetchCoupleMe, fetchCulturalDNA, patchCoupleProfile } from "@/shared/api/client";
import { getProfileCompleteness } from "@/shared/profile-completeness";
import { getUserId } from "@/shared/storage";
import { CoupleSnapshot } from "@life/shared-types";

const TABS = [
  { id: "contexto", label: "Contexto" },
  { id: "pessoa1", label: "Pessoa 1" },
  { id: "pessoa2", label: "Pessoa 2" },
  { id: "casal", label: "Casal" },
  { id: "repertorio", label: "Repertório" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function defaultForm(): CoupleSnapshot {
  return {
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
      favorite_restaurants: [],
      favorite_places: [],
      favorite_movies: [],
      favorite_series: [],
      wishlist: [],
    },
  };
}

function MemberPanel({
  idx,
  form,
  setForm,
}: {
  idx: number;
  form: CoupleSnapshot;
  setForm: React.Dispatch<React.SetStateAction<CoupleSnapshot>>;
}) {
  const member = form.members[idx];
  return (
    <div className="space-y-4">
      <input
        value={member.full_name}
        onChange={(e) =>
          setForm((prev) => {
            const members = [...prev.members];
            members[idx] = { ...members[idx], full_name: e.target.value };
            return { ...prev, members };
          })
        }
        className="w-full rounded-[1rem] border border-white/8 bg-white/6 px-4 py-3 text-white"
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() =>
            setForm((prev) => {
              const members = [...prev.members];
              members[idx] = { ...members[idx], drinks_alcohol: !members[idx].drinks_alcohol };
              return { ...prev, members };
            })
          }
          className="rounded-full border border-white/12 px-3 py-1.5 text-xs text-white/70"
        >
          {member.drinks_alcohol ? "bebe álcool" : "não bebe"}
        </button>
        <button
          type="button"
          onClick={() =>
            setForm((prev) => {
              const members = [...prev.members];
              members[idx] = { ...members[idx], likes_party: !members[idx].likes_party };
              return { ...prev, members };
            })
          }
          className="rounded-full border border-white/12 px-3 py-1.5 text-xs text-white/70"
        >
          {member.likes_party ? "gosta de balada" : "evita balada"}
        </button>
        <button
          type="button"
          onClick={() =>
            setForm((prev) => {
              const members = [...prev.members];
              members[idx] = { ...members[idx], prefers_theater: !members[idx].prefers_theater };
              return { ...prev, members };
            })
          }
          className="rounded-full border border-white/12 px-3 py-1.5 text-xs text-white/70"
        >
          {member.prefers_theater ? "gosta de teatro" : "teatro: neutro"}
        </button>
      </div>
      <ChipGroup
        title="gêneros de filme"
        options={MOVIE_GENRES}
        values={member.movie_genres || []}
        onToggle={(value) =>
          setForm((prev) => {
            const members = [...prev.members];
            members[idx] = { ...members[idx], movie_genres: toggleArray(members[idx].movie_genres || [], value) };
            return { ...prev, members };
          })
        }
      />
      <ChipGroup
        title="gêneros de série"
        options={SERIES_GENRES}
        values={member.series_genres || []}
        onToggle={(value) =>
          setForm((prev) => {
            const members = [...prev.members];
            members[idx] = { ...members[idx], series_genres: toggleArray(members[idx].series_genres || [], value) };
            return { ...prev, members };
          })
        }
      />
      <ChipGroup
        title="música"
        options={MUSIC_GENRES}
        values={member.music_genres || []}
        onToggle={(value) =>
          setForm((prev) => {
            const members = [...prev.members];
            members[idx] = { ...members[idx], music_genres: toggleArray(members[idx].music_genres || [], value) };
            return { ...prev, members };
          })
        }
      />
      <FavoritePicker
        title="alergias e intolerâncias"
        placeholder="Ex.: lactose"
        values={[...(member.allergies || []), ...(member.intolerances || [])]}
        onChange={(values) =>
          setForm((prev) => {
            const members = [...prev.members];
            members[idx] = { ...members[idx], allergies: values, intolerances: [] };
            return { ...prev, members };
          })
        }
      />
      <FavoritePicker
        title="não come / evita"
        placeholder="Ex.: frutos do mar"
        values={member.food_dislikes || []}
        onChange={(values) =>
          setForm((prev) => {
            const members = [...prev.members];
            members[idx] = { ...members[idx], food_dislikes: values };
            return { ...prev, members };
          })
        }
      />
    </div>
  );
}

function ProfileScreenInner() {
  const userId = getUserId();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const tabParam = (searchParams.get("tab") as TabId) || "contexto";
  const [tab, setTab] = useState<TabId>(TABS.some((t) => t.id === tabParam) ? tabParam : "contexto");

  const { data: couple, refetch } = useQuery({ queryKey: ["couple-me"], queryFn: fetchCoupleMe });
  const { data: dna } = useQuery({ queryKey: ["dna", userId], queryFn: () => fetchCulturalDNA(userId) });
  const [form, setForm] = useState<CoupleSnapshot>(defaultForm());

  useEffect(() => {
    if (!couple) return;
    setForm((prev) => ({
      ...prev,
      ...couple,
      members: [couple.members?.[0] || prev.members[0], couple.members?.[1] || prev.members[1]],
      preferences: { ...prev.preferences, ...(couple.preferences || {}) },
    }));
  }, [couple]);

  const completeness = useMemo(() => getProfileCompleteness(form), [form]);

  const mutation = useMutation({
    mutationFn: () =>
      patchCoupleProfile({
        ...form,
        max_drive_minutes: Number(form.max_drive_minutes || 40),
        search_radius_km: Number(form.search_radius_km || 10),
      }),
    onSuccess: () => {
      refetch();
      queryClient.invalidateQueries({ queryKey: ["home-recos"] });
      queryClient.invalidateQueries({ queryKey: ["recommendation-sources"] });
      queryClient.invalidateQueries({ queryKey: ["dna"] });
    },
  });

  return (
    <section className="space-y-5">
      <div className="glass rounded-[2.2rem] p-6">
        <p className="text-[11px] uppercase tracking-[0.32em] text-[#f4d06f]">Ajustes do casal</p>
        <h2 className="mt-2 text-4xl font-semibold">Perfil do casal</h2>
        <p className="mt-3 max-w-3xl text-sm text-white/68">
          Perfil {completeness.percent}% completo — quanto mais vocês contam, mais certeiras ficam as sugestões.
        </p>
        <div className="mt-4 h-1.5 max-w-md overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-[#f97352]" style={{ width: `${completeness.percent}%` }} />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              tab === item.id
                ? "bg-[#f97352] text-white"
                : "border border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="editorial-card rounded-[2rem] p-5">
          {tab === "contexto" && (
            <div className="space-y-4">
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
                  <span>Bairro</span>
                  <input
                    value={form.neighborhood ?? ""}
                    onChange={(e) => setForm((p) => ({ ...p, neighborhood: e.target.value }))}
                    className="w-full rounded-[1rem] border border-white/8 bg-white/6 px-4 py-3 text-white"
                  />
                </label>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, transport: p.transport === "car" ? "ride" : "car" }))}
                  className="rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm"
                >
                  Transporte: {form.transport}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setForm((p) => ({
                      ...p,
                      preferences: {
                        ...p.preferences,
                        budget_range:
                          p.preferences?.budget_range === "low"
                            ? "medium"
                            : p.preferences?.budget_range === "medium"
                              ? "high"
                              : "low",
                      },
                    }))
                  }
                  className="rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm"
                >
                  Orçamento: {form.preferences?.budget_range}
                </button>
              </div>
            </div>
          )}
          {tab === "pessoa1" && <MemberPanel idx={0} form={form} setForm={setForm} />}
          {tab === "pessoa2" && <MemberPanel idx={1} form={form} setForm={setForm} />}
          {tab === "casal" && (
            <div className="space-y-4">
              <ChipGroup
                title="culinárias preferidas"
                options={CUISINES}
                values={form.preferences?.preferred_cuisines || []}
                onToggle={(v) =>
                  setForm((p) => ({
                    ...p,
                    preferences: {
                      ...p.preferences,
                      preferred_cuisines: toggleArray(p.preferences?.preferred_cuisines || [], v),
                    },
                  }))
                }
              />
              <ChipGroup
                title="culinárias a evitar"
                options={CUISINES}
                values={form.preferences?.avoided_cuisines || []}
                onToggle={(v) =>
                  setForm((p) => ({
                    ...p,
                    preferences: {
                      ...p.preferences,
                      avoided_cuisines: toggleArray(p.preferences?.avoided_cuisines || [], v),
                    },
                  }))
                }
              />
              <ChipGroup
                title="atividades"
                options={ACTIVITIES}
                values={form.preferences?.preferred_activities || []}
                onToggle={(v) =>
                  setForm((p) => ({
                    ...p,
                    preferences: {
                      ...p.preferences,
                      preferred_activities: toggleArray(p.preferences?.preferred_activities || [], v),
                    },
                  }))
                }
              />
              <ChipGroup
                title="passeios românticos"
                options={ROMANTIC_WALKS}
                values={form.preferences?.romantic_walk_types || []}
                onToggle={(v) =>
                  setForm((p) => ({
                    ...p,
                    preferences: {
                      ...p.preferences,
                      romantic_walk_types: toggleArray(p.preferences?.romantic_walk_types || [], v),
                    },
                  }))
                }
              />
            </div>
          )}
          {tab === "repertorio" && (
            <div className="space-y-4">
              <FavoritePicker
                title="restaurantes favoritos"
                placeholder="Nome do restaurante"
                values={form.preferences?.favorite_restaurants || []}
                onChange={(values) =>
                  setForm((p) => ({
                    ...p,
                    preferences: { ...p.preferences, favorite_restaurants: values },
                  }))
                }
              />
              <FavoritePicker
                title="filmes marcantes"
                placeholder="Título do filme"
                values={form.preferences?.favorite_movies || []}
                onChange={(values) =>
                  setForm((p) => ({
                    ...p,
                    preferences: { ...p.preferences, favorite_movies: values },
                  }))
                }
              />
              <FavoritePicker
                title="séries favoritas"
                placeholder="Título da série"
                values={form.preferences?.favorite_series || []}
                onChange={(values) =>
                  setForm((p) => ({
                    ...p,
                    preferences: { ...p.preferences, favorite_series: values },
                  }))
                }
              />
              <FavoritePicker
                title="lugares especiais"
                placeholder="MASP, livraria..."
                values={form.preferences?.favorite_places || []}
                onChange={(values) =>
                  setForm((p) => ({
                    ...p,
                    preferences: { ...p.preferences, favorite_places: values },
                  }))
                }
              />
              <FavoritePicker
                title="wishlist"
                placeholder="Lugar que querem conhecer"
                values={form.preferences?.wishlist || []}
                onChange={(values) =>
                  setForm((p) => ({
                    ...p,
                    preferences: { ...p.preferences, wishlist: values },
                  }))
                }
              />
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              onClick={() => mutation.mutate()}
              className="rounded-full bg-[#f97352] px-5 py-3 text-sm font-medium text-white"
            >
              Salvar ajustes
            </button>
            <Link href="/onboarding" className="text-sm text-white/58 hover:text-white/82">
              Refazer onboarding guiado
            </Link>
          </div>
          {mutation.isSuccess ? <p className="mt-2 text-sm text-[#f4d06f]">Salvo — recomendações atualizadas.</p> : null}
        </div>

        <div className="space-y-4">
          <div className="editorial-card rounded-[2rem] p-5">
            <p className="text-[11px] uppercase tracking-[0.28em] text-[#f4d06f]">Próximo passo</p>
            {completeness.nextGap ? (
              <>
                <p className="mt-2 text-lg font-medium text-white">{completeness.nextGap.label}</p>
                <p className="mt-1 text-sm text-white/60">{completeness.nextGap.why}</p>
              </>
            ) : (
              <p className="mt-2 text-sm text-white/70">Perfil bem completo. O feed já usa tudo isso.</p>
            )}
          </div>
          <div className="editorial-card rounded-[2rem] p-5">
            <p className="text-[11px] uppercase tracking-[0.28em] text-[#f4d06f]">DNA cultural</p>
            <div className="mt-4 grid gap-3">
              {dna?.cultural_dna
                ? Object.entries(dna.cultural_dna).map(([key, value]) => (
                    <div key={key} className="rounded-xl border border-white/10 bg-white/5 p-3">
                      <p className="text-[10px] uppercase tracking-wide text-white/45">{key.replaceAll("_", " ")}</p>
                      <p className="mt-1 text-sm text-white">{Array.isArray(value) ? value.join(", ") : String(value)}</p>
                    </div>
                  ))
                : (
                  <p className="text-sm text-white/62">Complete o perfil para enriquecer o DNA cultural.</p>
                )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function ProfileScreen() {
  return (
    <Suspense fallback={<div className="text-sm text-white/60">Carregando perfil...</div>}>
      <ProfileScreenInner />
    </Suspense>
  );
}
