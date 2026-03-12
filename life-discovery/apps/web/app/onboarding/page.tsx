"use client";

import { useMemo, useState } from "react";

import { fetchCoupleMe, login, patchCoupleStep, registerCoupleDefault } from "../../lib/api";

const defaultSections = ["location", "lifestyle", "interests", "dining", "health", "travel"];

export default function OnboardingPage() {
  const [email, setEmail] = useState("alex.c.marroig@gmail.com");
  const [password, setPassword] = useState("alexcamila123");
  const [status, setStatus] = useState("Use essa área para criar a conta do casal e revisar os blocos do perfil.");
  const [step, setStep] = useState("location");
  const [jsonText, setJsonText] = useState("{}");

  const header = useMemo(() => `Etapa atual: ${step}`, [step]);

  async function doRegister() {
    try {
      setStatus("Criando conta do casal...");
      await registerCoupleDefault(email, password);
      const me = await fetchCoupleMe();
      setJsonText(JSON.stringify(me?.profile?.couple_profile_json?.[step] || {}, null, 2));
      setStatus("Conta criada e dados base carregados.");
    } catch (err: any) {
      setStatus(err?.message || "Falha ao criar conta");
    }
  }

  async function doLogin() {
    try {
      setStatus("Entrando...");
      await login(email, password);
      const me = await fetchCoupleMe();
      setJsonText(JSON.stringify(me?.profile?.couple_profile_json?.[step] || {}, null, 2));
      setStatus("Login realizado.");
    } catch (err: any) {
      setStatus(err?.message || "Falha no login");
    }
  }

  async function loadStep(nextStep: string) {
    setStep(nextStep);
    const me = await fetchCoupleMe();
    setJsonText(JSON.stringify(me?.profile?.couple_profile_json?.[nextStep] || {}, null, 2));
  }

  async function saveStep() {
    try {
      const parsed = JSON.parse(jsonText || "{}");
      await patchCoupleStep(step, parsed);
      setStatus(`Etapa ${step} salva.`);
    } catch {
      setStatus("JSON inválido ou erro ao salvar a etapa.");
    }
  }

  return (
    <main className="space-y-4">
      <div className="glass rounded-[2rem] p-6">
        <h1 className="text-3xl font-semibold">Onboarding do casal</h1>
        <p className="mt-2 max-w-2xl text-sm text-white/68">Crie a conta compartilhada e ajuste os blocos de perfil que alimentam a recomendação.</p>
      </div>

      <div className="glass space-y-3 rounded-[1.75rem] p-4">
        <input className="w-full rounded-xl bg-white/10 p-3 text-sm" placeholder="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="w-full rounded-xl bg-white/10 p-3 text-sm" type="password" placeholder="senha" value={password} onChange={(e) => setPassword(e.target.value)} />
        <div className="flex flex-wrap gap-2">
          <button onClick={doRegister} className="rounded-xl bg-[#ff7a59] px-4 py-2 text-sm text-white">Registrar casal</button>
          <button onClick={doLogin} className="rounded-xl bg-[#ffd166] px-4 py-2 text-sm text-black">Login</button>
        </div>
      </div>

      <div className="glass space-y-3 rounded-[1.75rem] p-4">
        <p className="text-sm font-medium">{header}</p>
        <div className="flex flex-wrap gap-2">
          {defaultSections.map((s) => (
            <button key={s} onClick={() => loadStep(s)} className="rounded-full bg-white/10 px-3 py-2 text-xs capitalize">
              {s}
            </button>
          ))}
        </div>

        <textarea value={jsonText} onChange={(e) => setJsonText(e.target.value)} rows={16} className="w-full rounded-xl bg-black/30 p-3 font-mono text-xs" />
        <button onClick={saveStep} className="w-fit rounded-xl bg-[#ff7a59] px-4 py-2 text-sm text-white">Salvar etapa</button>
      </div>

      <p className="text-sm text-white/70">{status}</p>
    </main>
  );
}
