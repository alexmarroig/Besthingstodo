"use client";

import { useMemo, useState } from "react";

import { getSavedItems, setSavedItems } from "../../lib/storage";

export default function SavedPage() {
  const [items, setItems] = useState<any[]>(getSavedItems());
  const [collection, setCollection] = useState("Favoritos");

  const grouped = useMemo(() => {
    return items.reduce((acc: Record<string, any[]>, item) => {
      const key = item.collection || "Favoritos";
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
      <div className="glass rounded-[2rem] p-6">
        <h2 className="text-3xl font-semibold">Coleções salvas</h2>
        <p className="mt-2 text-sm text-white/68">Organize o que vale revisitar por tema, humor ou momento do casal.</p>
      </div>

      <div className="glass rounded-[1.75rem] p-3">
        <input
          value={collection}
          onChange={(e) => setCollection(e.target.value)}
          className="w-full rounded-xl bg-white/10 p-3 text-sm"
          placeholder="Nome da coleção"
        />
      </div>

      <div className="space-y-3">
        {Object.keys(grouped).length === 0 ? <p className="text-sm text-white/60">Nenhuma experiência salva ainda.</p> : null}
        {Object.entries(grouped).map(([name, list]) => (
          <div key={name} className="glass rounded-[1.75rem] p-4">
            <h3 className="font-medium text-[#ffd166]">{name}</h3>
            <div className="mt-3 space-y-2">
              {list.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3 rounded-2xl bg-white/5 p-3">
                  <div>
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="text-xs text-white/60">{item.category}</p>
                  </div>
                  <button onClick={() => assignCollection(item.id)} className="rounded-xl bg-[#ff7a59] px-3 py-2 text-xs text-white">
                    Mover
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
