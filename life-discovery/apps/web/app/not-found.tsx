import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[65vh] max-w-lg flex-col items-center justify-center px-4 text-center">
      <div className="surface-strong w-full space-y-4 rounded-[2rem] p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#f4d06f]">Página não encontrada</p>
        <h2 className="font-display text-2xl font-semibold text-white">Rota fora do mapa</h2>
        <p className="text-sm leading-relaxed text-white/65">
          Este endereço não existe ou foi movido. Volte para o roteiro principal de São Paulo.
        </p>
        <div className="pt-2">
          <Link href="/home" className="btn-primary text-xs sm:text-sm">
            Ir para o roteiro de hoje
          </Link>
        </div>
      </div>
    </div>
  );
}
