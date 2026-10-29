"use client";

import { useEffect, useMemo, useState } from "react";
import Map, { Marker, Popup } from "react-map-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Compass, ExternalLink, MapPin, Navigation, Sparkles } from "lucide-react";

import ExperienceImage from "./experience-image";
import MediaDetailModal from "./media-detail-modal";
import { localizeCategory } from "@/shared/labels-pt";
import { getUserId } from "@/shared/storage";
import { Recommendation } from "@life/shared-types";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

const NEIGHBORHOOD_COORDS: Record<string, { lat: number; lon: number }> = {
  pinheiros: { lat: -23.5673, lon: -46.6928 },
  paulista: { lat: -23.5614, lon: -46.6559 },
  "bela vista": { lat: -23.5632, lon: -46.6502 },
  jardins: { lat: -23.5675, lon: -46.6682 },
  moema: { lat: -23.6004, lon: -46.6652 },
  ibirapuera: { lat: -23.5874, lon: -46.6576 },
  "campo belo": { lat: -23.6195, lon: -46.6708 },
  "vila madalena": { lat: -23.5535, lon: -46.6912 },
  centro: { lat: -23.5453, lon: -46.6388 },
  "itaim bibi": { lat: -23.5844, lon: -46.6784 },
  consolação: { lat: -23.5558, lon: -46.6601 },
  higienópolis: { lat: -23.5442, lon: -46.6572 },
  mooca: { lat: -23.5567, lon: -46.5968 },
};

function getItemCoords(item: Recommendation, index = 0): { lat: number; lon: number } {
  if (typeof item.latitude === "number" && typeof item.longitude === "number") {
    return { lat: item.latitude, lon: item.longitude };
  }
  const nbKey = (item.neighborhood || item.location || "").toLowerCase();
  for (const [key, coords] of Object.entries(NEIGHBORHOOD_COORDS)) {
    if (nbKey.includes(key)) {
      return {
        lat: coords.lat + ((index % 5) - 2) * 0.0018,
        lon: coords.lon + ((index % 4) - 1.5) * 0.0018,
      };
    }
  }
  return {
    lat: -23.5614 + ((index % 7) - 3) * 0.004,
    lon: -46.6559 + ((index % 6) - 2.5) * 0.004,
  };
}

function openRoute(item: Recommendation) {
  if (typeof window === "undefined") return;
  const query = encodeURIComponent(`${item.title} ${item.neighborhood || item.location || ""} ${item.city || "São Paulo"}`);
  window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, "_blank", "noopener,noreferrer");
}

function isRomanticItem(item: Recommendation): boolean {
  const hay = [
    item.title,
    item.description,
    item.couple_fit_reason || "",
    item.personalization_label || "",
    ...(item.tags || []),
  ]
    .join(" ")
    .toLowerCase();
  return ["romant", "românt", "date", "intimista", "encontro", "casal", "jantar", "trattoria", "vinho", "aconchegante"].some(
    (kw) => hay.includes(kw)
  );
}

export default function ExperienceMap({
  items,
  focusTitle,
}: {
  items: Recommendation[];
  focusTitle?: string;
}) {
  const userId = getUserId();
  const [selected, setSelected] = useState<Recommendation | null>(() => items[0] || null);
  const [modalItem, setModalItem] = useState<Recommendation | null>(null);
  const [filters, setFilters] = useState<string[]>([]);
  const [activeNeighborhood, setActiveNeighborhood] = useState<string>("Todos");

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (filters.includes("covered") && item.indoor_outdoor === "outdoor") return false;
      if (filters.includes("nearby") && item.distance_label === "vale a travessia") return false;
      if (filters.includes("romantic") && !isRomanticItem(item)) return false;
      if (filters.includes("free") && (item.price || 0) > 50) return false;
      if (filters.includes("top_ml") && (item.quality_score || 0) < 88) return false;
      return true;
    });
  }, [filters, items]);

  const groups = useMemo(() => {
    return filtered.reduce((acc: Record<string, Recommendation[]>, item) => {
      const key = item.neighborhood || item.location || item.city || "São Paulo";
      acc[key] = acc[key] || [];
      acc[key].push(item);
      return acc;
    }, {});
  }, [filtered]);

  const neighborhoodList = useMemo(() => {
    const entries = Object.entries(groups).map(([name, list]) => {
      const avgScore = Math.round(
        list.reduce((sum, i) => sum + (i.quality_score || 82), 0) / Math.max(1, list.length)
      );
      return { name, count: list.length, avgScore };
    });
    entries.sort((a, b) => b.count - a.count || b.avgScore - a.avgScore);
    return entries;
  }, [groups]);

  const visibleGroups = useMemo(() => {
    if (activeNeighborhood === "Todos") return Object.entries(groups);
    return Object.entries(groups).filter(([name]) => name === activeNeighborhood);
  }, [groups, activeNeighborhood]);

  useEffect(() => {
    if (!focusTitle) return;
    const target = items.find((item) => item.title.toLowerCase() === focusTitle.toLowerCase());
    if (target) {
      setSelected(target);
      if (target.neighborhood) setActiveNeighborhood(target.neighborhood);
    }
  }, [focusTitle, items]);

  const toggle = (value: string) => {
    setFilters((prev) => (prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]));
  };

  const selectedCoords = useMemo(
    () => (selected ? getItemCoords(selected, 0) : { lat: -23.5614, lon: -46.6559 }),
    [selected]
  );

  const osmEmbedUrl = useMemo(() => {
    const { lat, lon } = selectedCoords;
    const delta = 0.012;
    const bbox = `${lon - delta}%2C${lat - delta}%2C${lon + delta}%2C${lat + delta}`;
    return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat}%2C${lon}`;
  }, [selectedCoords]);

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Top Filter Chips */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {[
            { key: "top_ml", label: "🧠 Match 88%+" },
            { key: "covered", label: "☔ Coberto / Protegido" },
            { key: "nearby", label: "📍 Perto de Vocês" },
            { key: "romantic", label: "🍷 Mais Date" },
            { key: "free", label: "💚 Gratuito / Até R$50" },
          ].map((filter) => (
            <button
              key={filter.key}
              type="button"
              onClick={() => toggle(filter.key)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
                filters.includes(filter.key)
                  ? "bg-[#ff7a59] text-white shadow-md"
                  : "border border-white/10 bg-white/[0.04] text-white/72 hover:bg-white/[0.08] hover:text-white"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {filters.length > 0 || activeNeighborhood !== "Todos" ? (
          <button
            type="button"
            onClick={() => {
              setFilters([]);
              setActiveNeighborhood("Todos");
            }}
            className="btn-ghost py-1.5 px-3 text-xs"
          >
            Limpar filtros
          </button>
        ) : null}
      </div>

      {/* Neighborhood Selector Bar */}
      <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <button
          type="button"
          onClick={() => setActiveNeighborhood("Todos")}
          className={`shrink-0 rounded-2xl px-4 py-2 text-xs font-semibold transition ${
            activeNeighborhood === "Todos"
              ? "bg-white/15 text-white ring-1 ring-[#f4d06f]/40"
              : "border border-white/8 bg-white/[0.03] text-white/65 hover:text-white"
          }`}
        >
          Todos os bairros ({filtered.length})
        </button>
        {neighborhoodList.map((nb) => (
          <button
            key={nb.name}
            type="button"
            onClick={() => {
              setActiveNeighborhood(nb.name);
              const firstInNb = groups[nb.name]?.[0];
              if (firstInNb) setSelected(firstInNb);
            }}
            className={`shrink-0 rounded-2xl px-3.5 py-2 text-left text-xs transition ${
              activeNeighborhood === nb.name
                ? "bg-gradient-to-r from-[#ff7a59]/25 to-[#f4d06f]/15 text-white ring-1 ring-[#ff7a59]/45"
                : "border border-white/8 bg-white/[0.03] text-white/70 hover:bg-white/[0.06] hover:text-white"
            }`}
          >
            <span className="font-semibold">{nb.name}</span>
            <span className="ml-1.5 text-[10px] text-white/50">
              {nb.count} · {nb.avgScore}% match
            </span>
          </button>
        ))}
      </div>

      {/* Selected Item Spotlight + Live Interactive Map */}
      {selected ? (
        <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="surface-strong flex flex-col justify-between overflow-hidden rounded-[1.75rem] border border-white/10">
            <div className="relative aspect-[16/9] w-full">
              <ExperienceImage item={selected} mode="hero" className="h-full w-full" />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#060d16] via-black/25 to-transparent" />
              <div className="absolute left-4 top-4 flex items-center gap-2">
                <span className="pill-accent backdrop-blur-md">
                  <Compass className="h-3.5 w-3.5" />
                  Foco no Mapa: {selected.neighborhood || selected.location}
                </span>
              </div>
              {selected.quality_score != null ? (
                <div className="absolute right-4 top-4 rounded-full bg-black/65 px-3 py-1 text-xs font-semibold text-[#f4d06f] backdrop-blur-md">
                  {Math.round(selected.quality_score)}% Match IA
                </div>
              ) : null}
              <div className="absolute bottom-3 left-4 right-4">
                <h3 className="font-display text-2xl font-semibold text-white">{selected.title}</h3>
                <p className="mt-0.5 text-xs text-white/70">
                  {localizeCategory(selected.category)} · {selected.distance_label || "boa logística"} ·{" "}
                  {selected.indoor_outdoor === "indoor" ? "Ambiente coberto" : "Ar livre / misto"}
                </p>
              </div>
            </div>

            <div className="space-y-3 p-5">
              <p className="text-sm leading-relaxed text-white/78">
                {selected.couple_fit_reason || selected.description}
              </p>

              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setModalItem(selected)}
                  className="btn-primary gap-1.5 py-2 text-xs"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Ver detalhes & calibrar IA</span>
                </button>
                <button
                  type="button"
                  onClick={() => openRoute(selected)}
                  className="btn-ghost gap-1.5 py-2 text-xs"
                >
                  <Navigation className="h-3.5 w-3.5 text-[#38bdf8]" />
                  <span>Traçar rota no Google Maps</span>
                </button>
                {selected.url ? (
                  <a
                    href={selected.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-ghost gap-1.5 py-2 text-xs"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span>Site oficial</span>
                  </a>
                ) : null}
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#08111d]">
            {MAPBOX_TOKEN ? (
              <Map
                longitude={selectedCoords.lon}
                latitude={selectedCoords.lat}
                zoom={13.2}
                style={{ width: "100%", height: "100%", minHeight: 320 }}
                mapStyle="mapbox://styles/mapbox/dark-v11"
                mapboxAccessToken={MAPBOX_TOKEN}
              >
                {filtered.slice(0, 30).map((item, index) => {
                  const coords = getItemCoords(item, index);
                  return (
                    <Marker
                      key={`${item.id}-${index}`}
                      longitude={coords.lon}
                      latitude={coords.lat}
                      anchor="bottom"
                      onClick={(event) => {
                        event.originalEvent.stopPropagation();
                        setSelected(item);
                      }}
                    >
                      <button
                        type="button"
                        className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold shadow-lg transition ${
                          selected?.id === item.id
                            ? "scale-110 border-white bg-[#f4d06f] text-black"
                            : "border-white/20 bg-[#ff7a59] text-white"
                        }`}
                      >
                        {item.title.slice(0, 16)}
                      </button>
                    </Marker>
                  );
                })}
                {selected ? (
                  <Popup
                    longitude={selectedCoords.lon}
                    latitude={selectedCoords.lat}
                    closeOnClick={false}
                    onClose={() => setSelected(null)}
                    offset={18}
                  >
                    <div className="max-w-[220px] text-black">
                      <p className="font-semibold">{selected.title}</p>
                      <p className="mt-0.5 text-xs">{selected.neighborhood || selected.location}</p>
                    </div>
                  </Popup>
                ) : null}
              </Map>
            ) : (
              <div className="relative flex h-full min-h-[320px] flex-col">
                <iframe
                  title={`Mapa de ${selected.title}`}
                  src={osmEmbedUrl}
                  className="h-full min-h-[300px] w-full flex-1 border-0 opacity-90 contrast-105 invert-[0.88] hue-rotate-180"
                  loading="lazy"
                />
                <div className="flex items-center justify-between border-t border-white/10 bg-[#07101c]/95 px-4 py-2.5 text-xs text-white/70">
                  <span className="flex items-center gap-1.5 truncate">
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-[#ff7a59]" />
                    <strong className="text-white">{selected.title}</strong> · {selected.neighborhood || "São Paulo"}
                  </span>
                  <button
                    type="button"
                    onClick={() => openRoute(selected)}
                    className="shrink-0 font-semibold text-[#f4d06f] hover:underline"
                  >
                    Abrir GPS ↗
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* Neighborhood Visual Clusters */}
      <div className="grid gap-5 lg:grid-cols-2">
        {visibleGroups.map(([group, entries]) => (
          <section key={group} className="editorial-card rounded-[1.85rem] p-5">
            <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] pb-3.5">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#f4d06f]">{group}</p>
                <h3 className="mt-1 text-xl font-semibold text-white">
                  {entries.length} {entries.length === 1 ? "experiência selecionada" : "experiências selecionadas"}
                </h3>
              </div>
              <span className="pill text-[11px]">{entries[0]?.distance_label || "São Paulo"}</span>
            </div>

            <div className="mt-4 space-y-3">
              {entries.slice(0, 5).map((item) => {
                const isSelected = selected?.id === item.id;
                return (
                  <div
                    key={item.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelected(item)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") setSelected(item);
                    }}
                    className={`flex cursor-pointer items-center gap-3.5 rounded-2xl border p-2.5 text-left transition ${
                      isSelected
                        ? "border-[#f4d06f]/60 bg-white/[0.09]"
                        : "border-white/[0.06] bg-white/[0.03] hover:border-white/15 hover:bg-white/[0.06]"
                    }`}
                  >
                    <div className="relative h-16 w-20 shrink-0 overflow-hidden rounded-xl">
                      <ExperienceImage item={item} mode="tile" className="h-full w-full" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-semibold text-white">{item.title}</p>
                        {item.quality_score != null ? (
                          <span className="shrink-0 rounded-full bg-[#ff7a59]/15 px-2 py-0.5 text-[10px] font-semibold text-[#ffb89a]">
                            {Math.round(item.quality_score)}%
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-0.5 line-clamp-1 text-xs text-white/55">
                        {localizeCategory(item.category)} ·{" "}
                        {item.indoor_outdoor === "indoor" ? "Coberto" : "Ar livre / misto"} ·{" "}
                        {item.price === 0 ? "Grátis" : item.price ? `R$ ${item.price}` : "Livre"}
                      </p>
                      <div className="mt-1.5 flex items-center gap-3 text-[11px]">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setModalItem(item);
                          }}
                          className="font-medium text-[#f4d06f] hover:underline"
                        >
                          Abrir card
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openRoute(item);
                          }}
                          className="text-white/50 hover:text-white"
                        >
                          Rota GPS ↗
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <MediaDetailModal item={modalItem} userId={userId} onClose={() => setModalItem(null)} />
    </div>
  );
}
