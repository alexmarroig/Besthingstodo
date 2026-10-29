"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  Bookmark,
  BrainCircuit,
  Clapperboard,
  Heart,
  Home,
  LayoutList,
  Map,
  UserCheck,
  UtensilsCrossed,
} from "lucide-react";

import BrandMark from "../branding/brand-mark";
import { BRAND } from "@/shared/brand";

function NavIcon({ icon: Icon, active }: { icon: LucideIcon; active: boolean }) {
  return (
    <Icon
      aria-hidden
      strokeWidth={active ? 2.25 : 2}
      className={`h-[18px] w-[18px] transition duration-300 ${active ? "text-white" : "text-white/48"}`}
    />
  );
}

const tabs: Array<{ href: string; label: string; icon: LucideIcon }> = [
  { href: "/home", label: "Hoje", icon: Home },
  { href: "/watch", label: "Assistir", icon: Clapperboard },
  { href: "/food", label: "Comida", icon: UtensilsCrossed },
  { href: "/date-night", label: "Date", icon: Heart },
  { href: "/map", label: "Mapa", icon: Map },
  { href: "/saved", label: "Salvos", icon: Bookmark },
  { href: "/concierge", label: "Listas", icon: LayoutList },
];

function isTabActive(pathname: string | null, href: string) {
  if (!pathname) return false;
  if (href === "/home" && (pathname === "/" || pathname === "/home")) return true;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 glass-nav">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 md:px-6 md:py-3.5">
        <Link href="/home" className="group flex min-w-0 items-center gap-3">
          <BrandMark size="sm" />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="truncate text-[10px] font-semibold uppercase tracking-[0.22em] text-[#f4d06f]/90">
                {BRAND.eyebrow}
              </p>
              <span className="hidden items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[9px] font-semibold text-emerald-300 sm:inline-flex">
                <BrainCircuit className="h-2.5 w-2.5" />
                ML Ativo
              </span>
            </div>
            <h1 className="truncate font-display text-lg font-semibold tracking-tight text-white md:text-xl">
              {BRAND.name}
            </h1>
          </div>
        </Link>

        <div className="hidden flex-wrap items-center gap-1 lg:flex">
          {tabs.map((tab) => {
            const active = isTabActive(pathname, tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={
                  active
                    ? "inline-flex items-center gap-2 rounded-full bg-white/[0.1] px-3.5 py-2 text-sm font-medium text-white ring-1 ring-[#ff7a59]/35"
                    : "inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-sm text-white/55 transition hover:bg-white/[0.06] hover:text-white/90"
                }
              >
                <NavIcon icon={tab.icon} active={active} />
                <span>{tab.label}</span>
              </Link>
            );
          })}
        </div>

        <Link
          href="/profile"
          className={`btn-ghost shrink-0 gap-1.5 px-3.5 py-2 text-xs sm:text-sm ${
            pathname === "/profile" ? "border-[#ff7a59]/40 bg-white/10 text-white" : ""
          }`}
        >
          <UserCheck className="h-4 w-4 text-[#f4d06f]" />
          <span>Perfil</span>
        </Link>
      </div>
    </header>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  const mobileTabs = tabs.slice(0, 6);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 px-3 pb-3 pt-2 lg:hidden" aria-label="Navegação principal">
      <div className="glass mx-auto flex max-w-lg items-stretch justify-around rounded-[1.75rem] px-1 py-1.5 shadow-float">
        {mobileTabs.map((tab) => {
          const active = isTabActive(pathname, tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-[1.25rem] px-1 py-2 text-[10px] font-medium transition ${
                active
                  ? "bg-gradient-to-b from-[#ff7a59]/25 to-[#ff7a59]/10 text-white"
                  : "text-white/48 active:scale-95"
              }`}
            >
              <NavIcon icon={tab.icon} active={active} />
              <span className="truncate">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
