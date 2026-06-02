"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import MediaTile, { MediaTileVariant } from "./media-tile";
import MediaTileSkeleton from "./media-tile-skeleton";
import { Recommendation } from "@life/shared-types";

function ChevronIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={`h-4 w-4 ${direction === "left" ? "" : "rotate-180"}`}
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
  loading = false,
  className = "",
}: {
  title: string;
  subtitle?: string;
  items: Recommendation[];
  onOpen: (item: Recommendation) => void;
  variant?: MediaTileVariant;
  loading?: boolean;
  className?: string;
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
    const amount = Math.max(el.clientWidth * 0.75, 220);
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

  if (loading && !items.length) {
    return (
      <section className={`space-y-3 ${className}`} aria-busy="true">
        <div className="flex items-center gap-3">
          <div className="rail-accent" />
          <div className="shimmer h-5 w-36 rounded-md" />
        </div>
        <div className="flex gap-2.5 overflow-hidden pb-1 pl-1">
          {Array.from({ length: 4 }).map((_, index) => (
            <MediaTileSkeleton key={`${title}-sk-${index}`} variant={variant} />
          ))}
        </div>
      </section>
    );
  }

  if (!items.length) return null;

  return (
    <section className={`space-y-3 ${className}`}>
      <div className="flex items-end justify-between gap-3 pr-1">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-3">
            <div className="rail-accent" />
            <h3 className="rail-title">{title}</h3>
          </div>
          {subtitle ? <p className="hidden max-w-lg text-sm text-white/45 sm:block">{subtitle}</p> : null}
        </div>
        <span className="shrink-0 rounded-full bg-white/[0.04] px-2.5 py-1 text-[10px] font-medium text-white/40">
          {items.length}
        </span>
      </div>

      <div className="relative -mx-1 px-1">
        {canScrollLeft ? (
          <div className="pointer-events-none absolute inset-y-0 left-0 z-[1] w-10 bg-gradient-to-r from-[#060d16] to-transparent" />
        ) : null}
        {canScrollRight ? (
          <div className="pointer-events-none absolute inset-y-0 right-0 z-[1] w-10 bg-gradient-to-l from-[#060d16] to-transparent" />
        ) : null}

        {canScrollLeft ? (
          <button
            type="button"
            aria-label="Ver anteriores"
            onClick={() => scrollByPage(-1)}
            className="absolute left-0 top-[30%] z-[2] hidden -translate-y-1/2 rounded-full border border-white/10 bg-[#0c1624]/90 p-2 text-white shadow-card backdrop-blur-md transition hover:border-[#ff7a59]/30 sm:flex"
          >
            <ChevronIcon direction="left" />
          </button>
        ) : null}

        {canScrollRight ? (
          <button
            type="button"
            aria-label="Ver próximos"
            onClick={() => scrollByPage(1)}
            className="absolute right-0 top-[30%] z-[2] hidden -translate-y-1/2 rounded-full border border-white/10 bg-[#0c1624]/90 p-2 text-white shadow-card backdrop-blur-md transition hover:border-[#ff7a59]/30 sm:flex"
          >
            <ChevronIcon direction="right" />
          </button>
        ) : null}

        <div
          ref={trackRef}
          onScroll={refreshScrollState}
          className="carousel-track flex gap-2.5 overflow-x-auto pb-2 pt-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {items.map((item) => (
            <MediaTile key={item.id} item={item} onOpen={onOpen} variant={variant} />
          ))}
        </div>
      </div>
    </section>
  );
}
