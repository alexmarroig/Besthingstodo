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
    queryClient.invalidateQueries({ queryKey: ["home-recos"] });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[1.5rem] bg-[#0b0f17] shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <p className="text-sm font-medium text-white/80">Detalhes</p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-white/10 px-3 py-1 text-sm text-white/70 hover:bg-white/15"
          >
            Fechar
          </button>
        </div>

        {matchReason ? (
          <div className="border-b border-white/8 px-5 py-4">
            <p className="text-[11px] uppercase tracking-[0.28em] text-[#f4d06f]">Match com vocês</p>
            <p className="mt-2 text-sm leading-relaxed text-white/85">{matchReason}</p>
            {matchSignals.length ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {matchSignals.map((signal) => (
                  <span key={String(signal)} className="rounded-full bg-white/8 px-2.5 py-1 text-[11px] text-white/65">
                    {signal}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        <DiscoveryCard item={item} userId={userId} onAction={handleAction} />

        {item.domain === "dining_out" ? (
          <div className="border-t border-white/8 px-5 py-4">
            <p className="text-sm text-white/70">Curtiu? Salve como favorito do casal para priorizar lugares parecidos.</p>
            <button
              type="button"
              disabled={savedFavorite || pendingFavorite}
              onClick={() => void addAsFavorite()}
              className="mt-3 rounded-full bg-[#f4d06f]/20 px-4 py-2 text-sm font-medium text-[#f4d06f] disabled:opacity-50"
            >
              {savedFavorite ? "Adicionado aos favoritos" : "Salvar como favorito do casal"}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
