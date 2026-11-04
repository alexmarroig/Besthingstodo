"use client";

import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Star } from "lucide-react";

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
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    setSavedFavorite(false);
    setPendingFavorite(false);
    if (!item) return;

    openedAtRef.current = Date.now();
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
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

    // Keep keyboard focus inside the dialog, and restore it when closed.
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); closeRef.current(); return; }
      if (e.key !== "Tab" || !dialogRef.current) return;
      const elements = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )).filter((element) => element.getClientRects().length > 0);
      if (!elements.length) { e.preventDefault(); return; }
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus({ preventScroll: true });
      const dwellMs = Date.now() - openedAtRef.current;
      if (dwellMs >= 4200) {
        void sendFeedback(userId, item.id, "dwell", {
          ...meta,
          dwell_ms: dwellMs,
        });
      }
    };
  }, [item, userId]);

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
        ref={dialogRef}
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
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[#e7c994]" />
            <p className="text-sm font-semibold text-white">{item.category === "movie" || item.category === "series" ? "Filme & onde assistir" : "Detalhes da experiência"}</p>
          </div>
          <button type="button" onClick={onClose} className="btn-ghost min-h-11 px-4 text-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#e7c994]">
            Fechar
          </button>
        </div>

        <div className="overflow-y-auto overscroll-contain">
          {matchReason ? (
            <div className="border-b border-white/[0.06] bg-white/[0.025] px-5 py-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold tracking-[0.02em] text-[#e7c994]">Por que sugerimos este lugar</p>
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
              Gostou desta experiência? Ela pode orientar suas próximas sugestões.
            </p>
            <button
              type="button"
              disabled={savedFavorite || pendingFavorite}
              onClick={() => void addAsFavorite()}
              className="btn-ghost gap-1.5 border-[#d9b879]/30 text-xs text-[#e7c994] hover:border-[#d9b879]/60 disabled:opacity-50"
            >
              <Star className="h-3.5 w-3.5" fill={savedFavorite ? "currentColor" : "none"} />
              <span>{savedFavorite ? "Adicionado aos favoritos" : "Marcar como favorito"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
