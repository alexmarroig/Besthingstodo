"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import DiscoveryCard from "./discovery-card";
import { patchCoupleProfile } from "@/shared/api/client";
import { addFavoriteRestaurant } from "@/shared/couple-profile-builder";
import { getCoupleProfile } from "@/shared/storage";
import { Recommendation } from "@life/shared-types";

export default function MediaDetailModal({
  item,
  userId,
  onClose,
  onAction,
}: {
  item: Recommendation | null;
  userId: string;
  onClose: () => void;
  onAction?: (id: string, action: "like" | "dislike" | "save" | "skip") => void;
}) {
  const queryClient = useQueryClient();
  const [savedFavorite, setSavedFavorite] = useState(false);
  const [pendingFavorite, setPendingFavorite] = useState(false);

  if (!item) return null;

  const matchReason = item.couple_fit_reason || item.personalization_label || item.reason;
  const matchSignals = [
    item.personalization_label,
    item.weather_fit,
    item.distance_label,
    ...(item.tags || []).slice(0, 2),
  ].filter(Boolean);

  const handleAction = (id: string, action: "like" | "dislike" | "save" | "skip") => {
    onAction?.(id, action);
  };

  const addAsFavorite = async () => {
    if (item.domain !== "dining_out" || pendingFavorite || savedFavorite) return;
    setPendingFavorite(true);
    const current = getCoupleProfile();
    const updated = addFavoriteRestaurant(current, item.title);
    await patchCoupleProfile(updated);
    setSavedFavorite(true);
    setPendingFavorite(false);
    queryClient.invalidateQueries({ queryKey: ["couple-me"] });
    queryClient.invalidateQueries({ queryKey: ["recommendation-sources"] });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-[1.75rem] bg-[#0a121c] shadow-float ring-1 ring-white/[0.08] sm:max-h-[88vh] sm:rounded-[1.75rem]"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={item.title}
      >
        <div className="flex shrink-0 justify-center pt-3 sm:hidden">
          <div className="h-1 w-10 rounded-full bg-white/15" aria-hidden />
        </div>

        <div className="flex shrink-0 items-center justify-between border-b border-white/[0.06] px-5 py-3.5">
          <p className="text-sm font-semibold text-white">Detalhes</p>
          <button type="button" onClick={onClose} className="btn-ghost px-3 py-1.5 text-xs">
            Fechar
          </button>
        </div>

        <div className="overflow-y-auto overscroll-contain">
          {matchReason ? (
            <div className="border-b border-white/[0.06] px-5 py-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#f4d06f]">Por que combina</p>
              <p className="mt-2 text-sm leading-relaxed text-white/82">{matchReason}</p>
              {matchSignals.length ? (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {matchSignals.map((signal) => (
                    <span key={String(signal)} className="pill px-2.5 py-1 text-[10px]">
                      {signal}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          <DiscoveryCard item={item} userId={userId} onAction={handleAction} />

          {item.domain === "dining_out" ? (
            <div className="border-t border-white/[0.06] px-5 py-4">
              <p className="text-sm text-white/55">Salve nos favoritos do casal para priorizar lugares parecidos.</p>
              <button
                type="button"
                disabled={savedFavorite || pendingFavorite}
                onClick={() => void addAsFavorite()}
                className="btn-ghost mt-3 border-[#f4d06f]/25 text-[#f4d06f] disabled:opacity-50"
              >
                {savedFavorite ? "✓ Nos favoritos" : "Salvar favorito do casal"}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
