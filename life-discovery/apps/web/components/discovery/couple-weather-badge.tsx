"use client";

import type { CoupleSnapshot, ExperienceContext } from "@life/shared-types";

function weatherEmoji(context: ExperienceContext) {
  if (context.isRainy) return "🌧️";
  if (context.isHot) return "☀️";
  if (context.isCold) return "🌬️";
  if ((context.condition || "").toLowerCase().includes("cloud")) return "☁️";
  return "🌤️";
}

export default function CoupleWeatherBadge({
  context,
  couple,
  compact = false,
}: {
  context?: ExperienceContext | null;
  couple?: CoupleSnapshot | null;
  compact?: boolean;
}) {
  const city = couple?.city || context?.city || "São Paulo";
  const neighborhood = couple?.neighborhood || context?.neighborhood || null;
  const locationLabel = neighborhood ? `${neighborhood}` : city;
  const temp = context?.temperature != null ? `${context.temperature}°` : "—";

  if (compact) {
    return (
      <div className="surface flex shrink-0 items-center gap-3 px-3.5 py-2.5">
        {context?.icon_url ? (
          <img src={context.icon_url} alt="" className="h-8 w-8" />
        ) : (
          <span className="text-2xl leading-none">{weatherEmoji(context || ({} as ExperienceContext))}</span>
        )}
        <div className="min-w-0">
          <p className="text-lg font-semibold leading-none text-white">{temp}</p>
          <p className="mt-0.5 truncate text-[11px] text-white/45">{locationLabel}</p>
        </div>
        {context?.isRainy ? (
          <span className="pill-accent px-2 py-0.5 text-[10px]">Chuva</span>
        ) : null}
      </div>
    );
  }

  return (
    <div className="weather-badge rounded-4xl p-5">
      <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-white/42">Clima agora</p>
      <div className="mt-3 flex items-start gap-3">
        {context?.icon_url ? (
          <img src={context.icon_url} alt="" className="h-11 w-11" />
        ) : (
          <span className="text-3xl leading-none">{weatherEmoji(context || ({} as ExperienceContext))}</span>
        )}
        <div className="min-w-0">
          <p className="text-3xl font-semibold text-white">{temp}</p>
          <p className="mt-1 text-sm text-white/60">{context?.weather_label || "Atualizando..."}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {context?.feels_like != null && <span className="pill">Sensação {context.feels_like}°</span>}
        {context?.isRainy && <span className="pill-accent">Leve coberto hoje</span>}
      </div>

      <p className="mt-3 text-xs text-white/45">{locationLabel} · {city}</p>
    </div>
  );
}
