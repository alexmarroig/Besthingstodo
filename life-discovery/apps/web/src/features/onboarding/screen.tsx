"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";

import { fetchCoupleMe, login, patchCoupleProfile, registerCoupleDefault } from "@/shared/api/client";

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
  const [email, setEmail] = useState("alex.c.marroig@gmail.com");
  const [password, setPassword] = useState("alexcamila123");
  const [status, setStatus] = useState("Crie a conta compartilhada e ajuste só o essencial para a curadoria ficar mais pessoal.");
  const { data: couple, refetch } = useQuery({ queryKey: ["couple-me"], queryFn: fetchCoupleMe });
  const [form, setForm] = useState({
    city: "São Paulo",
    neighborhood: "Campo Belo",
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

  const saveMutation = useMutation({
    mutationFn: () =>
      patchCoupleProfile({
        city: form.city,
        neighborhood: form.neighborhood,
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
      setStatus("Preferências salvas. A home e o concierge já podem usar esse contexto.");
      refetch();
    },
    onError: () => {
      setStatus("Não consegui salvar agora. Vale confirmar se a conta está autenticada.");
    }
  });

  async function doRegister() {
    try {
      setStatus("Criando conta do casal...");
      await registerCoupleDefault(email, password);
      await refetch();
      setStatus("Conta criada. Agora vale revisar localização e gostos principais.");
    } catch (error: any) {
      setStatus(error?.message || "Falha ao criar a conta do casal.");
    }
  }

  async function doLogin() {
    try {
      setStatus("Entrando...");
      await login(email, password);
      await refetch();
      setStatus("Login realizado. Ajuste só o necessário e o app já começa a ficar mais pessoal.");
    } catch (error: any) {
      setStatus(error?.message || "Falha no login.");
    }
  }

  return (
    <main className="space-y-5">
      <div className="glass rounded-[2.2rem] p-6">
        <p className="text-[11px] uppercase tracking-[0.32em] text-[#f4d06f]">Onboarding guiado</p>
        <h1 className="mt-2 text-4xl font-semibold">Configurar o casal sem JSON</h1>
        <p className="mt-3 max-w-3xl text-sm text-white/68">
          Esta área substitui a edição crua por um setup curto: localização base, restrições e interesses que realmente mudam a curadoria.
        </p>
      </div>

      <div className="editorial-card rounded-[2rem] p-5">
        <div className="grid gap-3 md:grid-cols-[1.1fr_1.1fr_auto_auto] md:items-end">
          <label className="space-y-2 text-sm text-white/72">
            <span>Email</span>
            <input className="w-full rounded-[1rem] border border-white/8 bg-white/6 px-4 py-3 text-white" value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
          <label className="space-y-2 text-sm text-white/72">
            <span>Senha</span>
            <input className="w-full rounded-[1rem] border border-white/8 bg-white/6 px-4 py-3 text-white" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </label>
          <button onClick={doRegister} className="rounded-full bg-[#f97352] px-5 py-3 text-sm font-medium text-white">Registrar casal</button>
          <button onClick={doLogin} className="rounded-full bg-[#f4d06f] px-5 py-3 text-sm font-medium text-[#08111f]">Entrar</button>
        </div>
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
                Transporte: {form.transport}
              </button>
              <button onClick={() => setForm((prev) => ({ ...prev, avoid_going_out_when_rain: !prev.avoid_going_out_when_rain }))} className="rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm text-white/78">
                {form.avoid_going_out_when_rain ? "preferir cobertos" : "aceitar clima aberto"}
              </button>
            </div>
          </div>

          <div className="editorial-card rounded-[2rem] p-5">
            <p className="text-[11px] uppercase tracking-[0.28em] text-[#f4d06f]">Estado do setup</p>
            <p className="mt-3 text-sm text-white/70">{status}</p>
            <p className="mt-3 text-sm text-white/56">Conta atual: {couple?.account_name || "perfil local / fallback"}</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {[
            { key: "member_1", title: "Pessoa 1", name: form.member_1_name, interests: form.member_1_interests, dislikes: form.member_1_dislikes },
            { key: "member_2", title: "Pessoa 2", name: form.member_2_name, interests: form.member_2_interests, dislikes: form.member_2_dislikes }
          ].map((person) => (
            <div key={person.key} className="editorial-card rounded-[2rem] p-5">
              <p className="text-[11px] uppercase tracking-[0.28em] text-[#f4d06f]">{person.title}</p>
              <div className="mt-4 space-y-3">
                <input value={person.name} onChange={(event) => setForm((prev) => ({ ...prev, [`${person.key}_name`]: event.target.value }))} className="w-full rounded-[1rem] border border-white/8 bg-white/6 px-4 py-3 text-white" />
                <textarea value={person.interests} onChange={(event) => setForm((prev) => ({ ...prev, [`${person.key}_interests`]: event.target.value }))} rows={4} className="w-full rounded-[1rem] border border-white/8 bg-white/6 px-4 py-3 text-white" placeholder="Interesses separados por vírgula" />
                <textarea value={person.dislikes} onChange={(event) => setForm((prev) => ({ ...prev, [`${person.key}_dislikes`]: event.target.value }))} rows={4} className="w-full rounded-[1rem] border border-white/8 bg-white/6 px-4 py-3 text-white" placeholder="O que evitar separado por vírgula" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <button onClick={() => saveMutation.mutate()} className="rounded-full bg-[#f97352] px-5 py-3 text-sm font-medium text-white">Salvar onboarding</button>
    </main>
  );
}

