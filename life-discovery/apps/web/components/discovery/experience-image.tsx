"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";

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

// Only hosts explicitly configured in next.config.ts may use the image optimizer.
function canOptimizeImage(src: string): boolean {
  if (src.startsWith("/images/")) return true;
  try {
    const url = new URL(src);
    if (url.protocol !== "https:") return false;
    const host = url.hostname.toLowerCase();
    return ["image.tmdb.org", "www.themealdb.com", "openweathermap.org", "s1.ticketm.net"].includes(host)
      || host === "wikipedia.org" || host.endsWith(".wikipedia.org")
      || host === "wikimedia.org" || host.endsWith(".wikimedia.org");
  } catch { return false; }
}

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

  const imageContainerRef = useRef<HTMLDivElement>(null);
  const [nearViewport, setNearViewport] = useState(mode === "hero");
  const [resolvedImage, setResolvedImage] = useState<string | null>(directImage);
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (mode === "hero" || typeof IntersectionObserver === "undefined") {
      setNearViewport(true);
      return;
    }
    const node = imageContainerRef.current;
    if (!node) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setNearViewport(true);
        observer.disconnect();
      }
    }, { rootMargin: "180px 120px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, [mode]);

  useEffect(() => {
    setFailed(false);
    setResolvedImage(directImage);
    setLoaded(false);

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
  const showShimmer = showImage && !loaded;
  const imageSizes = isHero
    ? "(max-width: 640px) 100vw, (max-width: 1024px) 92vw, 1152px"
    : isCompact
      ? "(max-width: 640px) 70vw, (max-width: 1024px) 264px, 288px"
      : "(max-width: 640px) 100vw, 680px";
  const imageClass = `absolute inset-0 h-full w-full object-cover transition-opacity duration-300 motion-safe:group-hover:scale-[1.035] ${loaded ? "opacity-100" : "opacity-0"}`;
  const handleImageError = () => {
    if (resolvedImage !== localFallback && localFallback) {
      setResolvedImage(localFallback);
      setLoaded(false);
    } else {
      setFailed(true);
      setLoaded(true);
    }
  };

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

  if (showImage && nearViewport) {
    return (
      <div ref={imageContainerRef} className={rootClass}>
        {showShimmer ? <div className="absolute inset-0 shimmer" aria-hidden /> : null}
        {canOptimizeImage(resolvedImage!) ? (
          <Image
            key={resolvedImage}
            src={resolvedImage!}
            alt={`Imagem de ${item.title}`}
            fill
            sizes={imageSizes}
            quality={75}
            preload={isHero}
            loading={isHero ? undefined : "lazy"}
            className={imageClass}
            onLoad={() => setLoaded(true)}
            onError={handleImageError}
          />
        ) : (
          <img
            key={resolvedImage}
            src={resolvedImage!}
            alt={`Imagem de ${item.title}`}
            className={imageClass}
            loading={isHero ? "eager" : "lazy"}
            decoding="async"
            fetchPriority={isHero ? "high" : "low"}
            onLoad={() => setLoaded(true)}
            onError={handleImageError}
          />
        )}
        <div
          className={`pointer-events-none absolute inset-0 bg-gradient-to-t ${
            isCompact
              ? "from-black/55 via-black/5 to-black/10"
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
    <div ref={imageContainerRef} className={`${rootClass} bg-gradient-to-br ${sourceMeta.gradient || theme.gradient}`}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.16),transparent_35%)]" />
      {isHero ? null : overlayBadges}
    </div>
  );
}
