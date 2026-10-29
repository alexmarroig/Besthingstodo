"use client";

import { useEffect, useMemo, useState } from "react";

import {
  isLocalVenueImage,
  normalizeRecommendationImageUrl,
  resolveThemeImageUrl,
} from "@/shared/recommendation-images";
import { resolveKnownVenueImageForItem } from "@/shared/known-venue-images";
import { fetchEditorialImageDeduped, getCachedImageUrl } from "@/shared/image-cache";
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

  const localFallback = useMemo(
    () => resolveKnownVenueImageForItem(item.id, item.title, item.location) || resolveThemeImageUrl(item),
    [item]
  );

  const directImage = useMemo(() => {
    const photo = normalizeRecommendationImageUrl(item.image_url || getCachedImageUrl(item.id));
    if (photo && !isLocalVenueImage(photo)) return photo;
    const known = resolveKnownVenueImageForItem(item.id, item.title, item.location);
    if (known) return known;
    const explicit = normalizeRecommendationImageUrl(item.image_url || getCachedImageUrl(item.id));
    if (explicit) return explicit;
    return localFallback;
  }, [item.id, item.title, item.location, item.image_url, localFallback]);

  const [resolvedImage, setResolvedImage] = useState<string | null>(directImage);
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(() => isLocalVenueImage(directImage));

  useEffect(() => {
    setFailed(false);
    setResolvedImage(directImage);
    setLoaded(isLocalVenueImage(directImage));

    const hasDedicatedKnown = Boolean(resolveKnownVenueImageForItem(item.id, item.title, item.location));
    const hasExplicitRemote = Boolean(item.image_url && !isLocalVenueImage(item.image_url));
    const target = item.booking_url || item.url;

    if (hasExplicitRemote || !target || mode === "tile" || (hasDedicatedKnown && item.domain !== "dining_out")) {
      return;
    }

    let active = true;
    const params = new URLSearchParams({
      title: item.title,
      location: item.location || item.neighborhood || "",
      city: item.city || "Sao Paulo",
      domain: item.domain || "",
      id: item.id || "",
      target,
    });
    if (item.neighborhood) params.set("neighborhood", item.neighborhood);

    fetchEditorialImageDeduped(item.id, `/api/editorial-image?${params.toString()}`).then((remoteUrl) => {
      if (!active || !remoteUrl) return;
      const valid = normalizeRecommendationImageUrl(remoteUrl);
      if (valid) setResolvedImage(valid);
    });

    return () => {
      active = false;
    };
  }, [
    directImage,
    item.booking_url,
    item.city,
    item.domain,
    item.id,
    item.image_url,
    item.location,
    item.neighborhood,
    item.title,
    item.url,
    mode,
  ]);

  const rootClass = className ? `relative overflow-hidden ${className}` : "relative h-52 overflow-hidden";
  const showImage = Boolean(resolvedImage) && !failed;
  const isCompact = mode === "tile";
  const isHero = mode === "hero";
  const showShimmer = showImage && !loaded && !isLocalVenueImage(resolvedImage);

  const overlayBadges = (
    <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-2.5">
      <span className="rounded-full bg-black/60 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white/90 backdrop-blur-sm">
        {localizeCategory(item.category)}
      </span>
      {item.quality_score != null && item.quality_score > 0 ? (
        <span className="ifood-chip rounded-full px-2 py-0.5 text-[10px] font-semibold backdrop-blur-sm">
          {Math.round(item.quality_score)}%
        </span>
      ) : item.score != null && item.score > 0 ? (
        <span className="rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
          {Number(item.score).toFixed(1)}
        </span>
      ) : null}
    </div>
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
          loading={isHero ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={isHero ? "high" : "auto"}
          onLoad={() => setLoaded(true)}
          onError={() => {
            if (resolvedImage !== localFallback && localFallback) {
              setResolvedImage(localFallback);
              setLoaded(true);
            } else {
              setFailed(true);
              setLoaded(true);
            }
          }}
        />
        <div
          className={`pointer-events-none absolute inset-0 bg-gradient-to-t ${
            isCompact
              ? "from-black/40 via-transparent to-black/5"
              : isHero
                ? "from-black/30 via-transparent to-transparent"
                : "from-[#04101d]/90 via-black/25 to-black/10"
          }`}
        />
        {(item.domain === "dining_out" || item.domain === "delivery") && isLocalVenueImage(resolvedImage) ? <span className="pointer-events-none absolute bottom-2 left-2 rounded-md bg-black/55 px-2 py-1 text-[9px] text-white/70">Imagem ilustrativa</span> : null}
        {isHero ? null : !isCompact ? (
          <>
            <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between px-4 py-4 text-xs text-white/84">
              <span className="rounded-full border border-white/15 bg-black/30 px-3 py-1 backdrop-blur-md">
                {sourceMeta.label}
              </span>
              <span className="rounded-full border border-white/10 bg-black/22 px-3 py-1 backdrop-blur-md">
                {sourceMeta.badge}
              </span>
            </div>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between px-4 py-3 text-xs text-white/80">
              <span>{item.neighborhood || item.location || item.city}</span>
            </div>
          </>
        ) : (
          overlayBadges
        )}
      </div>
    );
  }

  return (
    <div className={`${rootClass} bg-gradient-to-br ${sourceMeta.gradient || theme.gradient}`}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.16),transparent_35%)]" />
      {isHero ? null : overlayBadges}
    </div>
  );
}
