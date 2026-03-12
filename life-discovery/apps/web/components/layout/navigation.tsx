"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/home", label: "Hoje" },
  { href: "/map", label: "Mapa" },
  { href: "/agenda", label: "Agenda" },
  { href: "/saved", label: "Salvos" },
  { href: "/profile", label: "Perfil" }
];

const quickActions = [
  { href: "/date-night", label: "Date Night" },
  { href: "/concierge", label: "Concierge AI" },
  { href: "/onboarding", label: "Setup" }
];

function navClass(active: boolean) {
  return active
    ? "rounded-full bg-primary px-4 py-2 text-sm text-white shadow-glow"
    : "rounded-full bg-white/5 px-4 py-2 text-sm text-white/80 transition hover:bg-white/10 hover:text-white";
}

export function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#08111ddd]/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-[#ffd166]">Life Discovery</p>
          <h1 className="text-xl font-semibold">Planejador de experiências para casal</h1>
        </div>

        <div className="hidden flex-wrap items-center gap-2 md:flex">
          {tabs.map((tab) => (
            <Link key={tab.href} href={tab.href} className={navClass(pathname === tab.href)}>
              {tab.label}
            </Link>
          ))}
          {quickActions.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className={pathname === tab.href ? navClass(true) : "rounded-full border border-white/10 px-4 py-2 text-sm text-white/85 hover:bg-white/5"}
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </div>
    </header>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  const mobileTabs = [...tabs, { href: "/concierge", label: "AI" }];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-[#08111df2] p-2 backdrop-blur-xl md:hidden">
      <div className="mx-auto grid max-w-md grid-cols-6 gap-1">
        {mobileTabs.map((tab) => {
          const active = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`rounded-2xl px-2 py-2 text-center text-[11px] ${active ? "bg-primary text-white" : "bg-white/5 text-white/80"}`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
