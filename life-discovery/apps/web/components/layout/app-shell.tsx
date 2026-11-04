"use client";

import { BottomNav, Navbar } from "./navigation";
import { AccountBar, AccountGate } from "../account/account-provider";
import DiscoveryOpening from "../branding/discovery-opening";

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen pb-28 lg:pb-8">
      <a href="#conteudo-principal" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-[100] focus:rounded-lg focus:bg-[#e7c994] focus:px-4 focus:py-3 focus:text-sm focus:font-semibold focus:text-[#101820]">Pular para o conteúdo</a>
      <Navbar />
      <AccountBar />
      <main id="conteudo-principal" tabIndex={-1} className="mx-auto max-w-6xl px-4 py-5 outline-none md:px-6 md:py-8">
        <AccountGate>{children}</AccountGate>
      </main>
      <BottomNav />
      <DiscoveryOpening />
    </div>
  );
}
