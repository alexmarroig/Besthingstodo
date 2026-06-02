"use client";

import { useEffect, useMemo, useState } from "react";

import { normalizeRecommendationImageUrl } from "@/shared/recommendation-images";
import { getRecommendationSourceMeta } from "@/shared/source";
import { localizeCategory } from "@/shared/labels-pt";
import { Recommendation } from "@life/shared-types";

const fallbackThemes: Record<string, { gradient: string; eyebrow: string }> = {
  museum: { gradient: "from-[#4338ca] via-[#0f172a] to-[#f97316]", eyebrow: "Cultura em foco" },
  bookstore: { gradient: "from-[#7c2d12] via-[#111827] to-[#c084fc]", eyebrow: "Livros e conversa" },
  cinema: { gradient: "from-[#111827] via-[#1d4ed8] to-[#e11d48]", eyebrow: "Noite de cinema" },
  cafe: { gradient: "from-[#78350f] via-[#1f2937] to-[#f59e0b]", eyebrow: "Pausa gostosa" },
  dining: { gradient: "from-[#7f1d1d] via-[#1f2937] to-[#fb7185]", eyebrow: "Jantar sem pressa" },
  outdoor: { gradient: "from-[#14532d] via-[#0f172a] to-[#22c55e]", eyebrow: "Respiro na cidade" },
  editorial: { gradient: "from-[#1d4ed8] via-[#0f172a] to-[#f97316]", eyebrow: "Radar da noite" },
};

export default function ExperienceImage({
  item,
  className = "",
  mode = "full",
}: {
  item: Recommendation;
  className?: string;
  mode?: "full" | "tile" | "hero";
}) {
  const theme = fallbackThemes[item.image_fallback_key || "editorial"] || fallbackThemes.editorial;
  const sourceMeta = getRecommendationSourceMeta(item);
  const directImage = normalizeRecommendationImageUrl(item.image_url);
  const [resolvedImage, setResolvedImage] = useState<string | null>(directImage);
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [resolving, setResolving] = useState(!directImage);

  const imageResolverUrl = useMemo(() => {
    if (directImage) return directImage;

    const params = new URLSearchParams({
      title: item.title,
      location: item.location || item.neighborhood || "",
      city: item.city || "Sao Paulo",
      domain: item.domain || "",
      id: item.id || "",
    });
    if (item.neighborhood) params.set("neighborhood", item.neighborhood);
    const target = item.booking_url || item.url;
    if (target) params.set("target", target);
    return `/api/editorial-image?${params.toString()}`;
  }, [directImage, item.booking_url, item.city, item.domain, item.id, item.location, item.neighborhood, item.title, item.url]);

  useEffect(() => {
    let active = true;
    setFailed(false);
    setLoaded(false);

    if (directImage) {
      setResolvedImage(directImage);
      setResolving(false);
      return () => {
        active = false;
      };
    }

    setResolving(true);
    fetch(imageResolverUrl, { cache: "force-cache" })
      .then((res) => (res.ok ? res.json() : { url: null }))
      .then((payload) => {
        if (!active) return;
        setResolvedImage(normalizeRecommendationImageUrl(payload?.url) || null);
      })
      .catch(() => {
        if (!active) return;
        setResolvedImage(null);
      })
      .finally(() => {
        if (!active) return;
        setResolving(false);
      });

    return () => {
      active = false;
    };
  }, [directImage, imageResolverUrl]);

  const rootClass = className ? `relative overflow-hidden ${className}` : "relative h-52 overflow-hidden";
  const showImage = Boolean(resolvedImage) && !failed;
  const isCompact = mode === "tile";
  const showShimmer = resolving || (showImage && !loaded);

  const overlayBadges = (
    <>
      <div className="absolute inset-x-0 top-0 flex items-start justify-between p-3">
        <span className="rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-white/90 backdrop-blur-sm">
          {localizeCategory(item.category)}
        </span>
        {item.quality_score != null && item.quality_score > 0 ? (
          <span className="ifood-chip rounded-full px-2.5 py-1 text-[10px] font-semibold backdrop-blur-sm">
            Match {Math.round(item.quality_score)}%
          </span>
        ) : item.score != null && item.score > 0 ? (
          <span className="rounded-full bg-black/55 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-sm">
            {Number(item.score).toFixed(1)}
          </span>
        ) : null}
      </div>
    </>
  );

  if (showImage) {
    return (
      <div className={rootClass}>
        {showShimmer ? <div className="absolute inset-0 shimmer" aria-hidden /> : null}
        <img
          src={resolvedImage!}
          alt={item.title}
          className={`absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.04] ${
            loaded ? "opacity-100" : "opacity-0"
          }`}
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => {
            setFailed(true);
            setLoaded(true);
          }}
        />
        <div
          className={`absolute inset-0 bg-gradient-to-t ${
            isCompact ? "from-black/78 via-black/12 to-transparent" : "from-[#04101d]/90 via-black/25 to-black/10"
          }`}
        />
        {!isCompact && mode !== "hero" ? (
          <>
            <div className="absolute inset-x-0 top-0 flex items-center justify-between px-4 py-4 text-xs text-white/84">
              <span className="rounded-full border border-white/15 bg-black/30 px-3 py-1 backdrop-blur-md">{sourceMeta.label}</span>
              <span className="rounded-full border border-white/10 bg-black/22 px-3 py-1 backdrop-blur-md">{sourceMeta.badge}</span>
            </div>
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-between px-4 py-3 text-xs text-white/80">
              <span>{item.neighborhood || item.location || item.city}</span>
            </div>
          </>
        ) : (
          overlayBadges
        )}
      </div>
    );
  }

  if (isCompact || mode === "hero") {
    return (
      <div className={`${rootClass} bg-gradient-to-br ${sourceMeta.gradient || theme.gradient}`}>
        {resolving ? <div className="absolute inset-0 shimmer opacity-70" aria-hidden /> : null}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.16),transparent_35%)]" />
        {overlayBadges}
        {mode === "hero" ? (
          <div className="absolute inset-x-0 bottom-0 p-4">
            <p className="text-[10px] uppercase tracking-[0.24em] text-white/65">{sourceMeta.eyebrow || theme.eyebrow}</p>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className={`${rootClass} bg-gradient-to-br ${sourceMeta.gradient || theme.gradient}`}>
      {resolving ? <div className="absolute inset-0 shimmer opacity-70" aria-hidden /> : null}
      <div className="absolute inset-0 transition duration-500 group-hover:scale-[1.04]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.12),transparent_22%)]" />
      </div>
      <div className="absolute inset-0 flex flex-col justify-between p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-white/70">{sourceMeta.eyebrow || theme.eyebrow}</p>
            <p className="mt-2 max-w-[80%] text-2xl font-semibold leading-tight text-white">{item.title}</p>
          </div>
          <span className="rounded-full border border-white/15 bg-black/15 px-3 py-1 text-xs text-white/86 backdrop-blur-md">
            {sourceMeta.label}
          </span>
        </div>
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-sm text-white/82">{item.neighborhood || item.location || item.city}</p>
            <p className="mt-1 text-xs text-white/66">{sourceMeta.badge}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
