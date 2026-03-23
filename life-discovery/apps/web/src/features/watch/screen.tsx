"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import DiscoveryCard from "@/components/discovery/discovery-card";
import { buildFallbackContext, buildWatchRecommendations } from "@/features/catalog/curation";
import { fetchCoupleMe, fetchRecommendations, fetchUserContext } from "@/shared/api/client";
import { getUserId } from "@/shared/storage";
import { Recommendation } from "@life/shared-types";

function extractScreenFavorites(couple: any) {
  const titles = couple?.profile?.couple_profile_json?.interests?.cinema?.favorite_titles || [];
  const series = couple?.profile?.couple_profile_json?.interests?.series || [];
  return [...titles, ...series].filter(Boolean).slice(0, 4);
}

function hasTag(item: Recommendation, tags: string[]) {
  const haystack = [item.title, item.description, ...(item.tags || [])].join(" ").toLowerCase();
  return tags.some((tag) => haystack.includes(tag.toLowerCase()));
}

function groupMoviesByGenre(items: Recommendation[]) {
  return [
    {
      key: "suspense",
      title: "Suspense e misterio",
      subtitle: "Viradas, tensao e filmes para conversar depois.",
      items: items.filter((item) => hasTag(item, ["suspense", "mystery", "plot twist", "thriller", "smart"]))
    },
    {
      key: "romance",
      title: "Romance adulto",
      subtitle: "Filmes para noite mais emotiva e intimista.",
      items: items.filter((item) => hasTag(item, ["romantic", "romance", "adult romance", "emotional"]))
    },
    {
      key: "conforto",
      title: "Conforto e desaceleracao",
      subtitle: "Quando a ideia e ficar junto sem peso nem excesso de estimulo.",
      items: items.filter((item) => hasTag(item, ["calm", "cozy", "slow cinema", "comfort", "warm"]))
    }
  ]
    .map((group) => ({ ...group, items: group.items.slice(0, 3) }))
    .filter((group) => group.items.length > 0);
}

function groupSeriesByVibe(items: Recommendation[]) {
  return [
    {
      key: "afetivo",
      title: "Drama afetivo",
      subtitle: "Series para ver junto e sair mais perto um do outro.",
      items: items.filter((item) => hasTag(item, ["comfort", "emotional", "warm", "couple favorite"]))
    },
    {
      key: "misterio",
      title: "Misterio inteligente",
      subtitle: "Quando voces querem teoria, tensao e conversa longa depois.",
      items: items.filter((item) => hasTag(item, ["mystery", "plot twist", "smart", "thriller"]))
    },
    {
      key: "culinaria",
      title: "Comida e caos",
      subtitle: "Para noites em que cozinha, ritmo e personagens fortes fazem mais sentido.",
      items: items.filter((item) => hasTag(item, ["food", "chef", "kitchen"]))
    }
  ]
    .map((group) => ({ ...group, items: group.items.slice(0, 3) }))
    .filter((group) => group.items.length > 0);
}

export default function WatchScreen() {
  const userId = getUserId();
  const { data: couple } = useQuery({ queryKey: ["couple-me"], queryFn: fetchCoupleMe });
  const { data: context } = useQuery({ queryKey: ["context", couple?.city || "Sao Paulo"], queryFn: () => fetchUserContext(couple?.city || "Sao Paulo") });
  const { data, isLoading } = useQuery({
    queryKey: ["watch-recos", userId, couple?.city || "Sao Paulo", context?.weather || "unknown"],
    queryFn: () => fetchRecommendations(userId, couple?.city || "Sao Paulo", "movies_series", context?.weather || undefined, couple || undefined, context || undefined)
  });

  const safeContext = context || buildFallbackContext(couple?.city || "Sao Paulo");
  const items = useMemo(
    () =>
      buildWatchRecommendations({
        recommendations: data || [],
        context: safeContext,
        couple: couple || undefined,
        limit: 18
      }),
    [data, safeContext, couple]
  );

  const outOfHome = items.filter((item) => item.category === "cinema").slice(0, 4);
  const moviesAtHome = items.filter((item) => item.category === "movie");
  const seriesAtHome = items.filter((item) => item.category === "series");
  const platformFallbacks = items.filter((item) => item.category === "streaming").slice(0, 3);
  const favorites = extractScreenFavorites(couple);
  const hasLiveWatch = items.length > 0;
  const movieGenres = groupMoviesByGenre(moviesAtHome);
  const seriesGroups = groupSeriesByVibe(seriesAtHome);
  const watchHighlights = items
    .filter((item) => item.category === "movie" || item.category === "series" || item.category === "cinema")
    .slice(0, 4);

  return (
    <section className="space-y-6">
      <div className="hero-mesh overflow-hidden rounded-[2.5rem] border border-white/8 p-6 md:p-8">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.34em] text-[#f4d06f]">Assistir juntos</p>
              <h2 className="mt-2 max-w-3xl text-4xl font-semibold leading-[1.04] text-white md:text-5xl">
                Filmes e series separados do jeito que ajuda a decidir rapido.
              </h2>
              <p className="mt-3 max-w-2xl text-sm text-white/72">
                Em vez de vitrine de plataforma, esta tela puxa o que mais combina com voces hoje: mais sugeridos, filmes por genero, series por vibe e cinemas com cara de date.
              </p>
            </div>

            {favorites.length ? (
              <div className="flex flex-wrap gap-2">
                {favorites.map((item) => (
                  <span key={item} className="rounded-full border border-white/10 bg-white/7 px-4 py-2 text-sm text-white/78">
                    {item}
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <div className="rounded-[1.8rem] border border-white/10 bg-black/18 p-5">
              <p className="text-[11px] uppercase tracking-[0.28em] text-white/48">Mais sugeridos</p>
              <p className="mt-3 text-2xl font-semibold text-white">{watchHighlights.length}</p>
              <p className="mt-2 text-sm text-white/62">Os titulos mais fortes agora, sem precisar garimpar plataforma por plataforma.</p>
            </div>
            <div className="rounded-[1.8rem] border border-white/10 bg-black/18 p-5">
              <p className="text-[11px] uppercase tracking-[0.28em] text-white/48">Filmes em casa</p>
              <p className="mt-3 text-2xl font-semibold text-white">{moviesAtHome.length}</p>
              <p className="mt-2 text-sm text-white/62">Filmes reais, com cara de casal e agrupados por genero.</p>
            </div>
            <div className="rounded-[1.8rem] border border-white/10 bg-black/18 p-5">
              <p className="text-[11px] uppercase tracking-[0.28em] text-white/48">Leitura do momento</p>
              <p className="mt-3 text-2xl font-semibold text-white">{safeContext.weather_label}</p>
              <p className="mt-2 text-sm text-white/62">
                {safeContext.isRainy
                  ? "Hoje vale puxar cinema coberto ou sessao em casa com zero atrito."
                  : "Da para escolher entre rua e sofa sem perder o clima de noite especial."}
              </p>
            </div>
          </div>
        </div>
      </div>

      {isLoading ? <p className="text-sm text-white/60">Curando as melhores opcoes para assistir juntos...</p> : null}

      {watchHighlights.length ? (
        <div className="space-y-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.32em] text-[#f4d06f]">Mais sugeridos</p>
            <h3 className="mt-2 text-3xl font-semibold">O que eu colocaria na frente de voces agora</h3>
            <p className="mt-2 text-sm text-white/66">Aqui entram os titulos e cinemas com maior chance real de encaixar hoje.</p>
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            {watchHighlights.map((item) => (
              <DiscoveryCard key={item.id} item={item} userId={userId} />
            ))}
          </div>
        </div>
      ) : null}

      {movieGenres.length ? (
        <div className="space-y-5">
          <div>
            <p className="text-[11px] uppercase tracking-[0.32em] text-[#f4d06f]">Filmes por genero</p>
            <h3 className="mt-2 text-3xl font-semibold">Escolher filme ficou mais facil</h3>
            <p className="mt-2 text-sm text-white/66">Separei os titulos do jeito que a decisao acontece na pratica: suspense, romance ou conforto.</p>
          </div>
          {movieGenres.map((group) => (
            <div key={group.key} className="space-y-3">
              <div>
                <h4 className="text-2xl font-semibold text-white">{group.title}</h4>
                <p className="mt-1 text-sm text-white/62">{group.subtitle}</p>
              </div>
              <div className="grid gap-4 xl:grid-cols-3">
                {group.items.map((item) => (
                  <DiscoveryCard key={item.id} item={item} userId={userId} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {seriesGroups.length ? (
        <div className="space-y-5">
          <div>
            <p className="text-[11px] uppercase tracking-[0.32em] text-[#f4d06f]">Series por vibe</p>
            <h3 className="mt-2 text-3xl font-semibold">Quando a noite pede continuar juntos</h3>
            <p className="mt-2 text-sm text-white/66">As series entram separadas pela energia da maratona, nao misturadas com filme e cinema.</p>
          </div>
          {seriesGroups.map((group) => (
            <div key={group.key} className="space-y-3">
              <div>
                <h4 className="text-2xl font-semibold text-white">{group.title}</h4>
                <p className="mt-1 text-sm text-white/62">{group.subtitle}</p>
              </div>
              <div className="grid gap-4 xl:grid-cols-3">
                {group.items.map((item) => (
                  <DiscoveryCard key={item.id} item={item} userId={userId} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {hasLiveWatch ? (
        <div className="space-y-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.32em] text-[#f4d06f]">Fora de casa</p>
            <h3 className="mt-2 text-3xl font-semibold">Cinema com cara de date</h3>
            <p className="mt-2 text-sm text-white/66">Salas, bairros e programas que rendem conversa depois, nao so mais uma ida aleatoria ao shopping.</p>
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            {outOfHome.map((item) => (
              <DiscoveryCard key={item.id} item={item} userId={userId} />
            ))}
          </div>
        </div>
      ) : (
        <div className="editorial-card rounded-[2rem] p-5 text-sm text-white/72">
          Ainda nao chegaram itens reais de filmes, series ou cinema suficientes para esta area. Preferi nao inventar catalogo local para manter a experiencia 100% baseada em dados live.
        </div>
      )}

      {platformFallbacks.length ? (
        <div className="space-y-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.32em] text-[#f4d06f]">Plataformas uteis</p>
            <h3 className="mt-2 text-3xl font-semibold">Onde procurar mais coisas boas</h3>
            <p className="mt-2 text-sm text-white/66">As plataformas ficam como apoio, nao como a sugestao principal.</p>
          </div>
          <div className="grid gap-4 xl:grid-cols-3">
            {platformFallbacks.map((item) => (
              <DiscoveryCard key={item.id} item={item} userId={userId} />
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
