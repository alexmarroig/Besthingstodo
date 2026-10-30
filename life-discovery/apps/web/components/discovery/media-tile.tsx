"use client";

import { useState } from "react";
import { ArrowUpRight, Bookmark, Heart, UtensilsCrossed } from "lucide-react";

import ExperienceImage from "./experience-image";
import { MediaTileVariant } from "./media-tile-skeleton";
import { sendFeedback } from "@/shared/api/client";
import { localizeCategory } from "@/shared/labels-pt";
import { getRecommendationSourceMeta } from "@/shared/source";
import { getUserId, isItemSaved, upsertAgendaItem, upsertSavedItem } from "@/shared/storage";
import { Recommendation } from "@life/shared-types";
import { requireAccountForChange } from "@/shared/account-sync";

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
  const isFood = variant === "food";
  const sourceMeta = getRecommendationSourceMeta(item);
  const match = matchLabel(item);
  const location = item.neighborhood || item.location;

  const [saved, setSaved] = useState(() => isItemSaved(item.id));
  const [liked, setLiked] = useState(false);

  const handleQuickFeedback = (
    e: React.MouseEvent,
    type: "like" | "save"
  ) => {
    e.stopPropagation();
    if (!requireAccountForChange()) return;
    const userId = getUserId();
    void sendFeedback(userId, item.id, type, {
      title: item.title,
      tags: item.tags,
      domain: item.domain,
      category: item.category,
      neighborhood: item.neighborhood || undefined,
      location: item.location,
      price: item.price,
      indoor_outdoor: item.indoor_outdoor,
    });
    if (type === "save") {
      upsertSavedItem(item);
      setSaved(true);
    } else {
      upsertAgendaItem(item);
      setLiked(true);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(item)}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(item);
        }
      }}
      className={`group shrink-0 cursor-pointer snap-start text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff7a59]/50 ${
        isPoster ? "w-[134px] sm:w-[148px]" : isFood ? "w-[260px] sm:w-[300px]" : "w-[210px] sm:w-[236px]"
      }`}
    >
      <div className={`experience-card relative overflow-hidden ${isPoster ? "aspect-[2/3]" : "aspect-[4/3]"}`}>
        <ExperienceImage item={item} mode="tile" className="absolute inset-0 h-full w-full" />

        {/* Quick 1-Tap ML Feedback Overlay */}
        <div className="absolute bottom-2 right-2 z-10 flex items-center gap-1.5 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
          <button
            type="button"
            title="Curtir"
            aria-label={`Curtir ${item.title}`}
            aria-pressed={liked}
            onClick={(e) => handleQuickFeedback(e, "like")}
            className={`flex h-11 w-11 items-center justify-center rounded-full backdrop-blur-md transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f4d06f] ${
              liked
                ? "bg-[#ff7a59] text-white shadow-md"
                : "bg-black/60 text-white/80 hover:bg-[#ff7a59]/80 hover:text-white"
            }`}
          >
            <Heart className="h-3.5 w-3.5" fill={liked ? "currentColor" : "none"} />
          </button>
          <button
            type="button"
            title="Salvar na coleção"
            aria-label={`Salvar ${item.title}`}
            aria-pressed={saved}
            onClick={(e) => handleQuickFeedback(e, "save")}
            className={`flex h-11 w-11 items-center justify-center rounded-full backdrop-blur-md transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f4d06f] ${
              saved
                ? "bg-[#f4d06f] text-black shadow-md"
                : "bg-black/60 text-white/80 hover:bg-[#f4d06f]/85 hover:text-black"
            }`}
          >
            <Bookmark className="h-3.5 w-3.5" fill={saved ? "currentColor" : "none"} />
          </button>
        </div>
      </div>

      <div className="mt-2.5 space-y-1 px-0.5">
        <p className="line-clamp-2 text-[13px] font-semibold leading-snug text-white transition-colors group-hover:text-[#ffb89a] sm:text-[14px]">
          {item.title}
        </p>

        <div className="flex items-center gap-1.5 text-[11px] text-white/45">
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
          <span className="rounded-full bg-white/[0.05] px-2 py-0.5 text-[10px] text-white/55">
            {localizeCategory(item.category)}
          </span>
          {item.personalization_label ? (
            <span className="rounded-full bg-[#f4d06f]/12 px-2 py-0.5 text-[10px] font-medium text-[#f4d06f]">
              {item.personalization_label}
            </span>
          ) : null}
        </div>
      </div>
      {isFood ? <div className="mt-3 flex min-h-11 items-center justify-between rounded-xl border border-[#ff7a59]/25 bg-[#ff7a59]/10 px-3.5 text-xs font-semibold text-[#ffb89a] transition group-hover:bg-[#ff7a59]/20">
        <span className="flex items-center gap-2"><UtensilsCrossed className="h-4 w-4" />Ver detalhes</span><ArrowUpRight className="h-4 w-4" />
      </div> : null}
    </div>
  );
}
