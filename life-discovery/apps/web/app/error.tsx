"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[App Error Boundary]:", error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[65vh] max-w-lg flex-col items-center justify-center px-4 text-center">
      <div className="surface-strong w-full space-y-4 rounded-[2rem] p-6 sm:p-8">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-400">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h2 className="font-display text-2xl font-semibold text-white">
          Recuperação automática ativada
        </h2>
        <p className="text-sm leading-relaxed text-white/65">
          Ocorreu uma exceção inesperada ao processar esta visualização, mas seus dados locais e o aprendizado do
          casal estão preservados.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => reset()}
            className="btn-primary gap-2 text-xs sm:text-sm"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Tentar novamente</span>
          </button>
          <Link href="/home" className="btn-ghost gap-2 text-xs sm:text-sm">
            <Home className="h-4 w-4" />
            <span>Voltar para Hoje</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
