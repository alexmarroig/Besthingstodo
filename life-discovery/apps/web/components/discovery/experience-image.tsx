"use client";

import { useEffect, useMemo, useState } from "react";

import { Recommendation } from "../../lib/types";
import { getRecommendationSourceMeta } from "@/shared/source";

const fallbackThemes: Record<string, { gradient: string; eyebrow: string }> = {
  museum: { gradient: "from-[#4338ca] via-[#0f172a] to-[#f97316]", eyebrow: "Cultura em foco" },
  bookstore: { gradient: "from-[#7c2d12] via-[#111827] to-[#c084fc]", eyebrow: "Livros e conversa" },
  cinema: { gradient: "from-[#111827] via-[#1d4ed8] to-[#e11d48]", eyebrow: "Noite de cinema" },
  cafe: { gradient: "from-[#78350f] via-[#1f2937] to-[#f59e0b]", eyebrow: "Pausa gostosa" },
  dining: { gradient: "from-[#7f1d1d] via-[#1f2937] to-[#fb7185]", eyebrow: "Jantar sem pressa" },
  outdoor: { gradient: "from-[#14532d] via-[#0f172a] to-[#22c55e]", eyebrow: "Respiro na cidade" },
  editorial: { gradient: "from-[#1d4ed8] via-[#0f172a] to-[#f97316]", eyebrow: "Curadoria da noite" }
};

export default function ExperienceImage({ item }: { item: Recommendation }) {
  const theme = fallbackThemes[item.image_fallback_key || "editorial"] || fallbackThemes.editorial;
  const sourceMeta = getRecommendationSourceMeta(item);
  const [resolvedImage, setResolvedImage] = useState<string | null>(item.image_url || null);

  const imageResolverUrl = useMemo(() => {
    if (item.image_url) return item.image_url;
    const target = item.booking_url || item.url;
    if (!target) return null;

    const params = new URLSearchParams({
      target,
      title: item.title,
      location: item.location || "",
      city: item.city || "Sao Paulo"
    });
    return `/api/editorial-image?${params.toString()}`;
  }, [item.booking_url, item.city, item.image_url, item.location, item.title, item.url]);

  useEffect(() => {
    let active = true;

    if (item.image_url) {
      setResolvedImage(item.image_url);
      return () => {
        active = false;
      };
    }

    if (!imageResolverUrl) {
      setResolvedImage(null);
      return () => {
        active = false;
      };
    }

    fetch(imageResolverUrl, { cache: "force-cache" })
      .then((res) => (res.ok ? res.json() : { url: null }))
      .then((payload) => {
        if (!active) return;
        setResolvedImage(payload?.url || null);
      })
      .catch(() => {
        if (!active) return;
        setResolvedImage(null);
      });

    return () => {
      active = false;
    };
  }, [imageResolverUrl, item.image_url]);

  if (resolvedImage) {
    return (
      <div className="relative h-52 overflow-hidden">
        <img
          src={resolvedImage}
          alt={item.title}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.06]"
          loading="lazy"
          onError={() => setResolvedImage(null)}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#04101d] via-transparent to-black/10" />
        <div className="absolute inset-x-0 top-0 flex items-center justify-between px-4 py-4 text-xs text-white/84">
          <span className="rounded-full border border-white/15 bg-black/30 px-3 py-1 backdrop-blur-md">{sourceMeta.label}</span>
          <span className="rounded-full border border-white/10 bg-black/22 px-3 py-1 backdrop-blur-md">{sourceMeta.badge}</span>
        </div>
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between px-4 py-3 text-xs text-white/80">
          <span className="rounded-full border border-white/15 bg-black/20 px-3 py-1 backdrop-blur-md">ver fonte</span>
          <span>{item.neighborhood || item.location || item.city}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative h-52 overflow-hidden bg-gradient-to-br ${sourceMeta.gradient || theme.gradient}`}>
      <div className="absolute inset-0 transition duration-500 group-hover:scale-[1.04]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.12),transparent_22%)]" />
        <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(135deg,rgba(255,255,255,0.15)_0,rgba(255,255,255,0.15)_8%,transparent_8%,transparent_18%,rgba(255,255,255,0.08)_18%,rgba(255,255,255,0.08)_24%,transparent_24%,transparent_100%)]" />
      </div>
      <div className="absolute inset-0 flex flex-col justify-between p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-white/70">{sourceMeta.eyebrow || theme.eyebrow}</p>
            <p className="mt-2 max-w-[80%] text-2xl font-semibold leading-tight text-white">{item.title}</p>
          </div>
          <span className="rounded-full border border-white/15 bg-black/15 px-3 py-1 text-xs text-white/86 backdrop-blur-md transition group-hover:border-white/25 group-hover:bg-black/25">
            {sourceMeta.label}
          </span>
        </div>

        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-sm text-white/82">{item.neighborhood || item.location || item.city}</p>
            <p className="mt-1 text-xs text-white/66">{sourceMeta.badge}</p>
          </div>
          <span className="rounded-full border border-white/15 bg-black/15 px-3 py-1 text-xs text-white/86 backdrop-blur-md transition group-hover:border-white/25 group-hover:bg-black/25">
            abrir
          </span>
        </div>
      </div>
    </div>
  );
}
