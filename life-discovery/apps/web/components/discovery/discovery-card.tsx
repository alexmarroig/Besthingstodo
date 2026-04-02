"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

import { getRecommendationSourceMeta } from "@/shared/source";
import { sendFeedback } from "../../lib/api";
import { upsertAgendaItem, upsertSavedItem } from "../../lib/storage";
import { Recommendation } from "../../lib/types";
import ExperienceImage from "./experience-image";

type ActionType = "like" | "dislike" | "save" | "skip";

function Icon({ path }: { path: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d={path} />
    </svg>
  );
}

function formatMoment(value?: string | null) {
  if (!value) return "Quando fizer sentido";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function actionClass(action: ActionType, activeAction: ActionType | null) {
  const base = "inline-flex items-center justify-center gap-2 rounded-full px-3 py-3 text-sm transition duration-200";
  if (activeAction === action) {
    return `${base} ring-2 ring-[#ffd27a]/40`;
  }

  if (action === "like") {
    return `${base} bg-[#f97352] text-white hover:-translate-y-[1px] hover:shadow-[0_16px_30px_rgba(249,115,82,0.22)]`;
  }
  if (action === "save") {
    return `${base} bg-[#f4d06f] text-[#08111f] hover:-translate-y-[1px] hover:shadow-[0_16px_30px_rgba(244,208,111,0.22)]`;
  }
  return `${base} border border-white/12 bg-white/5 text-white/74 hover:-translate-y-[1px] hover:border-white/20 hover:bg-white/9`;
}

export default function DiscoveryCard({
  item,
  userId,
  onAction
}: {
  item: Recommendation;
  userId: string;
  onAction?: (item: Recommendation, action: ActionType) => void;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<string>("");
  const [activeAction, setActiveAction] = useState<ActionType | null>(null);
  const sourceMeta = getRecommendationSourceMeta(item);

  const openSource = () => {
    if (typeof window === "undefined") return;
    const targetUrl = item.booking_url || item.url;

    if (targetUrl) {
      window.open(targetUrl, "_blank", "noopener,noreferrer");
      return;
    }

    if (item.domain === "movies_series" && (item.category === "streaming" || item.location?.toLowerCase() === "em casa")) {
      const query = encodeURIComponent(`${item.title} filme serie`);
      window.open(`https://www.google.com/search?q=${query}`, "_blank", "noopener,noreferrer");
      return;
    }

    const query = encodeURIComponent(`${item.location || item.title}, ${item.city}`);
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, "_blank", "noopener,noreferrer");
  };

  const submit = async (action: ActionType) => {
    setActiveAction(action);
    setStatus(
      action === "save"
        ? "Salvo para revisar depois"
        : action === "like"
          ? "Entrou nas melhores apostas"
          : action === "dislike"
            ? "Saiu da selecao principal"
            : ""
    );

    await sendFeedback(userId, item.id, action === "skip" ? "skip" : action, {
      reason_tags: [action === "dislike" ? "not_for_us" : "good_match"],
      context: {
        distance_label: item.distance_label,
        weather_fit: item.weather_fit,
        quality_score: item.quality_score
      }
    });

    if (action === "save") {
      upsertSavedItem(item);
      upsertAgendaItem(item);
    }

    onAction?.(item, action);
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -6, scale: 1.008 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className="group editorial-card overflow-hidden rounded-[2rem]"
    >
      <button onClick={openSource} className="block w-full text-left" title="Abrir fonte oficial ou pagina do lugar">
        <ExperienceImage item={item} />
      </button>

      <div className="space-y-4 p-5">
        <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-white/52">
          <span>{item.neighborhood || item.location || item.city}</span>
          <span>•</span>
          <span>{formatMoment(item.start_time)}</span>
          {item.distance_label ? (
            <>
              <span>•</span>
              <span>{item.distance_label}</span>
            </>
          ) : null}
        </div>

        <div className="space-y-2">
          {item.personalization_label ? (
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-[#f4d06f]/30 bg-[#f4d06f]/10 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-[#f4d06f]">
                {item.personalization_label}
              </span>
              {item.related_favorite ? <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-white/62">{item.related_favorite}</span> : null}
            </div>
          ) : null}
          <button onClick={openSource} className="text-left">
            <h3 className="text-2xl font-semibold leading-tight text-white transition hover:text-[#ffd27a]">{item.title}</h3>
          </button>
          <p className="text-sm text-white/70">{item.description || item.reason}</p>
        </div>

        <div className="rounded-[1.35rem] border border-white/10 bg-white/5 p-4 transition duration-300 group-hover:border-white/16 group-hover:bg-white/[0.08]">
          <p className="text-[11px] uppercase tracking-[0.26em] text-[#ffd27a]">Por que combina com voces</p>
          <p className="mt-2 text-sm text-white/82">{item.couple_fit_reason || item.reason || item.description}</p>
          <p className="mt-3 text-sm text-white/58">{item.weather_fit}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {(item.tags || []).slice(0, 4).map((tag) => (
            <span key={tag} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/72 transition group-hover:border-white/16 group-hover:bg-white/[0.08]">
              {tag}
            </span>
          ))}
        </div>

        <div className="flex items-center justify-between gap-3 text-sm text-white/58">
          <div className="space-y-1">
            <p className="text-white/72">{sourceMeta.label}</p>
            <p className="text-xs text-white/46">{sourceMeta.badge}</p>
          </div>
          <p>{item.price != null ? (item.price === 0 ? "Gratis" : `R$ ${item.price}`) : "Faixa a confirmar"}</p>
        </div>

        {item.avoid_reason ? <p className="text-xs text-white/45">Perde forca quando: {item.avoid_reason}</p> : null}
        {status ? <p className="text-xs text-[#ffd27a]">{status}</p> : null}

        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <motion.button whileTap={{ scale: 0.96 }} onClick={() => submit("like")} className={actionClass("like", activeAction)}>
            <Icon path="M12 20s-7-4.35-7-10a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 5.65-7 10-7 10z" />
            <span>Entrou</span>
          </motion.button>
          <motion.button whileTap={{ scale: 0.96 }} onClick={() => submit("save")} className={actionClass("save", activeAction)}>
            <Icon path="M6 4h12v16l-6-4-6 4z" />
            <span>Salvar</span>
          </motion.button>
          <motion.button whileTap={{ scale: 0.96 }} onClick={() => router.push(`/map?focus=${encodeURIComponent(item.title)}`)} className={actionClass("skip", activeAction)}>
            <Icon path="M9 18l-5 2V6l5-2 6 2 5-2v14l-5 2-6-2zM9 4v14M15 6v14" />
            <span>Ver bairro</span>
          </motion.button>
          <motion.button whileTap={{ scale: 0.96 }} onClick={() => submit("dislike")} className={actionClass("dislike", activeAction)}>
            <Icon path="M18 6L6 18M6 6l12 12" />
            <span>Nao agora</span>
          </motion.button>
        </div>
      </div>
    </motion.article>
  );
}
