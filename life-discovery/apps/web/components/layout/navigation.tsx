"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { BRAND } from "@/shared/brand";

function Icon({ path, active }: { path: string; active: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={`h-[18px] w-[18px] transition duration-300 ${active ? "text-white" : "text-white/50"}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={path} />
    </svg>
  );
}

const tabs = [
  { href: "/home", label: "Hoje", icon: "M3 12L12 4l9 8M5 10v10h14V10" },
  { href: "/watch", label: "Assistir", icon: "M4 7h16v10H4zM8 7l1-3h6l1 3" },
  { href: "/food", label: "Comida", icon: "M3 3v18M7 3v8a4 4 0 0 0 8 0V3M21 3v7c0 2-2 4-4 4h-1v7" },
  { href: "/map", label: "Mapa", icon: "M9 18l-5 2V6l5-2 6 2 5-2v14l-5 2-6-2zM9 4v14M15 6v14" },
  { href: "/saved", label: "Salvos", icon: "M6 4h12v16l-6-4-6 4z" },
  { href: "/date-night", label: "Date", icon: "M12 20s-7-4.35-7-10a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 5.65-7 10-7 10z" },
  { href: "/concierge", label: "Listas", icon: "M4 6h16M4 12h16M4 18h10" },
] as const;

export function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 glass-nav">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 md:px-6 md:py-4">
        <Link href="/home" className="group flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#ff7a59]/30 to-[#f4d06f]/10 text-sm font-bold tracking-wider text-[#fff2cf] ring-1 ring-white/10 transition group-hover:ring-[#ff7a59]/30">
            R2
          </div>
          <div className="min-w-0">
            <p className="truncate text-[10px] font-medium uppercase tracking-[0.28em] text-[#f4d06f]/90">{BRAND.eyebrow}</p>
            <h1 className="truncate font-display text-lg font-semibold text-white md:text-xl">{BRAND.name}</h1>
          </div>
        </Link>

        <div className="hidden flex-wrap items-center gap-1.5 lg:flex">
          {tabs.map((tab) => {
            const active = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={
                  active
                    ? "inline-flex items-center gap-2 rounded-full bg-white/[0.1] px-3.5 py-2 text-sm font-medium text-white ring-1 ring-[#ff7a59]/30"
                    : "inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-sm text-white/55 transition hover:bg-white/[0.06] hover:text-white/90"
                }
              >
                <Icon path={tab.icon} active={active} />
                <span>{tab.label}</span>
              </Link>
            );
          })}
        </div>

        <Link href="/profile" className="btn-ghost hidden shrink-0 sm:inline-flex">
          Perfil
        </Link>
      </div>
    </header>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  const mobileTabs = tabs.slice(0, 5);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 px-4 pb-4 pt-2 md:hidden" aria-label="Navegação principal">
      <div className="glass mx-auto flex max-w-md items-stretch justify-around rounded-[1.75rem] px-1 py-1.5 shadow-float">
        {mobileTabs.map((tab) => {
          const active = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-[1.25rem] px-1 py-2 text-[10px] font-medium transition ${
                active
                  ? "bg-gradient-to-b from-[#ff7a59]/25 to-[#ff7a59]/10 text-white"
                  : "text-white/45 active:scale-95"
              }`}
            >
              <Icon path={tab.icon} active={active} />
              <span className="truncate">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
