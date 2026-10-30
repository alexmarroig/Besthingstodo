"use client";

import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { BrainCircuit, Sparkles, Star } from "lucide-react";

import DiscoveryCard from "./discovery-card";
import WatchAvailability from "./watch-availability";
import { patchCoupleProfile, sendFeedback } from "@/shared/api/client";
import { addFavoriteRestaurant } from "@/shared/couple-profile-builder";
import { getCoupleProfile } from "@/shared/storage";
import { requireAccountForChange } from "@/shared/account-sync";
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
  const openedAtRef = useRef<number>(Date.now());

  useEffect(() => {
    setSavedFavorite(false);
    setPendingFavorite(false);
    if (!item) return;

    openedAtRef.current = Date.now();
    const meta = {
      title: item.title,
      tags: item.tags,
      domain: item.domain,
      category: item.category,
      neighborhood: item.neighborhood || undefined,
      location: item.location,
      price: item.price,
      indoor_outdoor: item.indoor_outdoor,
    };

    // Record implicit view signal
    void sendFeedback(userId, item.id, "view", meta);

    // Handle Escape key
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      const dwellMs = Date.now() - openedAtRef.current;
      if (dwellMs >= 4200) {
        void sendFeedback(userId, item.id, "dwell", {
          ...meta,
          dwell_ms: dwellMs,
        });
      }
    };
  }, [item, userId, onClose]);

  if (!item) return null;

  const matchReason = item.couple_fit_reason || item.personalization_label || item.reason;
  const matchSignals = Array.from(
    new Set(
      [
        item.personalization_label,
        item.weather_fit,
        item.distance_label,
        ...((item.profile_signals as string[]) || []).slice(0, 3),
        ...(item.tags || []).slice(0, 2),
      ].filter(Boolean)
    )
  );

  const handleAction = (id: string, action: "like" | "dislike" | "save" | "skip") => {
    onAction?.(id, action);
  };

  const addAsFavorite = async () => {
    if (!requireAccountForChange()) return;
    if (pendingFavorite || savedFavorite) return;
    setPendingFavorite(true);
    try {
      const current = getCoupleProfile();
      if (item.domain === "dining_out") {
        const updated = addFavoriteRestaurant(current, item.title);
        await patchCoupleProfile(updated);
      } else {
        const prefs = current.preferences || {};
        const existingPlaces = prefs.favorite_places || [];
        if (!existingPlaces.includes(item.title)) {
          await patchCoupleProfile({
            ...current,
            preferences: {
              ...prefs,
              favorite_places: [item.title, ...existingPlaces],
            },
          });
        }
      }
      await sendFeedback(userId, item.id, "favorite", {
        title: item.title,
        tags: item.tags,
        domain: item.domain,
        category: item.category,
        neighborhood: item.neighborhood || undefined,
      });
      setSavedFavorite(true);
      queryClient.invalidateQueries({ queryKey: ["couple-me"] });
      queryClient.invalidateQueries({ queryKey: ["recommendation-sources"] });
    } finally {
      setPendingFavorite(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/65 p-0 backdrop-blur-md sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-[1.75rem] bg-[#0a121c] shadow-float ring-1 ring-white/[0.1] sm:max-h-[88vh] sm:rounded-[1.75rem]"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={item.title}
      >
        <div className="flex shrink-0 justify-center pt-3 sm:hidden">
          <div className="h-1 w-10 rounded-full bg-white/15" aria-hidden />
        </div>

        <div className="flex shrink-0 items-center justify-between border-b border-white/[0.06] px-5 py-3.5">
          <div className="flex items-center gap-2">
            <BrainCircuit className="h-4 w-4 text-[#f4d06f]" />
            <p className="text-sm font-semibold text-white">{item.category === "movie" || item.category === "series" ? "Filme & onde assistir" : "Detalhes da experiência"}</p>
          </div>
          <button type="button" onClick={onClose} className="btn-ghost px-3 py-1.5 text-xs">
            Fechar
          </button>
        </div>

        <div className="overflow-y-auto overscroll-contain">
          {matchReason ? (
            <div className="border-b border-white/[0.06] bg-gradient-to-r from-[#ff7a59]/[0.06] to-[#f4d06f]/[0.04] px-5 py-4">
              <div className="flex items-center justify-between gap-2">
                <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#f4d06f]">
                  <Sparkles className="h-3 w-3" />
                  Por que o algoritmo escolheu para vocês
                </p>
                {item.quality_score != null ? (
                  <span className="rounded-full bg-[#f4d06f]/15 px-2.5 py-0.5 text-[11px] font-semibold text-[#f4d06f]">
                    Score Neural: {Math.round(item.quality_score)}/100
                  </span>
                ) : null}
              </div>
              <p className="mt-2 text-sm leading-relaxed text-white/85">{matchReason}</p>
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

          <DiscoveryCard key={item.id} item={item} userId={userId} onAction={handleAction} />
          {item.category === "movie" || item.category === "series" ? <WatchAvailability key={`${item.category}-${item.id}`} item={item} /> : null}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] px-5 py-4">
            <p className="text-xs text-white/60">
              Fixar como referência permanente do casal para calibrar futuras recomendações:
            </p>
            <button
              type="button"
              disabled={savedFavorite || pendingFavorite}
              onClick={() => void addAsFavorite()}
              className="btn-ghost gap-1.5 border-[#f4d06f]/30 text-xs text-[#f4d06f] hover:border-[#f4d06f]/60 disabled:opacity-50"
            >
              <Star className="h-3.5 w-3.5" fill={savedFavorite ? "currentColor" : "none"} />
              <span>{savedFavorite ? "✓ Fixado nos favoritos do casal" : "Fixar como favorito do casal"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
