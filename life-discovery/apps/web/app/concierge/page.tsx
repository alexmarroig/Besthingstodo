"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";

import ConciergeBubble from "../../components/concierge/chat-bubble";
import { askConcierge } from "../../lib/api";
import { getUserId } from "../../lib/storage";

export default function ConciergePage() {
  const userId = getUserId();
  const [message, setMessage] = useState("What can we do tonight?");
  const [history, setHistory] = useState<{ role: "user" | "assistant"; text: string }[]>([]);

  const mutation = useMutation({
    mutationFn: (msg: string) => askConcierge(userId, msg),
    onSuccess: (data, msg) => {
      const suggestions = (data.suggestions || [])
        .map((s: any) => `${s.title} — ${s.reason}`)
        .join("\n");
      setHistory((prev) => [...prev, { role: "user", text: msg }, { role: "assistant", text: suggestions || "No suggestions." }]);
    }
  });

  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-semibold">AI Concierge</h2>
      <div className="glass flex min-h-[340px] flex-col gap-3 rounded-2xl p-4">
        {history.length === 0 ? <ConciergeBubble role="assistant" text="Ask me: What can we do tonight?" /> : null}
        {history.map((m, i) => (
          <ConciergeBubble key={i} role={m.role} text={m.text} />
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="flex-1 rounded-xl bg-white/10 p-3 text-sm"
          placeholder="What can we do tonight?"
        />
        <button onClick={() => mutation.mutate(message)} className="rounded-xl bg-accent px-4 py-2 text-sm text-black">
          Send
        </button>
      </div>
    </section>
  );
}

