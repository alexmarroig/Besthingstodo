"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Globe, Loader2, Sparkles, CheckCircle2, AlertCircle, X } from "lucide-react";

import ExperienceImage from "./experience-image";
import { ingestExternalExperience } from "@/shared/api/client";
import { localizeCategory } from "@/shared/labels-pt";
import type { Recommendation } from "@life/shared-types";

const QUICK_SUGGESTIONS = [
  "Cinemateca Brasileira",
  "Casa de Francisca",
  "Museu da Língua Portuguesa",
  "Sesc Pompeia",
  "Instituto Tomie Ohtake",
];

export default function SmartCaptureModal({
  open,
  onClose,
  city = "São Paulo",
  onCaptured,
}: {
  open: boolean;
  onClose: () => void;
  city?: string;
  onCaptured?: (item: Recommendation) => void;
}) {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [capturedItem, setCapturedItem] = useState<Recommendation | null>(null);

  if (!open) return null;

  const handleCapture = async (inputQuery?: string) => {
    const target = (inputQuery ?? query).trim();
    if (!target || loading) return;

    setLoading(true);
    setError(null);
    setCapturedItem(null);

    const result = await ingestExternalExperience(target, city);
    setLoading(false);

    if (result.error || !result.item) {
      setError(result.error || "Não foi possível extrair os dados deste endereço ou local.");
      return;
    }

    setCapturedItem(result.item);
    setQuery("");
    queryClient.invalidateQueries({ queryKey: ["recommendation-sources"] });
    onCaptured?.(result.item);
  };

  const handleResetAndClose = () => {
    setError(null);
    setCapturedItem(null);
    setQuery("");
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/65 p-0 backdrop-blur-md sm:items-center sm:p-4"
      onClick={handleResetAndClose}
    >
      <div
        className="surface-strong flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-t-[1.85rem] ring-1 ring-white/12 sm:rounded-[1.85rem]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Capturar link ou lugar externo"
      >
        <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#ff7a59]/15 text-[#ff7a59]">
              <Globe className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-semibold text-white">Captura Inteligente Web & Lugares</p>
              <p className="text-[11px] text-white/50">
                Extrai dados, fotos, bairro e classifica com IA automaticamente
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleResetAndClose}
            className="rounded-full p-1.5 text-white/50 transition hover:bg-white/10 hover:text-white"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto p-5">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleCapture();
            }}
            className="space-y-3"
          >
            <label className="block text-xs font-medium text-white/70">
              Cole uma URL (Sympla, Guia Folha, site de restaurante) ou digite o nome de um lugar/filme:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ex.: https://... ou Cinemateca Brasileira"
                className="min-w-0 flex-1 rounded-2xl border border-white/12 bg-white/[0.05] px-4 py-3 text-sm text-white placeholder:text-white/35 focus:border-[#ff7a59]/60 focus:outline-none"
              />
              <button
                type="submit"
                disabled={loading || !query.trim()}
                className="btn-primary shrink-0 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Capturando…</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span>Capturar</span>
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="space-y-2">
            <p className="text-[11px] font-medium uppercase tracking-wider text-white/40">
              Testar captura instantânea:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    setQuery(suggestion);
                    void handleCapture(suggestion);
                  }}
                  className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-white/70 transition hover:border-[#ff7a59]/40 hover:bg-white/[0.08] hover:text-white disabled:opacity-50"
                >
                  + {suggestion}
                </button>
              ))}
            </div>
          </div>

          {error ? (
            <div className="flex items-start gap-2.5 rounded-2xl border border-rose-500/25 bg-rose-500/10 p-3.5 text-xs text-rose-200">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          ) : null}

          {capturedItem ? (
            <div className="space-y-3 rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.06] p-4">
              <div className="flex items-center gap-2 text-xs font-medium text-emerald-300">
                <CheckCircle2 className="h-4 w-4" />
                <span>Capturado, salvo nos favoritos e integrado ao motor de aprendizado!</span>
              </div>

              <div className="experience-card overflow-hidden">
                <div className="relative aspect-[16/9] w-full">
                  <ExperienceImage item={capturedItem} mode="hero" className="h-full w-full" />
                </div>
                <div className="space-y-2 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h4 className="text-base font-semibold text-white">{capturedItem.title}</h4>
                    <span className="pill-accent text-[10px]">
                      {localizeCategory(capturedItem.category)} · {capturedItem.neighborhood}
                    </span>
                  </div>
                  <p className="line-clamp-2 text-xs leading-relaxed text-white/65">
                    {capturedItem.description}
                  </p>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {(capturedItem.tags || []).slice(0, 4).map((tag) => (
                      <span key={tag} className="pill px-2.5 py-0.5 text-[10px]">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
