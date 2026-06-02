"use client";

import ExperienceImage from "./experience-image";
import { MediaTileVariant } from "./media-tile-skeleton";
import { localizeCategory } from "@/shared/labels-pt";
import { getRecommendationSourceMeta } from "@/shared/source";
import { Recommendation } from "@life/shared-types";

export type { MediaTileVariant };

function matchLabel(item: Recommendation) {
  if (item.quality_score != null && item.quality_score > 0) {
    return `${Math.round(item.quality_score)}%`;
  }
  if (item.score != null && item.score > 0) {
    return `${Number(item.score).toFixed(1)}★`;
  }
  return null;
}

export default function MediaTile({
  item,
  onOpen,
  variant = "landscape",
}: {
  item: Recommendation;
  onOpen: (item: Recommendation) => void;
  variant?: MediaTileVariant;
}) {
  const isPoster = variant === "poster";
  const sourceMeta = getRecommendationSourceMeta(item);
  const match = matchLabel(item);
  const location = item.neighborhood || item.location;

  return (
    <button
      type="button"
      onClick={() => onOpen(item)}
      className={`group shrink-0 snap-start text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff7a59]/50 ${
        isPoster ? "w-[128px] sm:w-[142px]" : "w-[200px] sm:w-[228px]"
      }`}
    >
      <div className={`experience-card relative overflow-hidden ${isPoster ? "aspect-[2/3]" : "aspect-[4/3]"}`}>
        <ExperienceImage item={item} mode="tile" className="absolute inset-0 h-full w-full" />
      </div>

      <div className="mt-2.5 space-y-1 px-0.5">
        <p className="line-clamp-2 text-[13px] font-semibold leading-snug text-white sm:text-[14px]">{item.title}</p>

        <div className="flex items-center gap-1.5 text-[11px] text-white/42">
          <span className="truncate">{sourceMeta.label}</span>
          {location ? (
            <>
              <span aria-hidden>·</span>
              <span className="truncate">{location}</span>
            </>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {match ? <span className="pill-accent px-2 py-0.5 text-[10px]">{match}</span> : null}
          <span className="rounded-full bg-white/[0.05] px-2 py-0.5 text-[10px] text-white/50">
            {localizeCategory(item.category)}
          </span>
          {item.personalization_label ? (
            <span className="rounded-full bg-[#f4d06f]/10 px-2 py-0.5 text-[10px] text-[#f4d06f]">
              {item.personalization_label}
            </span>
          ) : null}
        </div>
      </div>
    </button>
  );
}
