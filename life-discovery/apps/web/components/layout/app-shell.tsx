"use client";

import { BottomNav, Navbar } from "./navigation";
import { AccountBar, AccountGate } from "../account/account-provider";

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen pb-28 md:pb-8">
      <Navbar />
      <AccountBar />
      <main className="mx-auto max-w-6xl px-4 py-5 md:px-6 md:py-8">
        <AccountGate>{children}</AccountGate>
      </main>
      <BottomNav />
    </div>
  );
}
