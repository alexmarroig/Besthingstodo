"use client";

import { useMemo, useState } from "react";

import { getAgendaItems, setAgendaItems } from "../../lib/storage";

export default function AgendaPage() {
  const [items, setItems] = useState<any[]>(getAgendaItems());

  const byDate = useMemo(() => {
    return items.reduce((acc: Record<string, any[]>, item) => {
      const key = item.date || "Sem data";
      acc[key] = acc[key] || [];
      acc[key].push(item);
      return acc;
    }, {});
  }, [items]);

  const removeItem = (id: string) => {
    const next = items.filter((x) => x.id !== id);
    setItems(next);
    setAgendaItems(next);
  };

  return (
    <section className="space-y-4">
      <div className="glass rounded-[2rem] p-6">
        <h2 className="text-3xl font-semibold">Agenda do casal</h2>
        <p className="mt-2 text-sm text-white/68">Tudo o que foi salvo para depois vira uma agenda rápida de consulta e limpeza.</p>
      </div>

      <div className="space-y-3">
        {Object.keys(byDate).length === 0 ? <p className="text-sm text-white/60">Nenhuma experiência agendada ainda.</p> : null}
        {Object.entries(byDate).map(([date, list]) => (
          <div key={date} className="glass rounded-[1.75rem] p-4">
            <h3 className="font-medium text-[#ffd166]">{date}</h3>
            <div className="mt-3 space-y-2">
              {list.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3 rounded-2xl bg-white/5 p-3">
                  <div>
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="text-xs text-white/60">{item.location || "São Paulo"}</p>
                  </div>
                  <button onClick={() => removeItem(item.id)} className="rounded-xl bg-white/10 px-3 py-2 text-xs">Remover</button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
