"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, Clapperboard, MapPin, Play, RefreshCw, Ticket, Tv } from "lucide-react";
import type { Recommendation } from "@life/shared-types";
import type { WatchAvailability as Availability } from "@/shared/watch-availability";

const linkClass = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f4d06f] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a121c]";

export default function WatchAvailability({ item }: { item: Recommendation }) {
  const [expanded, setExpanded] = useState(false);
  const media = item.category === "series" ? "tv" : "movie";
  const city = item.city || "São Paulo";
  const { data, isPending, isError, refetch, isFetching } = useQuery<Availability>({
    queryKey: ["watch-availability", media, item.id, item.title, item.release_year, city],
    queryFn: async ({ signal }) => {
      const params = new URLSearchParams({ title: item.title, media, city });
      // Use the TMDB URL to disambiguate films and TV series with the same numeric ID.
      const tmdb = item.url?.match(/themoviedb\.org\/(movie|tv)\/(\d+)/);
      if (tmdb && tmdb[1] === media) params.set("tmdbId", tmdb[2]);
      if (/^ingresso-\d+$/.test(item.id)) params.set("cinemaId", item.id.slice(9));
      if (item.release_year) params.set("year", String(item.release_year));
      const response = await fetch(`/api/watch-availability?${params}`, { signal });
      if (!response.ok) throw new Error("Não foi possível consultar a disponibilidade.");
      return response.json();
    },
    staleTime: 2 * 60_000,
    retry: 1,
  });

  const sessions = data?.cinema.sessions || [];
  const visibleSessions = expanded ? sessions : sessions.slice(0, 4);
  const searchUrl = `https://www.justwatch.com/br/busca?q=${encodeURIComponent(item.title)}`;

  return (
    <section aria-label="Onde assistir" className="space-y-6 border-t border-white/10 px-5 py-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-semibold text-white"><Play className="h-5 w-5 text-[#ff7a59]" />Onde assistir</h3>
          <p className="mt-1 text-xs text-white/55">Disponibilidade no Brasil{media === "movie" ? ` · Cinema em ${city}` : ""}</p>
        </div>
        <button type="button" aria-label="Atualizar disponibilidade" title="Atualizar disponibilidade" onClick={() => void refetch()} disabled={isFetching}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 text-white/65 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f4d06f] disabled:opacity-40">
          <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin motion-reduce:animate-none" : ""}`} />
        </button>
      </div>

      {isPending ? <p role="status" className="rounded-2xl bg-white/5 p-4 text-sm text-white/65">Consultando plataformas{media === "movie" ? " e sessões de cinema" : ""}…</p> : null}
      {isError ? <p role="alert" className="text-sm text-white/65">Não conseguimos consultar agora. Use o botão de atualizar ou confira no JustWatch.</p> : null}

      {media === "movie" && data ? (
        <div className="space-y-3">
          <h4 className="flex items-center gap-2 text-sm font-semibold text-white"><Clapperboard className="h-4 w-4 text-[#f4d06f]" />No cinema</h4>
          {visibleSessions.length > 0 ? (
            <div className="space-y-2">
              {visibleSessions.map(session => (
                <div key={session.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white">{session.theater}</p>
                    <p className="mt-1 text-xs text-white/55">{new Date(session.startsAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })} · {session.formats.join(" · ") || session.room}</p>
                    {session.neighborhood ? <p className="mt-1 flex items-center gap-1 text-xs text-white/45"><MapPin className="h-3 w-3" />{session.neighborhood}</p> : null}
                  </div>
                  <a href={session.url} target="_blank" rel="noopener noreferrer" className={`${linkClass} bg-[#ff7a59] text-[#190b06] hover:bg-[#ff9479]`}>
                    <Ticket className="h-4 w-4" />Comprar ingresso<ArrowUpRight className="h-3.5 w-3.5" />
                  </a>
                </div>
              ))}
              {sessions.length > 4 ? <button type="button" onClick={() => setExpanded(!expanded)} className={`${linkClass} w-full border border-white/10 text-white/75 hover:bg-white/5`}>{expanded ? "Mostrar menos sessões" : `Ver todas as ${sessions.length} sessões`}</button> : null}
              <p className="text-[11px] text-white/45">Programação via Ingresso.com. Horários e disponibilidade podem mudar até a compra.</p>
            </div>
          ) : <p className="text-sm text-white/60">{data.cinema.status === "unsupported" ? "A consulta de sessões está disponível para São Paulo."
            : data.cinema.status === "unavailable" ? "A programação dos cinemas não respondeu agora. Tente atualizar."
            : "Nenhuma sessão confirmada em São Paulo nesta consulta."}</p>}
          {data.cinema.url ? <a href={data.cinema.url} target="_blank" rel="noopener noreferrer" className={`${linkClass} border border-[#f4d06f]/25 text-[#f4d06f] hover:bg-[#f4d06f]/10`}><Ticket className="h-4 w-4" />Ver programação na Ingresso.com<ArrowUpRight className="h-3.5 w-3.5" /></a> : null}
        </div>
      ) : null}

      <div className="space-y-3">
        <h4 className="flex items-center gap-2 text-sm font-semibold text-white"><Tv className="h-4 w-4 text-[#38bdf8]" />Em casa</h4>
        {data?.streaming.groups.map(group => (
          <div key={group.kind}>
            <p className="mb-2 text-xs text-white/55">{group.label}</p>
            <div className="flex flex-wrap gap-2">
              {group.providers.map(provider => (
                <div key={provider.id} className="flex min-h-11 items-center gap-2.5 rounded-xl border border-white/10 bg-white/5 py-2 pl-2 pr-3">
                  {provider.logo ? <img src={provider.logo} alt="" className="h-8 w-8 rounded-lg object-cover" loading="lazy" onError={e => { e.currentTarget.style.display = "none"; }} /> : <Tv className="h-6 w-6 text-white/45" />}
                  <span className="text-sm font-medium text-white/85">{provider.name}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
        {data && !data.streaming.groups.length ? <p className="text-sm text-white/60">{data.streaming.status === "unavailable" ? "Não foi possível confirmar as plataformas agora." : "Nenhuma oferta de streaming informada para o Brasil."}</p> : null}
        <a href={data?.streaming.url || searchUrl} target="_blank" rel="noopener noreferrer" className={`${linkClass} w-full border border-white/15 bg-white/5 text-white hover:bg-white/10 sm:w-auto`}>
          <Play className="h-4 w-4" />{data?.streaming.url ? "Acessar opções para assistir" : "Consultar no JustWatch"}<ArrowUpRight className="h-3.5 w-3.5" />
        </a>
        <p className="text-[11px] leading-relaxed text-white/40">Disponibilidade de streaming por <a href="https://www.justwatch.com/br" target="_blank" rel="noopener noreferrer" className="underline hover:text-white/70">JustWatch</a>, via TMDB. O acesso depende da assinatura ou oferta de cada plataforma.</p>
      </div>
    </section>
  );
}
