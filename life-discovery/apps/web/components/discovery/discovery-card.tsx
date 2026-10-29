"use client";

import { useState } from "react";
import { motion } from "framer-motion";

import ExperienceImage from "./experience-image";
import { getRecommendationSourceMeta } from "@/shared/source";
import { localizeCategory, localizeTags } from "@/shared/labels-pt";
import { sendFeedback } from "@/shared/api/client";
import { isItemSaved, upsertSavedItem, upsertAgendaItem } from "@/shared/storage";
import { Recommendation } from "@life/shared-types";

function ActionButton({
  icon,
  label,
  onClick,
  variant,
  active = false,
}: {
  icon: string;
  label: string;
  onClick: () => void;
  variant?: string;
  active?: boolean;
}) {
  const base = "flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-medium transition duration-200";
  const styles: Record<string, string> = {
    like: active
      ? `${base} bg-[#f97352] text-white shadow-md`
      : `${base} bg-[#f97352]/15 text-[#f97352] hover:bg-[#f97352]/25`,
    save: active
      ? `${base} bg-[#f4d06f] text-black shadow-md`
      : `${base} bg-[#f4d06f]/15 text-[#f4d06f] hover:bg-[#f4d06f]/25`,
    map: `${base} bg-[#38bdf8]/15 text-[#38bdf8] hover:bg-[#38bdf8]/25`,
    skip: `${base} bg-white/8 text-white/50 hover:bg-white/15 hover:text-white/70`,
  };
  return (
    <button type="button" onClick={onClick} className={styles[variant || "skip"]}>
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
  const source = getRecommendationSourceMeta(item);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(() => isItemSaved(item.id));

  const feedbackMeta = {
    title: item.title,
    tags: item.tags,
    domain: item.domain,
    category: item.category,
    neighborhood: item.neighborhood || undefined,
    location: item.location,
    price: item.price,
    indoor_outdoor: item.indoor_outdoor,
  };

  const handleAction = (action: "like" | "dislike" | "save" | "skip") => {
    void sendFeedback(userId, item.id, action, feedbackMeta);
    if (action === "save") {
      upsertSavedItem(item);
      setSaved(true);
    }
    if (action === "like") {
      upsertAgendaItem(item);
      setLiked(true);
    }
    onAction?.(item.id, action);
  };

  const handleCtaClick = (kind: string) => {
    void sendFeedback(userId, item.id, "click_cta", {
      ...feedbackMeta,
      decision: kind,
    });
  };

  const externalUrl = item.booking_url || item.url;
  const mapQuery =
    item.latitude && item.longitude
      ? `${item.latitude},${item.longitude}`
      : encodeURIComponent(`${item.title} ${item.neighborhood || ""} ${item.city || "São Paulo"}`);

  const matchPercent =
    item.quality_score != null && item.quality_score > 0
      ? Math.round(item.quality_score)
      : item.score != null && item.score > 0
        ? Math.round(item.score * 10)
        : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: "easeOut" }}
      className="card-hover editorial-card group overflow-hidden rounded-[1.5rem]"
    >
      {/* Image Section */}
      <div className="relative aspect-video w-full overflow-hidden bg-black/20">
        <ExperienceImage item={item} mode="hero" className="h-full w-full" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />

        {/* Score badge */}
        {matchPercent != null && (
          <div className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-black/65 px-3 py-1 backdrop-blur-md ring-1 ring-white/15">
            <span className="text-xs font-semibold text-[#f4d06f]">{matchPercent}% match</span>
          </div>
        )}

        {/* Category badge */}
        <div className="absolute left-3 top-3">
          <span className="rounded-full bg-black/55 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-white/90 backdrop-blur-md">
            {localizeCategory(item.category)}
          </span>
        </div>

        {/* Title on image */}
        <div className="absolute bottom-3 left-4 right-4">
          <h3 className="text-xl font-semibold leading-tight text-white drop-shadow-lg">{item.title}</h3>
          {(item.neighborhood || item.location) && (
            <p className="mt-1 flex items-center gap-1 text-xs text-white/75">
              <span>📍</span> {item.neighborhood || item.location}
              {item.distance_label && <span className="text-white/55">· {item.distance_label}</span>}
            </p>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="space-y-3 p-5">
        {item.description && (
          <p className="line-clamp-3 text-sm leading-relaxed text-white/72">{item.description}</p>
        )}

        {/* Personalization / Fit */}
        {(item.couple_fit_reason || item.personalization_label) && (
          <div className="rounded-xl border border-[#f4d06f]/20 bg-[#f4d06f]/[0.06] px-3.5 py-2.5">
            <p className="text-xs leading-relaxed text-[#f4d06f]">
              ✨ {item.couple_fit_reason || item.personalization_label}
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
          {item.price === 0 && (
            <span className="rounded-full bg-emerald-500/12 px-2.5 py-1 text-[11px] font-medium text-emerald-400">
              Gratuito / Livre
            </span>
          )}
          {item.start_time && (
            <span className="rounded-full bg-[#38bdf8]/12 px-2.5 py-1 text-[11px] text-[#38bdf8]">
              {new Date(item.start_time).toLocaleDateString("pt-BR", { day: "numeric", month: "short" })}
            </span>
          )}
          <span className="rounded-full bg-white/6 px-2.5 py-1 text-[11px] text-white/55">
            {source.badge}
          </span>
        </div>

        {/* Tags */}
        {item.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {localizeTags(item.tags)
              .slice(0, 5)
              .map((tag) => (
                <span key={tag} className="rounded-full border border-white/10 px-2.5 py-0.5 text-[10px] text-white/55">
                  {tag}
                </span>
              ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-2 border-t border-white/8 pt-3.5">
          <ActionButton
            icon="✓"
            label={liked ? "Curtido (IA +)" : "Curtir"}
            onClick={() => handleAction("like")}
            variant="like"
            active={liked}
          />
          <ActionButton
            icon="♡"
            label={saved ? "Salvo" : "Salvar"}
            onClick={() => handleAction("save")}
            variant="save"
            active={saved}
          />
          {(item.latitude || item.city) && (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${mapQuery}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => handleCtaClick("map")}
              className="flex items-center gap-1.5 rounded-full bg-[#38bdf8]/15 px-3.5 py-2 text-xs font-medium text-[#38bdf8] transition hover:bg-[#38bdf8]/25"
            >
              <span>📍</span>
              <span>Mapa</span>
            </a>
          )}
          {externalUrl && (
            <a
              href={externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => handleCtaClick("external_url")}
              className="flex items-center gap-1.5 rounded-full bg-white/8 px-3.5 py-2 text-xs font-medium text-white/70 transition hover:bg-white/15 hover:text-white"
            >
              <span>↗</span>
              <span>Fonte oficial</span>
            </a>
          )}
          <ActionButton icon="✕" label="Ocultar" onClick={() => handleAction("dislike")} variant="skip" />
        </div>
      </div>
    </motion.div>
  );
}
