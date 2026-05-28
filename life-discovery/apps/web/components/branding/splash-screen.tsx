"use client";

import { motion } from "framer-motion";
import { BRAND } from "@/shared/brand";

export default function SplashScreen({ message }: { message: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 animate-gradient bg-gradient-to-br from-[#040b14] via-[#0b1827] to-[#06111d]" />

      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="animate-float absolute left-[15%] top-[20%] h-32 w-32 rounded-full bg-[#f97352]/10 blur-3xl" style={{ animationDelay: "0s" }} />
        <div className="animate-float absolute right-[20%] top-[30%] h-24 w-24 rounded-full bg-[#f4d06f]/8 blur-3xl" style={{ animationDelay: "1.5s" }} />
        <div className="animate-float absolute bottom-[25%] left-[30%] h-28 w-28 rounded-full bg-[#38bdf8]/8 blur-3xl" style={{ animationDelay: "3s" }} />
        <div className="animate-float absolute bottom-[15%] right-[15%] h-20 w-20 rounded-full bg-[#f97352]/6 blur-2xl" style={{ animationDelay: "2s" }} />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-10 flex flex-col items-center gap-7"
      >
        {/* Logo with glow */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="animate-pulse-glow flex h-20 w-20 items-center justify-center rounded-[2rem] border border-[#f4d06f]/20 bg-[radial-gradient(circle_at_top_left,rgba(249,115,82,0.4),transparent_50%),linear-gradient(180deg,rgba(249,115,82,0.18),rgba(7,17,29,0.98))]"
        >
          <span className="text-2xl font-bold tracking-[0.22em] text-[#fff2cf]">R2</span>
        </motion.div>

        {/* Brand name */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25 }}
          className="text-center"
        >
          <p className="text-[10px] uppercase tracking-[0.42em] text-[#f4d06f]/80">{BRAND.eyebrow}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.02em] text-white">{BRAND.name}</h1>
        </motion.div>

        {/* Loading bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="w-56"
        >
          <div className="h-1 overflow-hidden rounded-full bg-white/8">
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: "100%" }}
              transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
              className="h-full w-1/2 rounded-full bg-gradient-to-r from-transparent via-[#f97352] to-transparent"
            />
          </div>
        </motion.div>

        {/* Status message */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center text-xs text-white/50"
        >
          {message}
        </motion.p>
      </motion.div>
    </div>
  );
}
