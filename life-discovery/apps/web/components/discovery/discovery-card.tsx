"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";

import ExperienceImage from "./experience-image";
import { getRecommendationSourceMeta } from "@/shared/source";
import { sendFeedback } from "@/shared/api/client";
import { upsertSavedItem, upsertAgendaItem } from "@/shared/storage";
import { Recommendation } from "@life/shared-types";

function ActionButton({ icon, label, onClick, variant }: { icon: string; label: string; onClick: () => void; variant?: string }) {
  const base = "flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium transition duration-200";
  const styles: Record<string, string> = {
    like: `${base} bg-[#f97352]/15 text-[#f97352] hover:bg-[#f97352]/25`,
    save: `${base} bg-[#f4d06f]/15 text-[#f4d06f] hover:bg-[#f4d06f]/25`,
    map: `${base} bg-[#38bdf8]/15 text-[#38bdf8] hover:bg-[#38bdf8]/25`,
    skip: `${base} bg-white/8 text-white/50 hover:bg-white/15 hover:text-white/70`,
  };
  return (
    <button onClick={onClick} className={styles[variant || "skip"]}>
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

export default function DiscoveryCard({
  item,
  userId,
  onAction,
}: {
  item: Recommendation;
  userId: string;
  onAction?: (id: string, action: "like" | "dislike" | "save" | "skip") => void;
}) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const source = getRecommendationSourceMeta(item);
  const hasImage = Boolean(item.image_url);

  const handleAction = (action: "like" | "dislike" | "save" | "skip") => {
    sendFeedback(userId, item.id, action);
    if (action === "save") upsertSavedItem(item);
    if (action === "like") upsertAgendaItem(item);
    onAction?.(item.id, action);
  };

  const externalUrl = item.booking_url || item.url;
  const mapQuery = item.latitude && item.longitude
    ? `${item.latitude},${item.longitude}`
    : encodeURIComponent(`${item.title} ${item.city || ""}`);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="card-hover editorial-card group overflow-hidden rounded-[1.5rem]"
    >
      {/* Image Section */}
      <div className="relative aspect-video w-full overflow-hidden bg-black/20">
        {!imgLoaded && hasImage && (
          <div className="skeleton absolute inset-0" />
        )}
        {hasImage ? (
          <img
            src={item.image_url!}
            alt={item.title}
            className={`h-full w-full object-cover transition-all duration-500 group-hover:scale-105 ${imgLoaded ? "opacity-100" : "opacity-0"}`}
            onLoad={() => setImgLoaded(true)}
            loading="lazy"
          />
        ) : (
          <ExperienceImage item={item} className="h-full w-full" />
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

        {/* Score badge */}
        {item.score != null && item.score > 0 && (
          <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 backdrop-blur-sm">
            <span className="text-sm">⭐</span>
            <span className="text-xs font-semibold text-white">{Number(item.score).toFixed(1)}</span>
          </div>
        )}

        {/* Category badge */}
        <div className="absolute left-3 top-3">
          <span className="rounded-full bg-white/12 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-white/90 backdrop-blur-sm">
            {item.category}
          </span>
        </div>

        {/* Title on image */}
        <div className="absolute bottom-3 left-4 right-4">
          <h3 className="text-xl font-semibold leading-tight text-white drop-shadow-lg">{item.title}</h3>
          {item.location && (
            <p className="mt-1 flex items-center gap-1 text-xs text-white/70">
              <span>📍</span> {item.location}
              {item.distance_label && <span className="text-white/50">· {item.distance_label}</span>}
            </p>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="space-y-3 p-5">
        {/* Description */}
        {item.description && (
          <p className="line-clamp-2 text-sm leading-relaxed text-white/68">{item.description}</p>
        )}

        {/* Personalization / Fit */}
        {(item.personalization_label || item.couple_fit_reason) && (
          <div className="rounded-xl bg-white/5 px-3 py-2">
            <p className="text-xs text-[#f4d06f]/90">
              {item.personalization_label || item.couple_fit_reason}
            </p>
          </div>
        )}

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-2">
          {item.price != null && item.price > 0 && (
            <span className="rounded-full bg-emerald-500/12 px-2.5 py-1 text-[11px] font-medium text-emerald-400">
              R$ {item.price}
            </span>
          )}
          {item.start_time && (
            <span className="rounded-full bg-[#38bdf8]/12 px-2.5 py-1 text-[11px] text-[#38bdf8]">
              {new Date(item.start_time).toLocaleDateString("pt-BR", { day: "numeric", month: "short" })}
            </span>
          )}
          <span className="rounded-full bg-white/6 px-2.5 py-1 text-[11px] text-white/50">
            {source.badge}
          </span>
        </div>

        {/* Tags */}
        {item.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {item.tags.slice(0, 4).map((tag) => (
              <span key={tag} className="rounded-full border border-white/8 px-2.5 py-0.5 text-[10px] text-white/50">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-2 border-t border-white/6 pt-3">
          <ActionButton icon="✓" label="Entrou" onClick={() => handleAction("like")} variant="like" />
          <ActionButton icon="♡" label="Salvar" onClick={() => handleAction("save")} variant="save" />
          {(item.latitude || item.city) && (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${mapQuery}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-full bg-[#38bdf8]/15 px-3 py-2 text-xs font-medium text-[#38bdf8] transition hover:bg-[#38bdf8]/25"
            >
              <span>📍</span>
              <span>Ver bairro</span>
            </a>
          )}
          {externalUrl && (
            <a
              href={externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-full bg-white/8 px-3 py-2 text-xs font-medium text-white/60 transition hover:bg-white/15 hover:text-white/80"
            >
              <span>↗</span>
              <span>Abrir</span>
            </a>
          )}
          <ActionButton icon="✕" label="Não agora" onClick={() => handleAction("dislike")} variant="skip" />
        </div>
      </div>
    </motion.div>
  );
}
