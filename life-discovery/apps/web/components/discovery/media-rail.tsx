"use client";

import MediaTile from "./media-tile";
import { Recommendation } from "@life/shared-types";

export default function MediaRail({
  title,
  subtitle,
  items,
  onOpen,
}: {
  title: string;
  subtitle?: string;
  items: Recommendation[];
  onOpen: (item: Recommendation) => void;
}) {
  if (!items.length) return null;

  return (
    <section className="space-y-3">
      <div>
        <p className="text-[11px] uppercase tracking-[0.32em] text-[#f4d06f]">{title}</p>
        {subtitle ? <p className="mt-1 text-sm text-white/60">{subtitle}</p> : null}
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((item) => (
          <MediaTile key={item.id} item={item} onOpen={onOpen} />
        ))}
      </div>
    </section>
  );
}
