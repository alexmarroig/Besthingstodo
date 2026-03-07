"use client";

import { useMemo, useState } from "react";
import Map, { Marker, Popup } from "react-map-gl";
import "mapbox-gl/dist/mapbox-gl.css";

import { Recommendation } from "../../lib/types";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

export default function ExperienceMap({ items }: { items: Recommendation[] }) {
  const [selected, setSelected] = useState<Recommendation | null>(null);
  const [filters, setFilters] = useState<string[]>([]);

  const filtered = useMemo(() => {
    return items.filter((x) => {
      if (filters.includes("free") && (x.price || 0) > 0) return false;
      if (filters.includes("quiet") && !(x.tags || []).join(" ").toLowerCase().includes("quiet")) return false;
      if (filters.includes("romantic") && !(x.tags || []).join(" ").toLowerCase().includes("romantic")) return false;
      return true;
    });
  }, [items, filters]);

  const toggle = (f: string) => setFilters((prev) => (prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]));

  if (!MAPBOX_TOKEN) {
    return (
      <div className="space-y-3">
        <div className="glass rounded-2xl p-4 text-sm text-white/70">
          Mapbox token not set. Showing nearby list mode.
        </div>
        <div className="flex flex-wrap gap-2">
          {["today", "nearby", "free", "quiet", "romantic"].map((f) => (
            <button
              key={f}
              onClick={() => toggle(f)}
              className={`rounded-full px-3 py-1 text-xs ${filters.includes(f) ? "bg-primary" : "bg-white/10"}`}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="space-y-2">
          {filtered.map((item, i) => (
            <button
              key={`${item.id}-${i}`}
              onClick={() => setSelected(item)}
              className="glass flex w-full items-center justify-between rounded-xl p-3 text-left"
            >
              <div>
                <p className="text-sm font-medium">{item.title}</p>
                <p className="text-xs text-white/60">{item.location || item.city}</p>
              </div>
              <span className="rounded-full bg-white/10 px-2 py-1 text-xs">{item.category}</span>
            </button>
          ))}
          {selected ? (
            <div className="glass rounded-xl p-4">
              <p className="font-semibold">{selected.title}</p>
              <p className="text-sm text-white/70">{selected.description || selected.reason}</p>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {["today", "nearby", "free", "quiet", "romantic"].map((f) => (
          <button
            key={f}
            onClick={() => toggle(f)}
            className={`rounded-full px-3 py-1 text-xs ${filters.includes(f) ? "bg-primary" : "bg-white/10"}`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10">
        <Map
          initialViewState={{ longitude: -46.668, latitude: -23.625, zoom: 11 }}
          style={{ width: "100%", height: 500 }}
          mapStyle="mapbox://styles/mapbox/dark-v11"
          mapboxAccessToken={MAPBOX_TOKEN}
        >
          {filtered.map((item, i) => (
            <Marker
              key={`${item.id}-${i}`}
              longitude={item.longitude ?? -46.668 + i * 0.01}
              latitude={item.latitude ?? -23.625 + i * 0.005}
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                setSelected(item);
              }}
            >
              <div className="h-3 w-3 rounded-full bg-accent shadow-glow" />
            </Marker>
          ))}

          {selected ? (
            <Popup
              longitude={selected.longitude ?? -46.668}
              latitude={selected.latitude ?? -23.625}
              closeOnClick={false}
              onClose={() => setSelected(null)}
            >
              <div className="text-black">
                <p className="font-semibold">{selected.title}</p>
                <p className="text-xs">{selected.location}</p>
              </div>
            </Popup>
          ) : null}
        </Map>
      </div>
    </div>
  );
}

