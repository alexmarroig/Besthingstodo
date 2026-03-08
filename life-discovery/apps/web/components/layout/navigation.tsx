"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/home", label: "Home" },
  { href: "/map", label: "Map" },
  { href: "/agenda", label: "Agenda" },
  { href: "/saved", label: "Saved" },
  { href: "/profile", label: "Profile" }
];

export function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-bg/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-accent">Life Discovery</p>
          <h1 className="text-lg font-semibold">Concierge</h1>
        </div>
        <div className="hidden gap-2 md:flex">
          {tabs.map((tab) => (
            <Link key={tab.href} href={tab.href} className="rounded-full bg-white/5 px-4 py-2 text-sm hover:bg-white/10">
              {tab.label}
            </Link>
          ))}
          <Link href="/date-night" className="rounded-full bg-primary px-4 py-2 text-sm">
            Date Night
          </Link>
          <Link href="/concierge" className="rounded-full bg-accent px-4 py-2 text-sm text-black">
            AI
          </Link>
        </div>
      </div>
    </header>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-bg/95 p-2 backdrop-blur-xl md:hidden">
      <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
        {tabs.map((tab) => {
          const active = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`rounded-xl px-3 py-2 text-center text-xs ${active ? "bg-primary text-white" : "bg-white/5 text-white/80"}`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

