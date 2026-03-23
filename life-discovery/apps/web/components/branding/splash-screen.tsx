"use client";

import { motion } from "framer-motion";

import { BRAND } from "@/shared/brand";

export default function SplashScreen({ message }: { message: string }) {
  return (
    <div className="fixed inset-0 z-[100] overflow-hidden bg-[#050b14]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(249,115,82,0.28),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(244,208,111,0.18),transparent_22%),linear-gradient(180deg,#040a12_0%,#08111d_100%)]" />
      <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(120deg,rgba(255,255,255,0.06)_0,rgba(255,255,255,0.06)_8%,transparent_8%,transparent_20%,rgba(255,255,255,0.03)_20%,rgba(255,255,255,0.03)_28%,transparent_28%,transparent_100%)]" />

      <div className="relative mx-auto flex min-h-screen max-w-5xl items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
          className="w-full max-w-2xl rounded-[2.6rem] border border-white/10 bg-[rgba(12,23,38,0.78)] p-8 text-center shadow-[0_30px_120px_rgba(0,0,0,0.36)] backdrop-blur-2xl"
        >
          <motion.div
            initial={{ opacity: 0.5, scale: 0.9 }}
            animate={{ opacity: 1, scale: [1, 1.04, 1] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
            className="mx-auto flex h-20 w-20 items-center justify-center rounded-[2rem] border border-[#f4d06f]/25 bg-[radial-gradient(circle_at_top_left,rgba(249,115,82,0.42),transparent_40%),linear-gradient(180deg,rgba(249,115,82,0.18),rgba(7,17,29,0.96))] shadow-[0_20px_50px_rgba(249,115,82,0.18)]"
          >
            <span className="text-2xl font-semibold tracking-[0.18em] text-[#fff2cf]">R2</span>
          </motion.div>

          <p className="mt-6 text-[11px] uppercase tracking-[0.42em] text-[#f4d06f]">{BRAND.eyebrow}</p>
          <h1 className="mt-4 text-5xl font-semibold tracking-[-0.04em] text-white md:text-6xl">{BRAND.name}</h1>
          <p className="mx-auto mt-4 max-w-xl text-sm text-white/70 md:text-base">{BRAND.subtitle}</p>

          <div className="mx-auto mt-8 h-[2px] w-full max-w-md overflow-hidden rounded-full bg-white/8">
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: "100%" }}
              transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
              className="h-full w-1/2 bg-[linear-gradient(90deg,transparent,rgba(249,115,82,0.95),rgba(244,208,111,0.95),transparent)]"
            />
          </div>

          <p className="mt-4 text-sm text-white/56">{message}</p>
        </motion.div>
      </div>
    </div>
  );
}
