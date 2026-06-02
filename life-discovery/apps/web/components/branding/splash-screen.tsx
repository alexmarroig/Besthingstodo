"use client";

import { motion } from "framer-motion";
import { BRAND } from "@/shared/brand";

export default function SplashScreen({ message }: { message: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-[#060d16]">
      <div className="pointer-events-none absolute inset-0">
        <div className="animate-aurora absolute -left-20 top-0 h-64 w-64 rounded-full bg-[#ff7a59]/12 blur-3xl" />
        <div className="animate-aurora absolute bottom-0 right-0 h-56 w-56 rounded-full bg-[#f4d06f]/8 blur-3xl" style={{ animationDelay: "2s" }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 flex flex-col items-center gap-6 px-6"
      >
        <div className="flex h-16 w-16 items-center justify-center rounded-[1.35rem] bg-gradient-to-br from-[#ff7a59]/35 to-transparent text-lg font-bold tracking-wider text-[#fff2cf] ring-1 ring-white/10 shadow-glow-sm">
          R2
        </div>

        <div className="text-center">
          <p className="text-[10px] font-medium uppercase tracking-[0.32em] text-[#f4d06f]/85">{BRAND.eyebrow}</p>
          <h1 className="mt-2 font-display text-2xl font-semibold text-white">{BRAND.name}</h1>
        </div>

        <div className="w-44 overflow-hidden rounded-full bg-white/[0.06]">
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: "200%" }}
            transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
            className="h-0.5 w-1/3 rounded-full bg-gradient-to-r from-transparent via-[#ff7a59] to-transparent"
          />
        </div>

        <p className="text-center text-xs text-white/42">{message}</p>
      </motion.div>
    </div>
  );
}
