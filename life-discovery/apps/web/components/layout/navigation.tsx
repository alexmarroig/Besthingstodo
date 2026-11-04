"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bookmark, Compass, CalendarDays, Map, UserRound, Search } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import BrandMark from "../branding/brand-mark";
import { BRAND } from "@/shared/brand";

const tabs: Array<{ href: string; label: string; icon: LucideIcon }> = [
  { href: "/home", label: "Descobrir", icon: Compass },
  { href: "/map", label: "Explorar", icon: Map },
  { href: "/concierge", label: "Planejar", icon: CalendarDays },
  { href: "/saved", label: "Salvos", icon: Bookmark },
];

function activeTab(path: string | null, href: string) {
  if (!path) return false;
  if (href === "/home") return path === "/" || path === "/home";
  return path === href || path.startsWith(href + "/");
}

export function Navbar() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.07] bg-[#090e14]/95 backdrop-blur-xl">
      <div className="mx-auto flex h-[74px] max-w-6xl items-center justify-between gap-5 px-4 md:px-6">
        <Link href="/home" className="flex shrink-0 items-center gap-2.5 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#dec38c]" aria-label="BestThingsToDo, início">
          <BrandMark size="sm" />
          <span className="font-display text-[17px] font-semibold tracking-[-0.055em] text-[#f3f0e9] sm:text-[19px]">{BRAND.name}</span>
        </Link>
        <nav aria-label="Navegação principal" className="hidden items-center gap-1 lg:flex">
          {tabs.map((tab) => {
            const active = activeTab(pathname, tab.href);
            return (
              <Link key={tab.href} href={tab.href} aria-current={active ? "page" : undefined}
                className={`relative rounded-md px-4 py-3 text-[13px] font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#dec38c] ${active ? "text-[#f4efdf]" : "text-white/55 hover:text-white/90"}`}>
                {tab.label}
                {active ? <span className="absolute bottom-1 left-4 right-4 h-px bg-[#dfbd7d]" aria-hidden="true" /> : null}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-1 sm:gap-2">
          <Link href="/home#explorar" aria-label="Buscar experiências" className="hidden h-10 w-10 items-center justify-center rounded-lg text-white/60 transition-colors hover:bg-white/[0.06] hover:text-white sm:flex">
            <Search className="h-[18px] w-[18px]" strokeWidth={1.6} />
          </Link>
          <Link href="/profile" aria-label="Minha conta" aria-current={pathname === "/profile" ? "page" : undefined}
            className={`flex h-10 items-center gap-2 rounded-lg border px-3 text-[13px] transition-colors ${pathname === "/profile" ? "border-[#dfbd7d]/40 text-white" : "border-white/10 text-white/65 hover:border-white/25 hover:text-white"}`}>
            <UserRound className="h-4 w-4" strokeWidth={1.65}/><span className="hidden sm:inline">Conta</span>
          </Link>
        </div>
      </div>
    </header>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Navegação principal" className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#0a0f15]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
      <div className="mx-auto grid h-[62px] max-w-lg grid-cols-4">
        {tabs.map((tab) => {
          const active = activeTab(pathname, tab.href);
          const Icon = tab.icon;
          return (
            <Link key={tab.href} href={tab.href} aria-current={active ? "page" : undefined}
              className={`flex min-w-0 flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#dfbd7d] ${active ? "text-[#e8c98d]" : "text-white/48 hover:text-white/80"}`}>
              <Icon className="h-[19px] w-[19px]" strokeWidth={active ? 1.9 : 1.55}/>
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
