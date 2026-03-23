"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { BRAND } from "@/shared/brand";

function Icon({ path, active }: { path: string; active: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={`h-4 w-4 transition duration-300 ${active ? "scale-110 text-white" : "text-white/58 group-hover:text-white/88"}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
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
  { href: "/map", label: "Bairros", icon: "M9 18l-5 2V6l5-2 6 2 5-2v14l-5 2-6-2zM9 4v14M15 6v14" },
  { href: "/agenda", label: "Agenda", icon: "M7 3v4M17 3v4M4 9h16M5 6h14a1 1 0 0 1 1 1v12H4V7a1 1 0 0 1 1-1z" },
  { href: "/saved", label: "Salvos", icon: "M6 4h12v16l-6-4-6 4z" },
  { href: "/date-night", label: "Noite a Dois", icon: "M12 20s-7-4.35-7-10a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 5.65-7 10-7 10z" },
  { href: "/concierge", label: "Guia IA", icon: "M12 3c4.97 0 9 3.58 9 8 0 2.13-.95 4.07-2.5 5.5V21l-4.1-2.2A11.2 11.2 0 0 1 12 19c-4.97 0-9-3.58-9-8s4.03-8 9-8z" }
] as const;

function navClass(active: boolean) {
  return active
    ? "group inline-flex items-center gap-2 rounded-full bg-[#f97352] px-4 py-2.5 text-sm text-white shadow-[0_18px_35px_rgba(249,115,82,0.24)]"
    : "group inline-flex items-center gap-2 rounded-full bg-white/5 px-4 py-2.5 text-sm text-white/78 transition duration-300 hover:-translate-y-[1px] hover:bg-white/10 hover:text-white";
}

export function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-white/8 bg-[#08101ae8] backdrop-blur-2xl">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-[1.4rem] border border-[#f4d06f]/20 bg-[radial-gradient(circle_at_top_left,rgba(249,115,82,0.35),transparent_45%),linear-gradient(180deg,rgba(249,115,82,0.14),rgba(7,17,29,0.96))] text-[#fff2cf] shadow-[0_20px_50px_rgba(249,115,82,0.12)]">
            <span className="text-sm font-semibold tracking-[0.22em]">R2</span>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.34em] text-[#f4d06f]">{BRAND.eyebrow}</p>
            <h1 className="mt-1 text-[1.55rem] font-semibold tracking-[-0.02em] text-white">{BRAND.name}</h1>
          </div>
        </div>

        <div className="hidden flex-wrap items-center gap-2 md:flex">
          {tabs.map((tab) => {
            const active = pathname === tab.href;
            return (
              <Link key={tab.href} href={tab.href} className={navClass(active)}>
                <Icon path={tab.icon} active={active} />
                <span>{tab.label}</span>
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          <Link href="/profile" className="group inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-white/58 transition hover:border-white/20 hover:text-white">
            <Icon path="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm-7 9a7 7 0 0 1 14 0" active={false} />
            <span>Ajustes do casal</span>
          </Link>
        </div>
      </div>
    </header>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  const mobileTabs = [tabs[0], tabs[1], tabs[2], tabs[4], tabs[5], tabs[6]];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-[#08111df2] p-2 backdrop-blur-xl md:hidden">
      <div className="mx-auto grid max-w-xl grid-cols-6 gap-2">
        {mobileTabs.map((tab) => {
          const active = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`group flex flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-center text-[11px] transition ${
                active ? "bg-[#f97352] text-white" : "bg-white/5 text-white/80"
              }`}
            >
              <Icon path={tab.icon} active={active} />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
