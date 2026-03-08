"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useMotionValue, useTransform } from "framer-motion";

import { sendFeedback } from "../../lib/api";
import { upsertAgendaItem, upsertSavedItem } from "../../lib/storage";
import { Recommendation } from "../../lib/types";
import ExperienceImage from "./experience-image";

type ActionType = "like" | "dislike" | "save" | "skip";

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
  const rotate = useTransform(x, [-250, 250], [-10, 10]);
  const opacity = useTransform(x, [-250, -100, 0, 100, 250], [0.3, 1, 1, 1, 0.3]);
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
    setStatus(action === "save" ? "Salvo" : action === "like" ? "Curtido" : action === "dislike" ? "Ocultado" : "");
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
      className="glass overflow-hidden rounded-3xl"
    >
      <button onClick={openSource} className="block w-full text-left" title="Abrir fonte oficial ou mapa">
        <ExperienceImage item={item} />
      </button>

      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <button onClick={openSource} className="text-left">
              <h3 className="text-lg font-semibold hover:text-accent">{item.title}</h3>
            </button>
            <p className="text-xs text-white/70">{item.location || item.city} • {item.start_time || "Horário não informado"}</p>
          </div>
          <span className="rounded-full bg-white/10 px-2 py-1 text-xs">{item.category}</span>
        </div>

        <p className="text-sm text-white/70">{item.reason || item.description}</p>

        <div className="flex flex-wrap gap-2">
          {(item.tags || []).slice(0, 4).map((tag) => (
            <span key={tag} className="rounded-full bg-white/10 px-2 py-1 text-xs">#{tag}</span>
          ))}
        </div>

        <p className="text-xs text-white/60">Fonte: {item.source || "desconhecida"}</p>
        {status ? <p className="text-xs text-accent">{status}</p> : null}

        <div className="grid grid-cols-4 gap-2">
          <button onClick={() => submit("like")} className="rounded-xl bg-primary p-2 text-xs">Like</button>
          <button onClick={() => submit("dislike")} className="rounded-xl bg-white/10 p-2 text-xs">Dislike</button>
          <button onClick={() => submit("save")} className="rounded-xl bg-accent p-2 text-xs text-black">Save</button>
          <button onClick={openSource} className="rounded-xl bg-white/10 p-2 text-xs">Abrir</button>
        </div>

        <button
          onClick={() => router.push(`/map?focus=${encodeURIComponent(item.title)}`)}
          className="w-full rounded-xl bg-white/5 p-2 text-xs"
        >
          Ver no mapa
        </button>
      </div>
    </motion.article>
  );
}