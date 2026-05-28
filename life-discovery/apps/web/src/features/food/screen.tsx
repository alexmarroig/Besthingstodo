"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";

import DiscoveryCard from "@/components/discovery/discovery-card";
import { fetchMealSuggestions, fetchPlaces } from "@/shared/api/client";
import { getUserId } from "@/shared/storage";

const CUISINES = [
  { key: "Italian", label: "Italiana" },
  { key: "Japanese", label: "Japonesa" },
  { key: "Mexican", label: "Mexicana" },
  { key: "French", label: "Francesa" },
  { key: "Indian", label: "Indiana" },
  { key: "Thai", label: "Tailandesa" },
  { key: "Brazilian", label: "Brasileira" },
  { key: "Chinese", label: "Chinesa" },
];

function MealCard({ meal, index }: { meal: any; index: number }) {
  const [showIngredients, setShowIngredients] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.08 }}
      className="card-hover recipe-card overflow-hidden rounded-[1.5rem]"
    >
      {meal.image_url && (
        <div className="relative aspect-video w-full overflow-hidden">
          <img
            src={meal.image_url}
            alt={meal.title}
            className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          <div className="absolute bottom-3 left-4 right-4">
            <h4 className="text-lg font-semibold text-white drop-shadow-lg">{meal.title}</h4>
          </div>
          {meal.tags?.length > 0 && (
            <div className="absolute right-3 top-3 flex gap-1.5">
              {meal.tags.slice(0, 2).map((tag: string) => (
                <span key={tag} className="rounded-full bg-black/50 px-2.5 py-1 text-[10px] text-white/90 backdrop-blur-sm">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="space-y-3 p-5">
        {meal.location && (
          <p className="text-xs text-[#f4d06f]/80"> Culinária {meal.location}</p>
        )}

        {meal.description && (
          <p className="line-clamp-3 text-sm leading-relaxed text-white/65">
            {meal.description}
          </p>
        )}

        {meal.ingredients?.length > 0 && (
          <div>
            <button
              onClick={() => setShowIngredients(!showIngredients)}
              className="flex items-center gap-2 text-xs font-medium text-[#f4d06f] transition hover:text-[#f4d06f]/80"
            >
              <span>{showIngredients ? "▾" : "▸"}</span>
              <span>{showIngredients ? "Esconder" : "Ver"} ingredientes ({meal.ingredients.length})</span>
            </button>
            {showIngredients && (
              <motion.ul
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="mt-2 space-y-1"
              >
                {meal.ingredients.map((ing: string, i: number) => (
                  <li key={i} className="text-xs text-white/55">• {ing}</li>
                ))}
              </motion.ul>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-2 border-t border-white/6 pt-3">
          {meal.youtube_url && (
            <a
              href={meal.youtube_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-full bg-red-500/15 px-3 py-2 text-xs font-medium text-red-400 transition hover:bg-red-500/25"
            >
              ▶ YouTube
            </a>
          )}
          {meal.url && !meal.youtube_url && (
            <a
              href={meal.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-full bg-white/8 px-3 py-2 text-xs font-medium text-white/60 transition hover:bg-white/15"
            >
              ↗ Receita completa
            </a>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default function FoodScreen() {
  const userId = getUserId();
  const [selectedCuisine, setSelectedCuisine] = useState("Italian");

  const { data: randomMeal } = useQuery({
    queryKey: ["random-meal"],
    queryFn: () => fetchMealSuggestions("random"),
  });

  const { data: cuisineMeals, isLoading: loadingCuisine } = useQuery({
    queryKey: ["cuisine-meals", selectedCuisine],
    queryFn: () => fetchMealSuggestions("filter", { area: selectedCuisine }),
  });

  const { data: restaurants } = useQuery({
    queryKey: ["food-restaurants"],
    queryFn: () => fetchPlaces("Sao Paulo", "catering.restaurant"),
  });

  const { data: cafes } = useQuery({
    queryKey: ["food-cafes"],
    queryFn: () => fetchPlaces("Sao Paulo", "catering.cafe"),
  });

  const dailyMeal = randomMeal?.[0];
  const restaurantItems = restaurants || [];
  const cafeItems = cafes || [];

  return (
    <section className="space-y-7">
      {/* Hero */}
      <div className="hero-mesh overflow-hidden rounded-[2.5rem] border border-white/8 p-6 md:p-8">
        <div className="grid gap-8 lg:grid-cols-[1.25fr_0.85fr]">
          <div className="space-y-5">
            <div className="space-y-3">
              <p className="text-[11px] uppercase tracking-[0.34em] text-[#f4d06f]">Gastronomia</p>
              <h2 className="max-w-3xl text-4xl font-semibold leading-[1.02] text-white md:text-6xl">
                Receitas e restaurantes para a noite do casal
              </h2>
              <p className="max-w-2xl text-base text-white/72">
                Combinamos receitas para cozinhar juntos com os melhores restaurantes e cafés perto de vocês. De delivery gourmet a jantar fora — tudo pensado para o casal.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <div className="rounded-[1.8rem] border border-white/10 bg-black/18 p-5">
              <p className="text-[11px] uppercase tracking-[0.28em] text-white/48">Restaurantes</p>
              <p className="mt-3 text-4xl font-semibold text-white">{restaurantItems.length}</p>
              <p className="mt-2 text-sm text-white/62">lugares reais perto de vocês agora.</p>
            </div>
            <div className="rounded-[1.8rem] border border-white/10 bg-black/18 p-5">
              <p className="text-[11px] uppercase tracking-[0.28em] text-white/48">Culinárias</p>
              <p className="mt-3 text-4xl font-semibold text-white">{CUISINES.length}</p>
              <p className="mt-2 text-sm text-white/62">tipos de cozinha com receitas reais.</p>
            </div>
            <div className="rounded-[1.8rem] border border-white/10 bg-black/18 p-5">
              <p className="text-[11px] uppercase tracking-[0.28em] text-white/48">Cafés</p>
              <p className="mt-3 text-4xl font-semibold text-white">{cafeItems.length}</p>
              <p className="mt-2 text-sm text-white/62">cafeterias para um encontro mais leve.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Receita do dia */}
      {dailyMeal && (
        <div className="space-y-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.32em] text-[#f4d06f]">Receita do dia</p>
            <h3 className="mt-2 text-3xl font-semibold">Uma ideia para cozinhar juntos</h3>
            <p className="mt-2 text-sm text-white/66">
              Receita aleatória para inspirar a noite. Cozinhar junto é o date mais subestimado que existe.
            </p>
          </div>
          <div className="max-w-2xl">
            <MealCard meal={dailyMeal} index={0} />
          </div>
        </div>
      )}

      {/* Receitas por culinária */}
      <div className="space-y-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.32em] text-[#f4d06f]">Por culinária</p>
          <h3 className="mt-2 text-3xl font-semibold">Receitas organizadas pelo tipo de cozinha</h3>
          <p className="mt-2 text-sm text-white/66">
            Escolha a culinária e veja receitas reais com imagem, ingredientes e vídeo.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {CUISINES.map((c) => (
            <button
              key={c.key}
              onClick={() => setSelectedCuisine(c.key)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition duration-200 ${
                selectedCuisine === c.key
                  ? "bg-[#f97352] text-white shadow-[0_12px_28px_rgba(249,115,82,0.24)]"
                  : "border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {loadingCuisine ? (
          <div className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton h-64 rounded-[1.5rem]" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {(cuisineMeals || []).slice(0, 6).map((meal: any, i: number) => (
              <MealCard key={meal.id} meal={meal} index={i} />
            ))}
          </div>
        )}
      </div>

      {/* Restaurantes */}
      {restaurantItems.length > 0 && (
        <div className="space-y-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.32em] text-[#f4d06f]">Perto de vocês</p>
            <h3 className="mt-2 text-3xl font-semibold">Restaurantes para sair hoje</h3>
            <p className="mt-2 text-sm text-white/66">
              Restaurantes reais encontrados por localização. Sem sugestão inventada.
            </p>
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            {restaurantItems.slice(0, 6).map((item: any) => (
              <DiscoveryCard key={item.id} item={item} userId={userId} />
            ))}
          </div>
        </div>
      )}

      {/* Cafés */}
      {cafeItems.length > 0 && (
        <div className="space-y-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.32em] text-[#f4d06f]">Cafés e brunch</p>
            <h3 className="mt-2 text-3xl font-semibold">Para encontros mais leves</h3>
            <p className="mt-2 text-sm text-white/66">
              Cafeterias e casas de brunch perto. Bom para o fim de semana ou para mudar o ritmo.
            </p>
          </div>
          <div className="grid gap-4 xl:grid-cols-3">
            {cafeItems.slice(0, 6).map((item: any) => (
              <DiscoveryCard key={item.id} item={item} userId={userId} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
