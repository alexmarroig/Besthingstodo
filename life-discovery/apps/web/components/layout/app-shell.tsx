"use client";

import { motion } from "framer-motion";

import { BottomNav, Navbar } from "./navigation";

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg pb-24 md:pb-10">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-6 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: "easeOut" }}
        >
          {children}
        </motion.div>
      </main>
      <BottomNav />
    </div>
  );
}

