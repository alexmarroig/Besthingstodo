"use client";

import { motion } from "framer-motion";

import { BottomNav, Navbar } from "./navigation";

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg pb-20 md:pb-8">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-4">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
        >
          {children}
        </motion.div>
      </main>
      <BottomNav />
    </div>
  );
}

