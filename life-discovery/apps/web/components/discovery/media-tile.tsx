"use client";

import ExperienceImage from "./experience-image";
import { localizeCategory } from "@/shared/labels-pt";
import { Recommendation } from "@life/shared-types";

export default function MediaTile({
  item,
  onOpen,
}: {
  item: Recommendation;
  onOpen: (item: Recommendation) => void;
}) {
  const hasImage = Boolean(item.image_url);

  return (
    <button
      type="button"
      onClick={() => onOpen(item)}
      className="group w-[132px] shrink-0 text-left sm:w-[148px]"
    >
      <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-black/25 ring-1 ring-white/10 transition duration-200 group-hover:scale-[1.03] group-hover:ring-[#f97352]/40">
        {hasImage ? (
          <img src={item.image_url!} alt={item.title} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <ExperienceImage item={item} className="h-full w-full" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
        {item.score != null && item.score > 0 && (
          <span className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white">
            {Number(item.score).toFixed(1)}
          </span>
        )}
        <span className="absolute bottom-2 left-2 rounded-full bg-white/12 px-2 py-0.5 text-[9px] uppercase tracking-[0.18em] text-white/90">
          {localizeCategory(item.category)}
        </span>
      </div>
      <p className="mt-2 line-clamp-2 text-sm font-medium leading-snug text-white">{item.title}</p>
      {item.location && <p className="mt-1 line-clamp-1 text-[11px] text-white/50">{item.location}</p>}
    </button>
  );
}
