"use client";

import ExperienceImage from "./experience-image";
import { localizeCategory } from "@/shared/labels-pt";
import { normalizeRecommendationImageUrl } from "@/shared/recommendation-images";
import { Recommendation } from "@life/shared-types";

export type MediaTileVariant = "landscape" | "poster";

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
  const imageUrl = normalizeRecommendationImageUrl(item.image_url);

  return (
    <button
      type="button"
      onClick={() => onOpen(item)}
      className={`group shrink-0 snap-start text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f97352]/60 ${
        isPoster ? "w-[148px] sm:w-[168px]" : "w-[min(82vw,300px)] sm:w-[300px]"
      }`}
    >
      <div
        className={`relative overflow-hidden rounded-2xl bg-black/30 ring-1 ring-white/10 shadow-lg shadow-black/30 transition duration-300 group-hover:-translate-y-1 group-hover:ring-[#f97352]/35 ${
          isPoster ? "aspect-[2/3]" : "aspect-[16/10]"
        }`}
      >
        {imageUrl ? (
          <>
            <img
              src={imageUrl}
              alt={item.title}
              className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
            <div className="absolute inset-x-0 top-0 flex items-start justify-between p-3">
              <span className="rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-white/90 backdrop-blur-sm">
                {localizeCategory(item.category)}
              </span>
              {item.score != null && item.score > 0 ? (
                <span className="rounded-full bg-black/55 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                  {Number(item.score).toFixed(1)}
                </span>
              ) : null}
            </div>
          </>
        ) : (
          <ExperienceImage item={item} mode="tile" className="absolute inset-0 h-full w-full" />
        )}
      </div>

      <div className="mt-3 space-y-1 pr-1">
        <p className="line-clamp-2 text-[15px] font-semibold leading-snug text-white sm:text-base">{item.title}</p>
        {(item.location || item.neighborhood) && (
          <p className="line-clamp-1 text-sm text-white/55">{item.location || item.neighborhood}</p>
        )}
        <div className="flex flex-wrap items-center gap-2 pt-0.5">
          <span className="text-[11px] uppercase tracking-wide text-white/40">{localizeCategory(item.category)}</span>
          {item.personalization_label ? (
            <span className="rounded-full bg-[#f4d06f]/12 px-2 py-0.5 text-[11px] text-[#f4d06f]">{item.personalization_label}</span>
          ) : null}
          {(item.couple_fit_reason || item.reason) && (
            <span className="line-clamp-1 text-[11px] text-white/50" title={item.couple_fit_reason || item.reason}>
              {item.couple_fit_reason || item.reason}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
