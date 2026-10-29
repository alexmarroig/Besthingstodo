"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bookmark, BrainCircuit, Globe, Trash2, FolderPlus, RotateCcw } from "lucide-react";

import ExperienceImage from "@/components/discovery/experience-image";
import MediaDetailModal from "@/components/discovery/media-detail-modal";
import SmartCaptureModal from "@/components/discovery/smart-capture-modal";
import { fetchCoupleMe } from "@/shared/api/client";
import { useContinualLearning } from "@/shared/hooks/use-continual-learning";
import { localizeCategory } from "@/shared/labels-pt";
import {
  getSavedItems,
  getUserId,
  ML_UPDATE_EVENT,
  removeSavedItem,
  setSavedItems,
} from "@/shared/storage";
import type { Recommendation } from "@life/shared-types";

const PRESET_COLLECTIONS = [
  "Favoritos",
  "Próximo Date",
  "Restaurantes",
  "Cultura & Museus",
  "Assistir Juntos",
];

const SIGNAL_BADGES: Record<string, { label: string; color: string }> = {
  favorite: { label: "★ Favorito do Casal", color: "bg-[#f4d06f]/20 text-[#f4d06f]" },
  like: { label: "✓ Curtido (IA +)", color: "bg-emerald-500/20 text-emerald-300" },
  save: { label: "♡ Salvo", color: "bg-sky-500/20 text-sky-300" },
  click_cta: { label: "↗ Link / Mapa aberto", color: "bg-indigo-500/20 text-indigo-300" },
  dwell: { label: "⏱ Leitura atenta", color: "bg-purple-500/20 text-purple-300" },
  view: { label: "👁 Visualizado", color: "bg-white/10 text-white/65" },
  skip: { label: "⏭ Pulado", color: "bg-amber-500/15 text-amber-300" },
  dislike: { label: "✕ Ocultado (IA -)", color: "bg-rose-500/20 text-rose-300" },
};

export default function SavedPage() {
  const userId = getUserId();
  const [items, setItems] = useState<any[]>(() => getSavedItems());
  const [activeCollection, setActiveCollection] = useState<string>("Todas");
  const [targetCollection, setTargetCollection] = useState("Próximo Date");
  const [viewMode, setViewMode] = useState<"collections" | "ml_history">("collections");
  const [selectedItem, setSelectedItem] = useState<Recommendation | null>(null);
  const [captureOpen, setCaptureOpen] = useState(false);

  const { data: couple } = useQuery({ queryKey: ["couple-me"], queryFn: fetchCoupleMe });
  const { feedbackHistory, insights, undoFeedback, resetLearning } = useContinualLearning(couple, null);

  useEffect(() => {
    const sync = () => setItems(getSavedItems());
    window.addEventListener(ML_UPDATE_EVENT, sync);
    return () => window.removeEventListener(ML_UPDATE_EVENT, sync);
  }, []);

  const collections = useMemo(() => {
    const names = new Set<string>(["Todas", ...PRESET_COLLECTIONS]);
    for (const item of items) {
      if (item.collection) names.add(item.collection);
    }
    return Array.from(names);
  }, [items]);

  const filteredItems = useMemo(() => {
    if (activeCollection === "Todas") return items;
    return items.filter((item) => (item.collection || "Favoritos") === activeCollection);
  }, [items, activeCollection]);

  const assignCollection = (id: string, collectionName: string) => {
    const next = items.map((x) => (x.id === id ? { ...x, collection: collectionName } : x));
    setItems(next);
    setSavedItems(next);
  };

  const handleRemove = (id: string) => {
    removeSavedItem(id);
    setItems(getSavedItems());
  };

  return (
    <section className="space-y-7">
      <header className="hero-mesh rounded-[2rem] border border-white/10 p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#f4d06f]">
              Curadoria Pessoal & Memória Neural
            </p>
            <h2 className="font-display text-3xl font-semibold text-white sm:text-4xl">
              Coleções & Aprendizado
            </h2>
            <p className="max-w-xl text-sm leading-relaxed text-white/65">
              Organize os lugares salvos por clima de encontro, capture novos links externos e acompanhe tudo o que o
              algoritmo aprendeu com as escolhas de vocês.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setCaptureOpen(true)}
            className="btn-primary gap-2 text-xs sm:text-sm"
          >
            <Globe className="h-4 w-4" />
            <span>Capturar link / lugar</span>
          </button>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setViewMode("collections")}
            className={
              viewMode === "collections"
                ? "btn-primary gap-2 py-2 text-xs shadow-none"
                : "btn-ghost gap-2 py-2 text-xs"
            }
          >
            <Bookmark className="h-3.5 w-3.5" />
            <span>Coleções Salvas ({items.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("ml_history")}
            className={
              viewMode === "ml_history"
                ? "btn-primary gap-2 py-2 text-xs shadow-none"
                : "btn-ghost gap-2 py-2 text-xs"
            }
          >
            <BrainCircuit className="h-3.5 w-3.5" />
            <span>Histórico de Aprendizado IA ({feedbackHistory.length})</span>
          </button>
        </div>
      </header>

      {viewMode === "collections" ? (
        <div className="space-y-6">
          {/* Collection filter tabs + custom target */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {collections.map((col) => (
                <button
                  key={col}
                  type="button"
                  onClick={() => setActiveCollection(col)}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
                    activeCollection === col
                      ? "bg-[#ff7a59] text-white"
                      : "border border-white/10 bg-white/[0.04] text-white/70 hover:text-white"
                  }`}
                >
                  {col}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <FolderPlus className="h-4 w-4 text-white/45" />
              <input
                value={targetCollection}
                onChange={(e) => setTargetCollection(e.target.value)}
                className="w-44 rounded-full border border-white/10 bg-white/[0.05] px-3.5 py-1.5 text-xs text-white placeholder:text-white/40 focus:border-[#ff7a59]/50 focus:outline-none"
                placeholder="Mover para coleção..."
              />
            </div>
          </div>

          {filteredItems.length === 0 ? (
            <div className="surface p-8 text-center">
              <p className="font-display text-lg font-semibold text-white">
                Nenhuma experiência nesta coleção ainda
              </p>
              <p className="mt-1 text-sm text-white/55">
                Toque no ícone ♡ em qualquer card da Home ou capture um link externo agora mesmo.
              </p>
              <button
                type="button"
                onClick={() => setCaptureOpen(true)}
                className="btn-primary mt-4 text-xs"
              >
                + Capturar lugar ou link da web
              </button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredItems.map((item) => (
                <article
                  key={item.id}
                  className="experience-card flex flex-col justify-between overflow-hidden"
                >
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedItem(item)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") setSelectedItem(item);
                    }}
                    className="cursor-pointer"
                  >
                    <div className="relative aspect-[16/10] w-full">
                      <ExperienceImage item={item} mode="tile" className="h-full w-full" />
                    </div>
                    <div className="space-y-1.5 p-4">
                      <div className="flex items-center justify-between gap-2">
                        <span className="pill-accent text-[10px]">
                          {item.collection || "Favoritos"}
                        </span>
                        <span className="text-[11px] text-white/45">
                          {localizeCategory(item.category)}
                        </span>
                      </div>
                      <h3 className="line-clamp-1 text-base font-semibold text-white">{item.title}</h3>
                      {item.description ? (
                        <p className="line-clamp-2 text-xs leading-relaxed text-white/60">
                          {item.description}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 border-t border-white/[0.06] px-4 py-3">
                    <button
                      type="button"
                      onClick={() => assignCollection(item.id, targetCollection || "Favoritos")}
                      className="btn-ghost py-1.5 px-3 text-[11px]"
                    >
                      Mover p/ &quot;{targetCollection || "Favoritos"}&quot;
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemove(item.id)}
                      className="rounded-full p-1.5 text-white/45 transition hover:bg-rose-500/15 hover:text-rose-300"
                      title="Remover dos salvos"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          <div className="surface flex flex-wrap items-center justify-between gap-4 p-5">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-white">
                Maturidade do Modelo: {insights.confidencePercent}% ({insights.dominantStyle})
              </p>
              <p className="text-xs text-white/60">
                Cada interação ajusta os pesos semânticos, bairros preferidos e filtros de restrição do casal.
              </p>
            </div>
            {feedbackHistory.length > 0 ? (
              <button
                type="button"
                onClick={resetLearning}
                className="btn-ghost gap-1.5 text-xs text-rose-300 hover:border-rose-400/40"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Zerar histórico de aprendizado</span>
              </button>
            ) : null}
          </div>

          {feedbackHistory.length === 0 ? (
            <div className="surface p-8 text-center text-sm text-white/55">
              Nenhuma interação registrada ainda. Curta, salve ou explore cards na Home para ver o motor aprender em
              tempo real!
            </div>
          ) : (
            <div className="space-y-2.5">
              {[...feedbackHistory]
                .reverse()
                .slice(0, 50)
                .map((entry, idx) => {
                  const badge = SIGNAL_BADGES[entry.feedback_type] || SIGNAL_BADGES.view;
                  return (
                    <div
                      key={`${entry.experience_id}-${entry.timestamp}-${idx}`}
                      className="surface flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${badge.color}`}>
                            {badge.label}
                          </span>
                          <p className="truncate text-sm font-medium text-white">
                            {entry.title || entry.experience_id}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-white/45">
                          <span>
                            {new Date(entry.timestamp).toLocaleString("pt-BR", {
                              day: "2-digit",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          {entry.neighborhood ? <span>· 📍 {entry.neighborhood}</span> : null}
                          {entry.tags?.length ? (
                            <span>· Tags: {entry.tags.slice(0, 3).join(", ")}</span>
                          ) : null}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => undoFeedback(entry.experience_id)}
                        className="btn-ghost px-3 py-1 text-[11px]"
                      >
                        Desfazer sinal
                      </button>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      <MediaDetailModal
        item={selectedItem}
        userId={userId}
        onClose={() => setSelectedItem(null)}
      />

      <SmartCaptureModal
        open={captureOpen}
        onClose={() => setCaptureOpen(false)}
        city={couple?.city || "São Paulo"}
        onCaptured={(newItem) => {
          setItems(getSavedItems());
          setSelectedItem(newItem);
        }}
      />
    </section>
  );
}
