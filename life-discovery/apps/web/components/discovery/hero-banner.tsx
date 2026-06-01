"use client";

import ExperienceImage from "./experience-image";
import { Recommendation } from "@life/shared-types";

export default function HeroBanner({
  item,
  onOpen,
}: {
  item: Recommendation;
  onOpen: (item: Recommendation) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(item)}
      className="group relative block w-full overflow-hidden rounded-[2rem] border border-white/10 text-left"
    >
      <div className="relative aspect-[21/9] min-h-[220px] w-full bg-black/30 sm:min-h-[280px]">
        {item.image_url ? (
          <img src={item.image_url} alt={item.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]" />
        ) : (
          <ExperienceImage item={item} className="h-full w-full" />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/50 to-transparent" />
        <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-8">
          <p className="text-[11px] uppercase tracking-[0.34em] text-[#f4d06f]">Principal para vocês</p>
          <h2 className="mt-2 max-w-2xl text-3xl font-semibold text-white md:text-5xl">{item.title}</h2>
          <p className="mt-3 max-w-xl text-sm text-white/75 md:text-base">
            {item.couple_fit_reason || item.reason || item.description}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {item.score != null && (
              <span className="rounded-full bg-[#f97352]/20 px-3 py-1 text-xs font-medium text-[#f97352]">
                Match {Math.round((item.quality_score || item.score * 10) ?? 0)}%
              </span>
            )}
            {item.location && (
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/75">📍 {item.location}</span>
            )}
          </div>
          <span className="mt-5 inline-flex w-fit rounded-full bg-white px-4 py-2 text-sm font-medium text-black">
            Ver recomendação
          </span>
        </div>
      </div>
    </button>
  );
}
