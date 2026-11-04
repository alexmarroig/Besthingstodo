export default function HomeLoading() {
  return (
    <div role="status" aria-label="Carregando descobertas" aria-busy="true" className="space-y-8 py-4">
      <span className="sr-only">Preparando suas descobertas.</span>
      <header className="space-y-4">
        <div className="h-3 w-44 rounded bg-white/10" />
        <div className="h-12 w-full max-w-xl rounded-lg bg-white/[0.08]" />
        <div className="h-4 w-2/3 max-w-sm rounded bg-white/[0.06]" />
      </header>
      <div className="space-y-4 rounded-[20px] border border-white/[0.07] bg-[#151c23] p-6 sm:p-8">
        <div className="h-3 w-28 rounded bg-[#d7bc88]/20" />
        <div className="h-9 w-56 max-w-full rounded bg-white/[0.08]" />
        <div className="h-4 w-2/3 rounded bg-white/[0.06]" />
      </div>
      <div className="h-12 rounded-xl border border-white/10 bg-white/[0.04]" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="h-28 rounded-2xl border border-white/[0.06] bg-white/[0.04]" />
        ))}
      </div>
    </div>
  );
}
