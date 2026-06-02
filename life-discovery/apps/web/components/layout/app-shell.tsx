"use client";

import { motion } from "framer-motion";

import { BottomNav, Navbar } from "./navigation";

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen pb-28 md:pb-8">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-5 md:px-6 md:py-8">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        >
          {children}
        </motion.div>
      </main>
      <BottomNav />
    </div>
  );
}
