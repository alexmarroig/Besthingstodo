"use client";

import { useMemo, useState } from "react";

import { getSavedItems, setSavedItems } from "../../lib/storage";

export default function SavedPage() {
  const [items, setItems] = useState<any[]>(getSavedItems());
  const [collection, setCollection] = useState("Favorites");

  const grouped = useMemo(() => {
    return items.reduce((acc: Record<string, any[]>, item) => {
      const key = item.collection || "Favorites";
      acc[key] = acc[key] || [];
      acc[key].push(item);
      return acc;
    }, {});
  }, [items]);

  const assignCollection = (id: string) => {
    const next = items.map((x) => (x.id === id ? { ...x, collection } : x));
    setItems(next);
    setSavedItems(next);
  };

  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-semibold">Saved</h2>
      <div className="glass rounded-2xl p-3">
        <input value={collection} onChange={(e) => setCollection(e.target.value)} className="w-full rounded-xl bg-white/10 p-2 text-sm" />
      </div>
      <div className="space-y-3">
        {Object.keys(grouped).length === 0 ? <p className="text-sm text-white/60">No saved experiences yet.</p> : null}
        {Object.entries(grouped).map(([name, list]) => (
          <div key={name} className="glass rounded-2xl p-4">
            <h3 className="font-medium text-accent">{name}</h3>
            <div className="mt-3 space-y-2">
              {list.map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded-xl bg-white/5 p-3">
                  <div>
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="text-xs text-white/60">{item.category}</p>
                  </div>
                  <button onClick={() => assignCollection(item.id)} className="rounded-lg bg-primary px-3 py-1 text-xs">Assign</button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

