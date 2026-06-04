"use client";

import { AnimatePresence, motion } from "framer-motion";

import BrandMark from "./brand-mark";
import IconBadge from "../icons/icon-badge";
import { BRAND } from "@/shared/brand";
import type { BootSlide } from "@/shared/boot-content";

export default function SplashScreen({
  slide,
  progress,
  exiting = false,
}: {
  slide: BootSlide;
  progress: number;
  exiting?: boolean;
}) {
  const clampedProgress = Math.min(100, Math.max(0, progress));
  const SlideIcon = slide.icon;

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
        className="relative z-10 mx-4 w-full max-w-md rounded-[2rem] border border-white/[0.08] bg-white/[0.04] px-8 py-10 text-center shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl"
      >
        <div className="mx-auto mb-6 flex justify-center">
          <BrandMark size="lg" glow />
        </div>

        <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-[#f4d06f]/90">{BRAND.eyebrow}</p>
        <h1 className="mt-2 font-display text-[1.65rem] font-bold leading-tight tracking-tight text-white">
          {BRAND.name}
        </h1>

        <div className="mt-7 min-h-[9.5rem]">
          <AnimatePresence mode="wait">
            <motion.div
              key={slide.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.28 }}
              className="space-y-3"
            >
              <div className="flex justify-center">
                <IconBadge icon={SlideIcon} variant="coral" size="md" />
              </div>
              <h2 className="font-display text-lg font-semibold leading-snug text-white">{slide.title}</h2>
              <p className="text-sm leading-relaxed text-white/72">{slide.body}</p>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="mt-6">
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
            <AnimatePresence mode="wait">
              <motion.span
                key={slide.status}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                {slide.status}
              </motion.span>
            </AnimatePresence>
            <span>{Math.round(clampedProgress)}%</span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
