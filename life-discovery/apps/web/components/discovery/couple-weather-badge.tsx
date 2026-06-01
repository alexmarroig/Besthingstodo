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
}: {
  context?: ExperienceContext | null;
  couple?: CoupleSnapshot | null;
}) {
  const city = couple?.city || context?.city || "São Paulo";
  const neighborhood = couple?.neighborhood || context?.neighborhood || null;
  const locationLabel = neighborhood ? `${neighborhood}, ${city}` : city;

  return (
    <div className="weather-badge rounded-[1.8rem] p-5">
      <p className="text-[11px] uppercase tracking-[0.28em] text-white/48">Clima local</p>
      <div className="mt-3 flex items-start gap-3">
        {context?.icon_url ? (
          <img src={context.icon_url} alt="" className="h-12 w-12" />
        ) : (
          <span className="text-4xl leading-none">{weatherEmoji(context || ({} as ExperienceContext))}</span>
        )}
        <div className="min-w-0">
          <p className="text-3xl font-semibold text-white">
            {context?.temperature != null ? `${context.temperature}°C` : "—"}
          </p>
          <p className="mt-1 text-sm text-white/72">{context?.weather_label || "Carregando clima..."}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {context?.feels_like != null && (
          <span className="rounded-full bg-white/8 px-3 py-1 text-[11px] text-white/70">
            Sensação {context.feels_like}°C
          </span>
        )}
        {context?.humidity != null && (
          <span className="rounded-full bg-white/8 px-3 py-1 text-[11px] text-white/70">
            💧 {context.humidity}%
          </span>
        )}
        {context?.wind_speed != null && (
          <span className="rounded-full bg-white/8 px-3 py-1 text-[11px] text-white/70">
            🌬 {context.wind_speed} m/s
          </span>
        )}
        {context?.isRainy && (
          <span className="rounded-full bg-[#38bdf8]/15 px-3 py-1 text-[11px] text-[#38bdf8]">
            Chuva agora
          </span>
        )}
      </div>

      <p className="mt-3 text-xs text-white/55">📍 {locationLabel}</p>
      <p className="mt-2 text-sm text-white/62">{context?.weather_note || "Sincronizado com o cadastro do casal."}</p>
    </div>
  );
}
