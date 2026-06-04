"use client";

import { AnimatePresence, motion } from "framer-motion";

import BrandMark from "./brand-mark";
import { BRAND } from "@/shared/brand";

export default function SplashScreen({
  message,
  progress,
  exiting = false,
}: {
  message: string;
  progress: number;
  exiting?: boolean;
}) {
  const clampedProgress = Math.min(100, Math.max(0, progress));

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-[#050a12]"
      initial={{ opacity: 1 }}
      animate={{ opacity: exiting ? 0 : 1, scale: exiting ? 1.02 : 1 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(5,10,18,0.55)_55%,rgba(5,10,18,0.92)_100%)]" />
        <div className="animate-aurora absolute -left-24 top-[-10%] h-72 w-72 rounded-full bg-[#ff7a59]/14 blur-3xl" />
        <div
          className="animate-aurora absolute bottom-[-8%] right-[-10%] h-80 w-80 rounded-full bg-[#f4d06f]/10 blur-3xl"
          style={{ animationDelay: "2s" }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:28px_28px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_72%)]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 mx-4 w-full max-w-sm rounded-[2rem] border border-white/[0.08] bg-white/[0.04] px-8 py-10 text-center shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl"
      >
        <div className="mx-auto mb-7 flex justify-center">
          <BrandMark size="lg" glow />
        </div>

        <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-[#f4d06f]/90">{BRAND.eyebrow}</p>
        <h1 className="mt-3 font-display text-[1.75rem] font-bold leading-tight tracking-tight text-white">
          {BRAND.name}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-white/70">{BRAND.subtitle}</p>

        <div className="mt-8">
          <div className="relative h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
            <motion.div
              className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[#ff7a59] to-[#f4d06f]"
              initial={{ width: "0%" }}
              animate={{ width: `${clampedProgress}%` }}
              transition={{ duration: 0.35, ease: "easeOut" }}
            />
            <motion.div
              className="absolute inset-y-0 w-16 rounded-full bg-gradient-to-r from-transparent via-white/35 to-transparent"
              animate={{ x: ["-100%", "280%"] }}
              transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] font-medium text-white/45">
            <span>Carregando</span>
            <span>{Math.round(clampedProgress)}%</span>
          </div>
        </div>

        <div className="relative mt-5 min-h-[1.25rem]">
          <AnimatePresence mode="wait">
            <motion.p
              key={message}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
              className="text-sm leading-relaxed text-white/62"
            >
              {message}
            </motion.p>
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}
