"use client";

import { useState } from "react";
import { BrainCircuit, ChevronDown, ChevronUp, Globe, RotateCcw, Sparkles } from "lucide-react";
import type { MLInsights } from "@/features/catalog/ml/engine";

export default function NeuralRadarPanel({
  insights,
  onOpenCapture,
  onResetLearning,
}: {
  insights: MLInsights;
  onOpenCapture: () => void;
  onResetLearning: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="surface-strong overflow-hidden rounded-[1.75rem] border border-white/10 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#ff7a59]/25 to-[#f4d06f]/20 text-[#f4d06f] ring-1 ring-[#f4d06f]/30">
            <BrainCircuit className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#f4d06f]">
                IA de Aprendizado Contínuo
              </span>
              <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-300 ring-1 ring-emerald-500/30">
                {insights.totalSignals > 0 ? `${insights.confidencePercent}% de calibração estimada` : "Aguardando suas preferências"}
              </span>
            </div>
            <p className="mt-0.5 truncate text-xs text-white/65">
              {insights.lastSignalSummary
                ? `Último ajuste: ${insights.lastSignalSummary}`
                : `Estilo detectado: ${insights.dominantStyle} · ${insights.totalSignals} interações`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenCapture}
            className="btn-primary gap-1.5 px-3.5 py-2 text-xs shadow-none"
          >
            <Globe className="h-3.5 w-3.5" />
            <span>Capturar link / lugar</span>
          </button>

          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            className="btn-ghost gap-1 px-3 py-2 text-xs"
            aria-expanded={expanded}
          >
            <span>{expanded ? "Ocultar IA" : "Ver radar IA"}</span>
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {/* Quick learned signals bar */}
      <div className="mt-3.5 flex flex-wrap items-center gap-1.5 border-t border-white/[0.06] pt-3">
        <span className="text-[11px] text-white/45">Afinidades ativas:</span>
        {(insights.topLearnedTags.length
          ? insights.topLearnedTags
          : []
        )
          .slice(0, 5)
          .map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-full bg-white/[0.06] px-2.5 py-0.5 text-[11px] text-white/80"
            >
              <Sparkles className="h-2.5 w-2.5 text-[#f4d06f]" />
              {tag}
            </span>
          ))}
        {insights.topNeighborhoods.slice(0, 2).map((nb) => (
          <span
            key={nb}
            className="rounded-full border border-[#ff7a59]/25 bg-[#ff7a59]/10 px-2.5 py-0.5 text-[11px] text-[#ffb89a]"
          >
            📍 {nb}
          </span>
        ))}
      </div>

      {expanded ? (
        <div className="mt-4 grid gap-4 border-t border-white/[0.07] pt-4 sm:grid-cols-3">
          <div className="space-y-2 rounded-2xl bg-white/[0.03] p-3.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-white/45">
              Pesos por Domínio (Online SGD)
            </p>
            <div className="space-y-2">
              {insights.preferredDomains.map((dom) => (
                <div key={dom.domain} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-white/75">{dom.label}</span>
                    <span className="font-semibold text-[#f4d06f]">{dom.weight}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#ff7a59] to-[#f4d06f] transition-all duration-500"
                      style={{ width: `${dom.weight}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2 rounded-2xl bg-white/[0.03] p-3.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-white/45">
              Balanço Contextual Bandit (UCB1)
            </p>
            <p className="text-xs leading-relaxed text-white/70">
              O algoritmo combina <strong>{100 - insights.explorationRate}% de priorização</strong> dos gostos
              confirmados com <strong>{insights.explorationRate}% de exploração</strong> para descobrir
              novos lugares em SP.
            </p>
            <div className="pt-1 text-[11px] text-white/50">
              Sinais explícitos: <strong className="text-white">{insights.explicitSignals}</strong> · Sinais
              implícitos: <strong className="text-white">{insights.implicitSignals}</strong>
            </div>
          </div>

          <div className="flex flex-col justify-between space-y-3 rounded-2xl bg-white/[0.03] p-3.5">
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-white/45">
                Padrões Penalizados / Evitados
              </p>
              <div className="flex flex-wrap gap-1.5">
                {(insights.avoidedSignals.length
                  ? insights.avoidedSignals
                  : []
                ).map((sig) => (
                  <span
                    key={sig}
                    className="rounded-full bg-rose-500/15 px-2.5 py-0.5 text-[10px] text-rose-300"
                  >
                    ✕ {sig}
                  </span>
                ))}
              </div>
            </div>

            {insights.totalSignals > 0 ? (
              <button
                type="button"
                onClick={onResetLearning}
                className="inline-flex items-center gap-1.5 self-start rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] text-white/60 transition hover:border-white/25 hover:text-white"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Reiniciar memória de cliques</span>
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
