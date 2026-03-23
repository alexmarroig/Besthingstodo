"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";

import { ConciergeResponse } from "@life/shared-types";
import { askConcierge, fetchCoupleMe, fetchRecommendations, fetchUserContext } from "@/shared/api/client";
import { getConciergeMemory, getUserId, setConciergeMemory } from "@/shared/storage";

export default function ConciergeScreen() {
  const userId = getUserId();
  const [message, setMessage] = useState("Quero algo para hoje à noite que pareça date de verdade.");
  const [history, setHistory] = useState<Array<{ role: "user" | "assistant"; text: string }>>([]);
  const [memory, setMemory] = useState<string[]>([]);

  useEffect(() => {
    setMemory(getConciergeMemory());
  }, []);

  const { data: couple } = useQuery({ queryKey: ["couple-me"], queryFn: fetchCoupleMe });
  const { data: context } = useQuery({ queryKey: ["context", couple?.city || "Sao Paulo"], queryFn: () => fetchUserContext(couple?.city || "Sao Paulo") });
  const { data: recommendations } = useQuery({
    queryKey: ["concierge-recos", userId, couple?.city || "Sao Paulo", context?.weather || "unknown"],
    queryFn: () => fetchRecommendations(userId, couple?.city || "Sao Paulo", undefined, context?.weather || undefined, couple || undefined, context || undefined)
  });

  const mutation = useMutation<ConciergeResponse, Error, string>({
    mutationFn: (msg) =>
      askConcierge(userId, msg, {
        recommendations: recommendations || [],
        context: context!,
        couple: couple || undefined,
        memory
      }),
    onSuccess: (data, msg) => {
      setHistory((prev) => [...prev, { role: "user", text: msg }, { role: "assistant", text: data.intro }]);
      setMemory(data.memory);
      setConciergeMemory(data.memory);
    }
  });

  const response = mutation.data;
  const hasLiveRecommendations = (recommendations || []).length > 0;

  return (
    <section className="space-y-5">
      <div className="glass rounded-[2.2rem] p-6">
        <p className="text-[11px] uppercase tracking-[0.32em] text-[#f4d06f]">Curadoria guiada</p>
        <h2 className="mt-2 text-4xl font-semibold">Guia IA do casal</h2>
        <p className="mt-3 max-w-3xl text-sm text-white/68">
          Aqui a conversa serve para refinar, não para despejar texto. O foco é devolver opções estruturadas, lembrando restrições e o clima da noite.
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.78fr_1.22fr]">
        <aside className="editorial-card rounded-[2rem] p-5">
          <p className="text-[11px] uppercase tracking-[0.28em] text-[#f4d06f]">Memória curta</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {(memory.length ? memory : ["sem álcool", "sem lotação", "evitar curso"]).map((item) => (
              <span key={item} className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-sm text-white/74">
                {item}
              </span>
            ))}
          </div>

          <div className="mt-6 space-y-3 text-sm text-white/62">
            <p>Use frases como “quero algo coberto”, “não bebo”, “algo perto” ou “mais romântico”.</p>
            <p>Eu reaplico isso nas próximas sugestões para o app parecer lembrar de vocês.</p>
          </div>

          {history.length ? (
            <div className="mt-6 space-y-3 rounded-[1.4rem] border border-white/10 bg-white/4 p-4">
              {history.slice(-4).map((entry, index) => (
                <div key={`${entry.role}-${index}`} className="space-y-1">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-white/46">{entry.role === "user" ? "Vocês pediram" : "Leitura do concierge"}</p>
                  <p className="text-sm text-white/74">{entry.text}</p>
                </div>
              ))}
            </div>
          ) : null}
        </aside>

        <div className="space-y-4">
          <div className="editorial-card rounded-[2rem] p-5">
            <div className="flex gap-3">
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                rows={3}
                className="min-h-[104px] flex-1 rounded-[1.4rem] border border-white/8 bg-white/6 p-4 text-sm text-white outline-none"
                placeholder="Ex.: quero algo hoje à noite, mais íntimo, sem álcool e com clima protegido"
              />
              <button onClick={() => context && mutation.mutate(message)} className="h-fit rounded-full bg-[#f97352] px-5 py-3 text-sm font-medium text-white">
                Refinar
              </button>
            </div>
          </div>

          {response && response.options.length > 0 ? (
            <div className="space-y-4">
              <div className="rounded-[1.6rem] border border-white/10 bg-white/5 p-4">
                <p className="text-sm text-white/74">{response.intro}</p>
              </div>

              {response.options.map((option) => (
                <article key={option.title} className="editorial-card rounded-[2rem] p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.26em] text-[#f4d06f]">Plano sugerido</p>
                      <h3 className="mt-2 text-2xl font-semibold">{option.title}</h3>
                      <p className="mt-2 text-sm text-white/64">{option.summary}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {option.constraints_applied.map((item) => (
                        <span key={item} className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs text-white/68">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <div className="rounded-[1.4rem] border border-white/10 bg-white/5 p-4">
                      <p className="text-[11px] uppercase tracking-[0.24em] text-[#f4d06f]">Por que encaixa</p>
                      <p className="mt-2 text-sm text-white/74">{option.why_it_fits}</p>
                    </div>
                    <div className="rounded-[1.4rem] border border-white/10 bg-white/5 p-4">
                      <p className="text-[11px] uppercase tracking-[0.24em] text-[#f4d06f]">Leitura do clima</p>
                      <p className="mt-2 text-sm text-white/74">{option.weather_note}</p>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    {option.steps.map((step) => (
                      <span key={step} className="rounded-full border border-white/10 bg-white/4 px-3 py-2 text-xs text-white/68">
                        {step}
                      </span>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="editorial-card rounded-[2rem] p-5 text-sm text-white/70">
              {hasLiveRecommendations
                ? "O concierge vai devolver 2 ou 3 rotas claras, com motivo, restrições respeitadas e próximo passo em vez de texto corrido."
                : "Sem recomendações reais suficientes, o concierge não inventa respostas prontas. Assim que a base live estiver melhor, ele passa a responder só com conteúdo real."}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

