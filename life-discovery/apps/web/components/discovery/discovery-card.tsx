"use client";

import { motion, useMotionValue, useTransform } from "framer-motion";

import { sendFeedback } from "../../lib/api";
import { setSavedItems, getSavedItems } from "../../lib/storage";
import { Recommendation } from "../../lib/types";

export default function DiscoveryCard({ item, userId }: { item: Recommendation; userId: string }) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-250, 250], [-10, 10]);
  const opacity = useTransform(x, [-250, -100, 0, 100, 250], [0.3, 1, 1, 1, 0.3]);

  const onDragEnd = async (_: any, info: any) => {
    if (info.offset.x > 120) {
      await sendFeedback(userId, item.id, "like");
    }
    if (info.offset.x < -120) {
      await sendFeedback(userId, item.id, "dislike");
    }
  };

  const save = async () => {
    await sendFeedback(userId, item.id, "save");
    const curr = getSavedItems();
    if (!curr.find((x: Recommendation) => x.id === item.id)) {
      setSavedItems([item, ...curr]);
    }
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
      <div className="h-40 bg-gradient-to-br from-primary/40 to-accent/30" />
      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold">{item.title}</h3>
            <p className="text-xs text-white/70">{item.location || item.city} • {item.start_time || "Tonight"}</p>
          </div>
          <span className="rounded-full bg-white/10 px-2 py-1 text-xs">{item.category}</span>
        </div>

        <p className="text-sm text-white/70">{item.reason || item.description}</p>

        <div className="flex flex-wrap gap-2">
          {(item.tags || []).slice(0, 4).map((tag) => (
            <span key={tag} className="rounded-full bg-white/10 px-2 py-1 text-xs">#{tag}</span>
          ))}
        </div>

        <div className="grid grid-cols-4 gap-2">
          <button onClick={() => sendFeedback(userId, item.id, "like")} className="rounded-xl bg-primary p-2 text-xs">Like</button>
          <button onClick={() => sendFeedback(userId, item.id, "dislike")} className="rounded-xl bg-white/10 p-2 text-xs">Dislike</button>
          <button onClick={save} className="rounded-xl bg-accent p-2 text-xs text-black">Save</button>
          <button className="rounded-xl bg-white/10 p-2 text-xs">Map</button>
        </div>
      </div>
    </motion.article>
  );
}

