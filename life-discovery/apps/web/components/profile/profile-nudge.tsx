"use client";

import Link from "next/link";

import { getProfileCompleteness } from "@/shared/profile-completeness";
import type { CoupleSnapshot } from "@life/shared-types";

export default function ProfileNudge({ couple }: { couple?: CoupleSnapshot | null }) {
  const { percent, nextGap, isComplete } = getProfileCompleteness(couple);

  if (isComplete || !nextGap) return null;

  return (
    <div className="surface flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="pill-accent text-[10px]">Perfil {percent}%</span>
        </div>
        <p className="mt-2 text-sm font-semibold text-white">{nextGap.label}</p>
        <p className="mt-1 text-xs text-white/48">{nextGap.why}</p>
      </div>
      <Link href={nextGap.href} className="btn-primary shrink-0 text-center">
        Completar
      </Link>
    </div>
  );
}
