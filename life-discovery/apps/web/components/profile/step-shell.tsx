"use client";

import Link from "next/link";

export function StepShell({
  step,
  totalSteps,
  title,
  subtitle,
  children,
  onBack,
  onNext,
  onSkip,
  nextLabel = "Continuar",
  isLast = false,
}: {
  step: number;
  totalSteps: number;
  title: string;
  subtitle: string;
  children: React.ReactNode;
  onBack?: () => void;
  onNext: () => void;
  onSkip?: () => void;
  nextLabel?: string;
  isLast?: boolean;
}) {
  const progress = Math.round(((step + 1) / totalSteps) * 100);

  return (
    <div className="space-y-6">
      <div className="glass rounded-[2.2rem] p-6">
        <div className="flex items-center justify-between gap-4">
          <p className="text-[11px] uppercase tracking-[0.32em] text-[#f4d06f]">
            Etapa {step + 1} de {totalSteps}
          </p>
          {onSkip ? (
            <button type="button" onClick={onSkip} className="text-xs text-white/50 hover:text-white/75">
              Pular por agora
            </button>
          ) : null}
        </div>
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-[#f97352] transition-all" style={{ width: `${progress}%` }} />
        </div>
        <h1 className="mt-5 text-3xl font-semibold text-white md:text-4xl">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm text-white/68">{subtitle}</p>
      </div>

      <div className="editorial-card rounded-[2rem] p-5 md:p-6">{children}</div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="rounded-full border border-white/12 bg-white/6 px-5 py-2.5 text-sm text-white/75"
            >
              Voltar
            </button>
          ) : (
            <Link href="/" className="rounded-full border border-white/12 bg-white/6 px-5 py-2.5 text-sm text-white/75">
              Home
            </Link>
          )}
        </div>
        <button
          type="button"
          onClick={onNext}
          className="rounded-full bg-[#f97352] px-6 py-3 text-sm font-medium text-white shadow-[0_16px_30px_rgba(249,115,82,0.22)]"
        >
          {isLast ? "Concluir e ver recomendações" : nextLabel}
        </button>
      </div>
    </div>
  );
}
