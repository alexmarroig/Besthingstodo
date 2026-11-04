"use client";

import Link from "next/link";
import { ArrowUpRight, Clapperboard, Heart, MapPinned, UtensilsCrossed } from "lucide-react";

const actions = [
  { href: "/food", label: "Comer e beber", note: "Restaurantes e cafeterias", icon: UtensilsCrossed },
  { href: "/watch", label: "Filmes e séries", note: "O que assistir", icon: Clapperboard },
  { href: "/date-night", label: "Passeios a dois", note: "Ideias para sair juntos", icon: Heart },
  { href: "/map", label: "Explorar o mapa", note: "Lugares por região", icon: MapPinned },
];

export default function QuickActions() {
  return (
    <nav aria-label="Explorar por interesse" className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
      {actions.map(({ href, label, note, icon: Icon }) => (
        <Link key={href} href={href}
          className="group flex min-h-[112px] flex-col justify-between rounded-[16px] border border-white/[0.07] bg-[#121920] p-4 transition-colors hover:border-[#d7bc88]/35 hover:bg-[#1b232a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#dfbd7d]">
          <div className="flex items-start justify-between">
            <Icon className="h-[19px] w-[19px] text-[#c7ad7c]" strokeWidth={1.45} aria-hidden="true" />
            <ArrowUpRight className="h-4 w-4 text-white/25 transition-colors group-hover:text-white/75" strokeWidth={1.5} aria-hidden="true" />
          </div>
          <div>
            <p className="text-[14px] font-medium tracking-tight text-[#f0ede7]">{label}</p>
            <p className="mt-1 text-[11px] text-white/45">{note}</p>
          </div>
        </Link>
      ))}
    </nav>
  );
}
