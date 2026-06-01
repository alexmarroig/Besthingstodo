"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import MediaTile, { MediaTileVariant } from "./media-tile";
import { Recommendation } from "@life/shared-types";

function ChevronIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={`h-5 w-5 ${direction === "left" ? "" : "rotate-180"}`}
      aria-hidden
    >
      <path d="M14 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function MediaRail({
  title,
  subtitle,
  items,
  onOpen,
  variant = "landscape",
}: {
  title: string;
  subtitle?: string;
  items: Recommendation[];
  onOpen: (item: Recommendation) => void;
  variant?: MediaTileVariant;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const refreshScrollState = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    setCanScrollLeft(el.scrollLeft > 8);
    setCanScrollRight(maxScroll - el.scrollLeft > 8);
  }, []);

  const scrollByPage = (direction: -1 | 1) => {
    const el = trackRef.current;
    if (!el) return;
    const amount = Math.max(el.clientWidth * 0.82, 280);
    el.scrollBy({ left: direction * amount, behavior: "smooth" });
    window.setTimeout(refreshScrollState, 320);
  };

  useEffect(() => {
    refreshScrollState();
    const el = trackRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => refreshScrollState());
    observer.observe(el);
    return () => observer.disconnect();
  }, [items, refreshScrollState]);

  if (!items.length) return null;

  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between gap-4 pr-1">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.28em] text-[#f4d06f] sm:text-[13px]">{title}</p>
          {subtitle ? <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-white/62 sm:text-[15px]">{subtitle}</p> : null}
        </div>
        <p className="hidden shrink-0 text-xs text-white/40 sm:block">{items.length} opções · arraste ou use as setas</p>
      </div>

      <div className="relative">
        {canScrollLeft ? (
          <div className="pointer-events-none absolute inset-y-0 left-0 z-[1] w-12 bg-gradient-to-r from-[#06111d] to-transparent" />
        ) : null}
        {canScrollRight ? (
          <div className="pointer-events-none absolute inset-y-0 right-0 z-[1] w-12 bg-gradient-to-l from-[#06111d] to-transparent" />
        ) : null}

        {canScrollLeft ? (
          <button
            type="button"
            aria-label="Ver anteriores"
            onClick={() => scrollByPage(-1)}
            className="absolute left-0 top-[34%] z-[2] flex -translate-y-1/2 rounded-full border border-white/12 bg-[#0b1827]/95 p-2 text-white shadow-lg backdrop-blur-md transition hover:border-[#f97352]/40 hover:bg-[#0f2138] sm:left-1 sm:p-2.5"
          >
            <ChevronIcon direction="left" />
          </button>
        ) : null}

        {canScrollRight ? (
          <button
            type="button"
            aria-label="Ver próximos"
            onClick={() => scrollByPage(1)}
            className="absolute right-0 top-[34%] z-[2] flex -translate-y-1/2 rounded-full border border-white/12 bg-[#0b1827]/95 p-2 text-white shadow-lg backdrop-blur-md transition hover:border-[#f97352]/40 hover:bg-[#0f2138] sm:right-1 sm:p-2.5"
          >
            <ChevronIcon direction="right" />
          </button>
        ) : null}

        <div
          ref={trackRef}
          onScroll={refreshScrollState}
          className="carousel-track flex gap-4 overflow-x-auto pb-3 pl-0.5 pr-2 pt-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {items.map((item) => (
            <MediaTile key={item.id} item={item} onOpen={onOpen} variant={variant} />
          ))}
        </div>
      </div>
    </section>
  );
}
