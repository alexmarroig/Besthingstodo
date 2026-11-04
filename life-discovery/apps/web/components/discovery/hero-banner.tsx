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
  const reason = item.couple_fit_reason || item.reason || item.description;

  return (
    <button
      type="button"
      onClick={() => onOpen(item)}
      className="group relative block w-full overflow-hidden rounded-[20px] text-left ring-1 ring-white/[0.08] transition-colors hover:ring-[#d7bc88]/35 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#d7bc88]"
    >
      <div className="relative aspect-[4/5] min-h-[350px] w-full bg-black/20 sm:aspect-[16/9] sm:min-h-[350px] lg:aspect-[21/9] lg:min-h-[390px]">
        <ExperienceImage item={item} mode="hero" className="h-full w-full" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#040810]/95 via-[#040810]/35 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#040810]/80 via-transparent to-transparent" />

        <div className="absolute inset-x-0 top-0 flex items-start justify-between p-4 sm:p-6">
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#edd2a4]">Em destaque</span>
        </div>

        <div className="absolute inset-x-0 bottom-0 p-4 sm:p-7">
          <div className="max-w-xl">
            <h2 className="font-serif text-[2.05rem] font-normal leading-[1.06] text-white sm:text-4xl md:text-5xl">
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
            <span className="ml-auto inline-flex items-center gap-2 rounded-[9px] bg-[#e7c994] px-4 py-3 text-xs font-semibold text-[#161b20] transition-colors group-hover:bg-[#f2d7aa] sm:text-sm">
              Conhecer
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
