"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Clapperboard, MapPinned, Sparkles, UtensilsCrossed } from "lucide-react";

import IconBadge from "@/components/icons/icon-badge";

const actions: Array<{
  href: string;
  label: string;
  hint: string;
  icon: LucideIcon;
  variant: "coral" | "gold" | "neutral";
}> = [
  { href: "/date-night", label: "Noite a Dois", hint: "Roteiro pronto", icon: Sparkles, variant: "gold" },
  { href: "/food", label: "Comer", hint: "Restaurantes", icon: UtensilsCrossed, variant: "coral" },
  { href: "/map", label: "Explorar", hint: "Por bairro", icon: MapPinned, variant: "neutral" },
  { href: "/watch", label: "Assistir", hint: "Filmes & séries", icon: Clapperboard, variant: "neutral" },
];

export default function QuickActions() {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
      {actions.map((action) => (
        <Link
          key={action.href}
          href={action.href}
          className="group surface flex items-center gap-3 px-3.5 py-3 transition active:scale-[0.98] sm:flex-col sm:items-start sm:gap-2.5 sm:px-4 sm:py-4"
        >
          <IconBadge icon={action.icon} variant={action.variant} />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white">{action.label}</p>
            <p className="text-[11px] leading-relaxed text-white/55">{action.hint}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
