"use client";

import { motion } from "framer-motion";

export default function ConciergeBubble({ role, text }: { role: "user" | "assistant"; text: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${role === "user" ? "ml-auto bg-primary" : "bg-white/10"}`}
    >
      {text}
    </motion.div>
  );
}

