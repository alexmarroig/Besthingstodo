"use client";

import Link from "next/link";

const actions = [
  { href: "/date-night", label: "Noite a Dois", emoji: "✨", hint: "Roteiro pronto" },
  { href: "/food", label: "Comer", emoji: "🍽️", hint: "Restaurantes" },
  { href: "/map", label: "Explorar", emoji: "📍", hint: "Por bairro" },
  { href: "/watch", label: "Assistir", emoji: "🎬", hint: "Filmes & séries" },
] as const;

export default function QuickActions() {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
      {actions.map((action) => (
        <Link
          key={action.href}
          href={action.href}
          className="group surface flex items-center gap-3 px-3.5 py-3 transition active:scale-[0.98] sm:flex-col sm:items-start sm:gap-2 sm:px-4 sm:py-4"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/[0.06] text-lg transition group-hover:bg-[#ff7a59]/15">
            {action.emoji}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white">{action.label}</p>
            <p className="text-[11px] text-white/45">{action.hint}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
