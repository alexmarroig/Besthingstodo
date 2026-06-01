"use client";

import DiscoveryCard from "./discovery-card";
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
  if (!item) return null;

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
        <DiscoveryCard item={item} userId={userId} onAction={onAction} />
      </div>
    </div>
  );
}
