"use client";

import { useEffect, useMemo, useState } from "react";
import Map, { Marker, Popup } from "react-map-gl";
import "mapbox-gl/dist/mapbox-gl.css";

import { Recommendation } from "../../lib/types";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

function openRoute(item: Recommendation) {
  if (typeof window === "undefined") return;
  const query = encodeURIComponent(`${item.location || item.title}, ${item.city}`);
  window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, "_blank", "noopener,noreferrer");
}

export default function ExperienceMap({ items, focusTitle }: { items: Recommendation[]; focusTitle?: string }) {
  const [selected, setSelected] = useState<Recommendation | null>(null);
  const [filters, setFilters] = useState<string[]>([]);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (filters.includes("covered") && item.indoor_outdoor === "outdoor") return false;
      if (filters.includes("nearby") && item.distance_label === "vale a travessia") return false;
      if (filters.includes("romantic") && !(item.couple_fit_reason || "").toLowerCase().includes("encontro")) return false;
      if (filters.includes("free") && (item.price || 0) > 0) return false;
      return true;
    });
  }, [filters, items]);

  const groups = useMemo(() => {
    return filtered.reduce((acc: Record<string, Recommendation[]>, item) => {
      const key = item.neighborhood || item.location || item.city;
      acc[key] = acc[key] || [];
      acc[key].push(item);
      return acc;
    }, {});
  }, [filtered]);

  useEffect(() => {
    if (!focusTitle) return;
    const target = items.find((item) => item.title.toLowerCase() === focusTitle.toLowerCase());
    if (target) setSelected(target);
  }, [focusTitle, items]);

  const toggle = (value: string) => {
    setFilters((prev) => (prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]));
  };

  if (!MAPBOX_TOKEN) {
    return (
      <div className="space-y-5">
        <div className="glass rounded-[2rem] p-5 text-sm text-white/74">
          <p className="text-[11px] uppercase tracking-[0.28em] text-[#ffd27a]">Bairros para hoje</p>
          <p className="mt-2 text-base text-white/84">Sem mapa ativo, então organizei as opções por bairro e distância para a decisão ficar rápida.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {[
            { key: "covered", label: "mais coberto" },
            { key: "nearby", label: "mais perto" },
            { key: "romantic", label: "mais date" },
            { key: "free", label: "baixo custo" }
          ].map((filter) => (
            <button
              key={filter.key}
              onClick={() => toggle(filter.key)}
              className={`rounded-full px-4 py-2 text-sm ${filters.includes(filter.key) ? "bg-[#f97352] text-white" : "bg-white/6 text-white/72"}`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {Object.entries(groups).map(([group, entries]) => (
            <section key={group} className="editorial-card rounded-[2rem] p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.28em] text-[#ffd27a]">{group}</p>
                  <h3 className="mt-2 text-2xl font-semibold">{entries.length} boas apostas por aqui</h3>
                </div>
                <span className="rounded-full bg-white/6 px-3 py-1 text-xs text-white/62">decisão rápida</span>
              </div>

              <div className="mt-4 space-y-3">
                {entries.slice(0, 3).map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setSelected(item)}
                    className={`w-full rounded-[1.4rem] border p-4 text-left transition ${selected?.id === item.id ? "border-[#f4d06f] bg-white/8" : "border-white/8 bg-white/4 hover:bg-white/7"}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-lg font-medium text-white">{item.title}</p>
                        <p className="mt-1 text-sm text-white/62">{item.distance_label} • {item.indoor_outdoor === "indoor" ? "mais protegido" : item.indoor_outdoor === "outdoor" ? "mais aberto" : "misto"}</p>
                      </div>
                      <span className="rounded-full bg-white/8 px-3 py-1 text-xs text-white/60">{item.price === 0 ? "grátis" : item.price ? `R$ ${item.price}` : "faixa livre"}</span>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>

        {selected ? (
          <div className="glass rounded-[2rem] p-5">
            <p className="text-[11px] uppercase tracking-[0.28em] text-[#ffd27a]">Escolha destacada</p>
            <h3 className="mt-2 text-2xl font-semibold">{selected.title}</h3>
            <p className="mt-3 text-sm text-white/72">{selected.couple_fit_reason || selected.description}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button onClick={() => openRoute(selected)} className="rounded-full bg-[#f97352] px-4 py-2 text-sm font-medium text-white">Abrir rota</button>
              <button onClick={() => (selected.url ? window.open(selected.url, "_blank", "noopener,noreferrer") : openRoute(selected))} className="rounded-full bg-white/6 px-4 py-2 text-sm text-white/78">Abrir fonte</button>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[0.95fr_1.2fr]">
      <aside className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {[
            { key: "covered", label: "mais coberto" },
            { key: "nearby", label: "mais perto" },
            { key: "romantic", label: "mais date" },
            { key: "free", label: "baixo custo" }
          ].map((filter) => (
            <button
              key={filter.key}
              onClick={() => toggle(filter.key)}
              className={`rounded-full px-4 py-2 text-sm ${filters.includes(filter.key) ? "bg-[#f97352] text-white" : "bg-white/6 text-white/72"}`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {filtered.map((item) => (
            <button
              key={item.id}
              onClick={() => setSelected(item)}
              className={`editorial-card w-full rounded-[1.6rem] p-4 text-left ${selected?.id === item.id ? "ring-1 ring-[#f4d06f]" : ""}`}
            >
              <p className="text-lg font-medium text-white">{item.title}</p>
              <p className="mt-2 text-sm text-white/64">{item.neighborhood || item.location} • {item.distance_label}</p>
              <p className="mt-3 text-sm text-white/74">{item.couple_fit_reason}</p>
            </button>
          ))}
        </div>
      </aside>

      <div className="overflow-hidden rounded-[2rem] border border-white/10">
        <Map
          initialViewState={{ longitude: -46.6388, latitude: -23.5489, zoom: 11.2 }}
          style={{ width: "100%", height: 640 }}
          mapStyle="mapbox://styles/mapbox/dark-v11"
          mapboxAccessToken={MAPBOX_TOKEN}
        >
          {filtered.map((item, index) => (
            <Marker
              key={`${item.id}-${index}`}
              longitude={item.longitude ?? -46.6388 + index * 0.01}
              latitude={item.latitude ?? -23.5489 + index * 0.004}
              anchor="bottom"
              onClick={(event) => {
                event.originalEvent.stopPropagation();
                setSelected(item);
              }}
            >
              <button className="rounded-full border border-white/20 bg-[#f97352] px-3 py-1 text-xs font-medium text-white shadow-[0_12px_30px_rgba(249,115,82,0.35)]">
                {item.neighborhood || "SP"}
              </button>
            </Marker>
          ))}

          {selected ? (
            <Popup
              longitude={selected.longitude ?? -46.6388}
              latitude={selected.latitude ?? -23.5489}
              closeOnClick={false}
              onClose={() => setSelected(null)}
              offset={18}
            >
              <div className="max-w-[240px] text-black">
                <p className="font-semibold">{selected.title}</p>
                <p className="mt-1 text-xs">{selected.neighborhood || selected.location}</p>
                <p className="mt-2 text-xs">{selected.couple_fit_reason}</p>
              </div>
            </Popup>
          ) : null}
        </Map>
      </div>
    </div>
  );
}

