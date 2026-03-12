"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useMotionValue, useTransform } from "framer-motion";

import { sendFeedback } from "../../lib/api";
import { upsertAgendaItem, upsertSavedItem } from "../../lib/storage";
import { Recommendation } from "../../lib/types";
import ExperienceImage from "./experience-image";

type ActionType = "like" | "dislike" | "save" | "skip";

function formatMoment(value?: string | null) {
  if (!value) return "Horário flexível";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
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
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-250, 250], [-8, 8]);
  const opacity = useTransform(x, [-250, -100, 0, 100, 250], [0.35, 1, 1, 1, 0.35]);
  const [status, setStatus] = useState<string>("");

  const openSource = () => {
    if (typeof window === "undefined") return;
    if (item.url) {
      window.open(item.url, "_blank", "noopener,noreferrer");
      return;
    }
    const query = encodeURIComponent(`${item.location || item.title}, ${item.city}`);
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, "_blank", "noopener,noreferrer");
  };

  const submit = async (action: ActionType) => {
    setStatus(
      action === "save" ? "Salvo na coleção" : action === "like" ? "Marcado como boa opção" : action === "dislike" ? "Removido do feed" : ""
    );
    await sendFeedback(userId, item.id, action === "skip" ? "skip" : action);

    if (action === "save") {
      upsertSavedItem(item);
      upsertAgendaItem(item);
    }

    onAction?.(item, action);
  };

  const onDragEnd = async (_: any, info: any) => {
    if (info.offset.x > 120) await submit("like");
    if (info.offset.x < -120) await submit("dislike");
  };

  return (
    <motion.article
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      style={{ x, rotate, opacity }}
      onDragEnd={onDragEnd}
      whileHover={{ scale: 1.01 }}
      className="glass overflow-hidden rounded-[1.75rem]"
    >
      <button onClick={openSource} className="block w-full text-left" title="Abrir fonte oficial ou mapa">
        <ExperienceImage item={item} />
      </button>

      <div className="space-y-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <button onClick={openSource} className="text-left">
              <h3 className="text-lg font-semibold hover:text-[#ffd166]">{item.title}</h3>
            </button>
            <p className="text-xs text-white/70">{item.location || item.city} • {formatMoment(item.start_time)}</p>
          </div>
          <span className="rounded-full bg-white/10 px-2 py-1 text-xs capitalize">{item.category}</span>
        </div>

        <p className="text-sm text-white/74">{item.reason || item.description}</p>

        <div className="flex flex-wrap gap-2">
          {(item.tags || []).slice(0, 4).map((tag) => (
            <span key={tag} className="rounded-full bg-white/10 px-2 py-1 text-xs">#{tag}</span>
          ))}
        </div>

        <div className="flex items-center justify-between gap-3 text-xs text-white/55">
          <p>Fonte: {item.source || "desconhecida"}</p>
          {item.price != null ? <p>{item.price === 0 ? "Grátis" : `R$ ${item.price}`}</p> : null}
        </div>
        {status ? <p className="text-xs text-[#ffd166]">{status}</p> : null}

        <div className="grid grid-cols-4 gap-2">
          <button onClick={() => submit("like")} className="rounded-xl bg-[#ff7a59] p-2 text-xs text-white">Gostei</button>
          <button onClick={() => submit("dislike")} className="rounded-xl bg-white/10 p-2 text-xs">Ocultar</button>
          <button onClick={() => submit("save")} className="rounded-xl bg-[#ffd166] p-2 text-xs text-black">Salvar</button>
          <button onClick={openSource} className="rounded-xl bg-white/10 p-2 text-xs">Abrir</button>
        </div>

        <button
          onClick={() => router.push(`/map?focus=${encodeURIComponent(item.title)}`)}
          className="w-full rounded-xl border border-white/10 bg-white/5 p-2 text-xs text-white/85"
        >
          Ver no mapa
        </button>
      </div>
    </motion.article>
  );
}
