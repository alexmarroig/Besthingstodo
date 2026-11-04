"use client";

import { useState } from "react";
import { ArrowUpRight, Bookmark, CalendarPlus, UtensilsCrossed } from "lucide-react";

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
  const [planned, setPlanned] = useState(false);

  const handleQuickFeedback = (
    e: React.MouseEvent,
    type: "plan" | "save"
  ) => {
    e.stopPropagation();
    if (!requireAccountForChange()) return;
    if (type === "save") {
      const userId = getUserId();
      void sendFeedback(userId, item.id, "save", {
        title: item.title,
        tags: item.tags,
        domain: item.domain,
        category: item.category,
        neighborhood: item.neighborhood || undefined,
        location: item.location,
        price: item.price,
        indoor_outdoor: item.indoor_outdoor,
      });
      upsertSavedItem(item);
      setSaved(true);
    } else {
      upsertAgendaItem(item);
      setPlanned(true);
    }
  };

  return (
    <div
      className={`group shrink-0 snap-start text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d7bc88]/50 ${
        isPoster ? "w-[min(38vw,168px)] sm:w-[174px] lg:w-[186px]" : isFood ? "w-[min(74vw,272px)] sm:w-[286px] lg:w-[306px]" : "w-[min(69vw,248px)] sm:w-[264px] lg:w-[288px]"
      }`}
    >
      <div className={`experience-card relative overflow-hidden rounded-[1.25rem] sm:rounded-[1.5rem] ${isPoster ? "aspect-[2/3]" : isFood ? "aspect-[5/4]" : "aspect-[4/3]"}`}>
        <ExperienceImage
          item={item}
          mode="tile"
          sizes={isPoster
            ? "(max-width: 640px) 38vw, (max-width: 1024px) 174px, 186px"
            : isFood
              ? "(max-width: 640px) 74vw, (max-width: 1024px) 286px, 306px"
              : "(max-width: 640px) 69vw, (max-width: 1024px) 264px, 288px"}
          className="absolute inset-0 h-full w-full"
        />
        <button type="button" onClick={() => onOpen(item)} aria-label={`Ver detalhes de ${item.title}`}
          className="absolute inset-0 z-[1] rounded-[1.25rem] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-[#e7c994]" />

        {/* Ações independentes da abertura do card */}
        <div className="absolute bottom-2 right-2 z-10 flex items-center gap-1.5 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
          <button
            type="button"
            title="Adicionar à agenda"
            aria-label={`Adicionar ${item.title} à agenda`}
            aria-pressed={planned}
            onClick={(e) => handleQuickFeedback(e, "plan")}
            className={`flex h-11 w-11 items-center justify-center rounded-full backdrop-blur-md transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f4d06f] ${
              planned
                ? "bg-[#e7c994] text-[#171b1f] shadow-md"
                : "bg-black/70 text-white/85 hover:bg-[#e7c994] hover:text-[#171b1f]"
            }`}
          >
            <CalendarPlus className="h-[17px] w-[17px]" strokeWidth={1.65} />
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

      <div className="mt-3 space-y-1.5 px-1">
        <button type="button" onClick={() => onOpen(item)} className="line-clamp-2 min-h-[2.6em] w-full text-left text-[14px] font-semibold leading-snug text-white transition-colors hover:text-[#e7c994] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#e7c994] sm:text-[15px]">
          {item.title}
        </button>

        <div className="flex items-center gap-1.5 text-[11px] text-white/65">
          <span className="truncate">{sourceMeta.label}</span>
          {location ? (
            <>
              <span aria-hidden>·</span>
              <span className="truncate">{location}</span>
            </>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {match ? <span className="text-[11px] text-[#e7c994]">{match}</span> : null}
          <span className="rounded-md bg-white/[0.05] px-2 py-0.5 text-[11px] text-white/65">
            {localizeCategory(item.category)}
          </span>
          {item.personalization_label ? (
            <span className="rounded-full bg-[#f4d06f]/12 px-2 py-0.5 text-[10px] font-medium text-[#f4d06f]">
              {item.personalization_label}
            </span>
          ) : null}
        </div>
      </div>
      {isFood ? <button type="button" onClick={() => onOpen(item)} className="mt-3 flex min-h-11 w-full items-center justify-between rounded-xl border border-white/15 bg-white/[0.045] px-3.5 text-xs font-semibold text-[#e7c994] transition-colors hover:border-[#e7c994]/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#e7c994]">
        <span className="flex items-center gap-2"><UtensilsCrossed className="h-4 w-4" />Conhecer</span><ArrowUpRight className="h-4 w-4" />
      </button> : null}
    </div>
  );
}
