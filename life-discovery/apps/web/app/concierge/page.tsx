"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";

import ConciergeBubble from "../../components/concierge/chat-bubble";
import { askConcierge } from "../../lib/api";
import { getUserId } from "../../lib/storage";

export default function ConciergePage() {
  const userId = getUserId();
  const [message, setMessage] = useState("O que vale fazer hoje à noite em São Paulo?");
  const [history, setHistory] = useState<{ role: "user" | "assistant"; text: string }[]>([]);

  const mutation = useMutation({
    mutationFn: (msg: string) => askConcierge(userId, msg),
    onSuccess: (data, msg) => {
      const suggestions = (data.suggestions || [])
        .map((s: any) => `${s.title} — ${s.reason}`)
        .join("\n");
      setHistory((prev) => [...prev, { role: "user", text: msg }, { role: "assistant", text: suggestions || "Sem sugestões por enquanto." }]);
    }
  });

  return (
    <section className="space-y-4">
      <div className="glass rounded-[2rem] p-6">
        <h2 className="text-3xl font-semibold">Concierge AI</h2>
        <p className="mt-2 max-w-2xl text-sm text-white/68">
          Faça perguntas em linguagem natural como orçamento, clima, bairro ou tipo de rolê que o casal quer hoje.
        </p>
      </div>

      <div className="glass flex min-h-[360px] flex-col gap-3 rounded-[2rem] p-4">
        {history.length === 0 ? <ConciergeBubble role="assistant" text="Exemplo: quero algo romântico, sem gastar muito e protegido da chuva." /> : null}
        {history.map((m, i) => (
          <ConciergeBubble key={i} role={m.role} text={m.text} />
        ))}
      </div>

      <div className="flex gap-2">
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="flex-1 rounded-2xl bg-white/10 p-3 text-sm"
          placeholder="Pergunte o que vocês querem fazer"
        />
        <button onClick={() => mutation.mutate(message)} className="rounded-2xl bg-[#ffd166] px-4 py-2 text-sm font-medium text-black">
          Enviar
        </button>
      </div>
    </section>
  );
}
