"use client";

import Link from "next/link";

import { getProfileCompleteness } from "@/shared/profile-completeness";
import type { CoupleSnapshot } from "@life/shared-types";

export default function ProfileNudge({ couple }: { couple?: CoupleSnapshot | null }) {
  const { percent, nextGap, isComplete } = getProfileCompleteness(couple);

  if (isComplete || !nextGap) return null;

  return (
    <div className="flex flex-col gap-3 rounded-[1.5rem] border border-[#f4d06f]/25 bg-[#f4d06f]/8 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-[11px] uppercase tracking-[0.28em] text-[#f4d06f]">Perfil {percent}% completo</p>
        <p className="mt-1 text-sm font-medium text-white">{nextGap.label}</p>
        <p className="mt-1 text-xs text-white/60">{nextGap.why}</p>
      </div>
      <Link
        href={nextGap.href}
        className="shrink-0 rounded-full bg-[#f97352] px-4 py-2 text-center text-sm font-medium text-white"
      >
        Completar agora
      </Link>
    </div>
  );
}
