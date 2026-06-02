"use client";

import ExperienceImage from "./experience-image";
import { Recommendation } from "@life/shared-types";

function matchPercent(item: Recommendation) {
  if (item.quality_score != null && item.quality_score > 0) return Math.round(item.quality_score);
  if (item.score != null && item.score > 0) return Math.round(item.score * 10);
  return null;
}

export default function HeroBanner({
  item,
  onOpen,
}: {
  item: Recommendation;
  onOpen: (item: Recommendation) => void;
}) {
  const match = matchPercent(item);
  const reason = item.couple_fit_reason || item.reason || item.description;

  return (
    <button
      type="button"
      onClick={() => onOpen(item)}
      className="group relative block w-full overflow-hidden rounded-[1.75rem] text-left ring-1 ring-white/[0.08] transition active:scale-[0.995] sm:rounded-[2rem]"
    >
      <div className="relative aspect-[16/10] min-h-[240px] w-full bg-black/20 sm:aspect-[21/9] sm:min-h-[280px]">
        <ExperienceImage item={item} mode="hero" className="h-full w-full" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#040810]/95 via-[#040810]/35 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#040810]/80 via-transparent to-transparent" />

        <div className="absolute inset-x-0 top-0 flex items-start justify-between p-4 sm:p-6">
          <span className="pill-accent backdrop-blur-md">Destaque do dia</span>
          {match != null ? (
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white backdrop-blur-md">
              {match}% match
            </span>
          ) : null}
        </div>

        <div className="absolute inset-x-0 bottom-0 p-4 sm:p-7">
          <div className="max-w-xl">
            <h2 className="font-display text-2xl font-semibold leading-[1.08] text-white sm:text-4xl md:text-[2.75rem]">
              {item.title}
            </h2>
            {reason ? (
              <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-white/72 sm:text-[15px]">{reason}</p>
            ) : null}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {item.location || item.neighborhood ? (
              <span className="pill">{item.neighborhood || item.location}</span>
            ) : null}
            <span className="btn-primary ml-auto gap-1.5 py-2 pl-4 pr-3 text-xs sm:text-sm">
              Ver agora
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}
