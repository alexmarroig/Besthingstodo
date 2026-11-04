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
    const amount = Math.max(el.clientWidth * 0.82, 260);
    el.scrollBy({ left: direction * amount, behavior: "smooth" });
    window.setTimeout(refreshScrollState, 320);
  };

  useEffect(() => {
    refreshScrollState();
    const el = trackRef.current;
    if (!el) return;
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", refreshScrollState);
      return () => window.removeEventListener("resize", refreshScrollState);
    }
    const observer = new ResizeObserver(refreshScrollState);
    observer.observe(el);
    return () => observer.disconnect();
  }, [items, refreshScrollState]);

  if (loading && !items.length) {
    return (
      <section className={`space-y-4 ${className}`} aria-busy="true">
        <div className="flex items-center gap-3">
          <div className="rail-accent" />
          <div className="shimmer h-5 w-36 rounded-md" />
        </div>
        <div className="flex gap-4 overflow-hidden pb-1 pl-1">
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
          {subtitle ? <p className="max-w-xl text-xs leading-relaxed text-white/45 sm:text-[13px]">{subtitle}</p> : null}
        </div>
        <span className="shrink-0 text-[11px] font-medium tabular-nums text-white/30" aria-label={`${items.length} opções`}>{items.length.toString().padStart(2, "0")}</span>
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
            aria-label={`Ver opções anteriores em ${title}`}
            onClick={() => scrollByPage(-1)}
            className="absolute left-0 top-[34%] z-[2] hidden -translate-y-1/2 rounded-full border border-white/10 bg-[#121920]/95 p-3 text-white/80 transition hover:border-[#d7bc88]/40 sm:flex"
          >
            <ChevronIcon direction="left" />
          </button>
        ) : null}

        {canScrollRight ? (
          <button
            type="button"
            aria-label={`Ver próximas opções em ${title}`}
            onClick={() => scrollByPage(1)}
            className="absolute right-0 top-[34%] z-[2] hidden -translate-y-1/2 rounded-full border border-white/10 bg-[#121920]/95 p-3 text-white/80 transition hover:border-[#d7bc88]/40 sm:flex"
          >
            <ChevronIcon direction="right" />
          </button>
        ) : null}

        <div
          ref={trackRef}
          onScroll={refreshScrollState}
          role="region"
          aria-roledescription="carrossel"
          aria-label={`Explorar ${title}`}
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.target !== event.currentTarget) return;
            if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
              event.preventDefault();
              scrollByPage(event.key === "ArrowRight" ? 1 : -1);
            }
          }}
          className="carousel-track flex gap-4 overflow-x-auto focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e7c994] pb-2 pt-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {items.map((item) => (
            <MediaTile key={item.id} item={item} onOpen={onOpen} variant={variant} />
          ))}
        </div>
      </div>
    </section>
  );
}
