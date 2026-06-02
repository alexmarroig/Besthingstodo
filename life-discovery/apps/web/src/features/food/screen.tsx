"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";

import MediaDetailModal from "@/components/discovery/media-detail-modal";
import MediaRail from "@/components/discovery/media-rail";
import { fetchMealSuggestions, fetchPlaces, fetchGastroEditorial, fetchDeliveryNearby, fetchEvents } from "@/shared/api/client";
import { getUserId } from "@/shared/storage";

const CUISINES = [
  { key: "Italian", label: "Italiana", intent: "italian" },
  { key: "Japanese", label: "Japonesa", intent: "japanese" },
  { key: "Mexican", label: "Mexicana", intent: "mexican" },
  { key: "French", label: "Francesa", intent: "french" },
  { key: "Indian", label: "Indiana", intent: "indian" },
  { key: "Thai", label: "Tailandesa", intent: "thai" },
  { key: "Brazilian", label: "Brasileira", intent: "brazilian" },
  { key: "Chinese", label: "Chinesa", intent: "chinese" },
];

const CUISINE_TAG_KEYWORDS: Record<string, string[]> = {
  Italian: ["italian", "italiana", "massa", "trattoria", "pizza", "pasta"],
  Japanese: ["japan", "japones", "japonês", "sushi", "izakaya", "ramen"],
  Mexican: ["mexican", "mexicana", "taco", "tacos"],
  French: ["french", "francesa", "bistro"],
  Indian: ["indian", "indiana", "curry"],
  Thai: ["thai", "tailandesa"],
  Brazilian: ["brazilian", "brasileira", "churrasco", "feijoada"],
  Chinese: ["chinese", "chinesa", "dim sum"],
};

const TABS = [
  { key: "editorial", label: "Radar" },
  { key: "restaurants", label: "Restaurantes" },
  { key: "delivery", label: "Delivery" },
] as const;

function filterRestaurantsByCuisine(items: any[], cuisineKey: string) {
  const keywords = CUISINE_TAG_KEYWORDS[cuisineKey] || [];
  if (!keywords.length) return items;
  const filtered = items.filter((item) => {
    const text = [item.title, item.description, ...(item.tags || [])].join(" ").toLowerCase();
    return keywords.some((keyword) => text.includes(keyword));
  });
  return filtered.length ? filtered : items;
}

function tabClass(active: boolean) {
  return active ? "btn-primary py-2 px-4 text-xs shadow-none" : "btn-ghost py-2 px-4 text-xs";
}

function MealCard({ meal, index }: { meal: any; index: number }) {
  const [showIngredients, setShowIngredients] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.06 }}
      className="experience-card overflow-hidden"
    >
      {meal.image_url ? (
        <div className="relative aspect-[4/3] w-full overflow-hidden">
          <img src={meal.image_url} alt={meal.title} className="h-full w-full object-cover" loading="lazy" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
          <div className="absolute bottom-3 left-3 right-3">
            <h4 className="line-clamp-2 text-base font-semibold text-white">{meal.title}</h4>
          </div>
        </div>
      ) : (
        <div className="flex aspect-[4/3] items-center justify-center bg-white/[0.03]">
          <p className="text-sm font-semibold text-white/70">{meal.title}</p>
        </div>
      )}

      <div className="space-y-3 p-4">
        {meal.location ? <p className="pill-accent inline-flex text-[10px]">{meal.location}</p> : null}
        {meal.description ? <p className="line-clamp-3 text-sm text-white/55">{meal.description}</p> : null}

        {meal.ingredients?.length > 0 ? (
          <button
            type="button"
            onClick={() => setShowIngredients(!showIngredients)}
            className="text-xs font-medium text-[#f4d06f]"
          >
            {showIngredients ? "Esconder" : "Ver"} ingredientes ({meal.ingredients.length})
          </button>
        ) : null}

        {showIngredients && meal.ingredients?.length > 0 ? (
          <ul className="space-y-1 text-xs text-white/50">
            {meal.ingredients.map((ing: string, i: number) => (
              <li key={i}>• {ing}</li>
            ))}
          </ul>
        ) : null}

        <div className="flex flex-wrap gap-2 border-t border-white/[0.06] pt-3">
          {meal.youtube_url ? (
            <a href={meal.youtube_url} target="_blank" rel="noopener noreferrer" className="pill-accent text-[10px]">
              ▶ YouTube
            </a>
          ) : null}
          {meal.url && !meal.youtube_url ? (
            <a href={meal.url} target="_blank" rel="noopener noreferrer" className="btn-ghost py-1.5 text-[10px]">
              Receita completa
            </a>
          ) : null}
        </div>
      </div>
    </motion.div>
  );
}

export default function FoodScreen() {
  const userId = getUserId();
  const [selectedCuisine, setSelectedCuisine] = useState("Italian");
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]["key"]>("editorial");
  const [selectedItem, setSelectedItem] = useState<any | null>(null);

  const { data: randomMeal } = useQuery({ queryKey: ["random-meal"], queryFn: () => fetchMealSuggestions("random") });
  const { data: cuisineMeals, isLoading: loadingCuisine } = useQuery({
    queryKey: ["cuisine-meals", selectedCuisine],
    queryFn: () => fetchMealSuggestions("filter", { area: selectedCuisine }),
  });

  const cuisineIntent = CUISINES.find((c) => c.key === selectedCuisine)?.intent;

  const { data: restaurants } = useQuery({
    queryKey: ["food-restaurants", selectedCuisine],
    queryFn: () => fetchPlaces("Sao Paulo", "catering.restaurant", { intent: cuisineIntent }),
  });

  const { data: cafes } = useQuery({
    queryKey: ["food-cafes"],
    queryFn: () => fetchPlaces("Sao Paulo", "catering.cafe"),
  });

  const { data: gastroEditorial } = useQuery({
    queryKey: ["food-gastro-editorial"],
    queryFn: () => fetchGastroEditorial("all"),
  });

  const { data: deliveryNearby } = useQuery({
    queryKey: ["food-delivery-nearby"],
    queryFn: () => fetchDeliveryNearby("Sao Paulo"),
    enabled: activeTab === "delivery",
  });

  const dailyMeal = randomMeal?.[0];
  const restaurantItems = filterRestaurantsByCuisine(restaurants || [], selectedCuisine);
  const editorialItems = gastroEditorial || [];
  const deliveryItems = deliveryNearby || [];
  const cafeItems = cafes || [];

  return (
    <section className="space-y-8">
      <header className="animate-fade-up space-y-4">
        <div className="space-y-2">
          <p className="text-xs text-white/45">Gastronomia</p>
          <h2 className="font-display text-3xl font-semibold text-white sm:text-4xl">Comer bem, juntos</h2>
          <p className="max-w-lg text-sm text-white/55">
            Receitas para cozinhar em casa, restaurantes reais e delivery perto de vocês.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="pill">{restaurantItems.length} restaurantes</span>
          <span className="pill">{cafeItems.length} cafés</span>
          <span className="pill">{CUISINES.length} culinárias</span>
        </div>

        <div className="flex flex-wrap gap-2">
          {TABS.map((tab) => (
            <button key={tab.key} type="button" onClick={() => setActiveTab(tab.key)} className={tabClass(activeTab === tab.key)}>
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {activeTab === "editorial" && editorialItems.length > 0 ? (
        <MediaRail
          title="Radar gastronômico"
          subtitle="Paladar, Folha, Catraca e aberturas"
          items={editorialItems.slice(0, 12)}
          onOpen={setSelectedItem}
          className="animate-slide-up stagger-2"
        />
      ) : null}

      {activeTab === "delivery" && deliveryItems.length > 0 ? (
        <MediaRail
          title="Delivery perto"
          subtitle="Opções com entrega na região"
          items={deliveryItems.slice(0, 12)}
          onOpen={setSelectedItem}
          className="animate-slide-up stagger-2"
        />
      ) : null}

      {dailyMeal ? (
        <div className="animate-slide-up stagger-3 space-y-3">
          <div>
            <div className="mb-2 flex items-center gap-3">
              <div className="rail-accent" />
              <h3 className="rail-title">Receita do dia</h3>
            </div>
            <p className="text-sm text-white/45">Uma ideia leve para cozinhar juntos</p>
          </div>
          <div className="max-w-sm">
            <MealCard meal={dailyMeal} index={0} />
          </div>
        </div>
      ) : null}

      <div className="animate-slide-up stagger-4 space-y-4">
        <div>
          <div className="mb-2 flex items-center gap-3">
            <div className="rail-accent" />
            <h3 className="rail-title">Por culinária</h3>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {CUISINES.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => setSelectedCuisine(c.key)}
              className={`shrink-0 ${tabClass(selectedCuisine === c.key)}`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {loadingCuisine ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="experience-card aspect-[4/5] shimmer" />
            ))}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(cuisineMeals || []).slice(0, 6).map((meal: any, i: number) => (
              <MealCard key={meal.id} meal={meal} index={i} />
            ))}
          </div>
        )}
      </div>

      {activeTab === "restaurants" && restaurantItems.length > 0 ? (
        <MediaRail
          title={`Restaurantes ${CUISINES.find((c) => c.key === selectedCuisine)?.label || ""}`}
          subtitle="Lugares reais alinhados ao tipo de cozinha"
          items={restaurantItems.slice(0, 12)}
          onOpen={setSelectedItem}
          className="animate-slide-up stagger-5"
        />
      ) : null}

      {activeTab === "restaurants" && cafeItems.length > 0 ? (
        <MediaRail
          title="Cafés & brunch"
          subtitle="Encontros mais leves"
          items={cafeItems.slice(0, 12)}
          onOpen={setSelectedItem}
          className="animate-slide-up stagger-6"
        />
      ) : null}

      <MediaDetailModal item={selectedItem} userId={userId} onClose={() => setSelectedItem(null)} />
    </section>
  );
}
