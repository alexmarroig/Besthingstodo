"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowUpRight, Bike, BookOpen, Bookmark, ChefHat, ChevronDown, Coffee, Flame, Fish, LayoutGrid, Newspaper, Pizza, Play, Soup, Sparkles, UtensilsCrossed, Wine } from "lucide-react";

import MediaDetailModal from "@/components/discovery/media-detail-modal";
import MediaRail from "@/components/discovery/media-rail";
import { buildFallbackContext, getCoupleSnapshot } from "@/features/catalog/curation";
import { buildMLState, rankRecommendationsWithML } from "@/features/catalog/ml/engine";
import {
  fetchCoupleMe,
  fetchDeliveryNearby,
  fetchGastroEditorial,
  fetchMealSuggestions,
  fetchPlaces,
  fetchUserContext,
  sendFeedback,
} from "@/shared/api/client";
import { useContinualLearning } from "@/shared/hooks/use-continual-learning";
import { attachRecommendationImages } from "@/shared/recommendation-images";
import { getUserId, isItemSaved, upsertSavedItem } from "@/shared/storage";
import { requireAccountForChange } from "@/shared/account-sync";

const CUISINES = [
  { key: "Italian", label: "Italiana", intent: "italian", icon: Pizza },
  { key: "Japanese", label: "Japonesa", intent: "japanese", icon: Fish },
  { key: "French", label: "Francesa & Bistrô", intent: "french", icon: Wine },
  { key: "Brazilian", label: "Brasileira & Autoral", intent: "brazilian", icon: ChefHat },
  { key: "Mexican", label: "Mexicana", intent: "mexican", icon: Flame },
  { key: "Indian", label: "Indiana", intent: "indian", icon: Soup },
  { key: "Thai", label: "Tailandesa", intent: "thai", icon: Soup },
  { key: "Chinese", label: "Asiática / Chinesa", intent: "chinese", icon: UtensilsCrossed },
];

const CUISINE_TAG_KEYWORDS: Record<string, string[]> = {
  Italian: ["italian", "italiana", "massa", "trattoria", "pizza", "pasta", "osteria"],
  Japanese: ["japan", "japones", "japonês", "sushi", "izakaya", "ramen", "omakase"],
  Mexican: ["mexican", "mexicana", "taco", "tacos"],
  French: ["french", "francesa", "bistro", "bistrô"],
  Indian: ["indian", "indiana", "curry"],
  Thai: ["thai", "tailandesa"],
  Brazilian: ["brazilian", "brasileira", "churrasco", "contemporânea", "autoral"],
  Chinese: ["chinese", "chinesa", "dim sum", "asiática"],
};

const TABS = [
  { key: "all", label: "Tudo para hoje", icon: LayoutGrid },
  { key: "restaurants", label: "Restaurantes & Cafés", icon: Coffee },
  { key: "editorial", label: "Radar & Crítica", icon: Newspaper },
  { key: "delivery", label: "Delivery & Em Casa", icon: Bike },
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
  return `food-filter ${active ? "food-filter-active" : ""}`;
}

function MealCard({ meal, index, userId }: { meal: any; index: number; userId: string }) {
  const [showIngredients, setShowIngredients] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const [saved, setSaved] = useState(() => isItemSaved(meal.id));

  const handleSaveRecipe = () => {
    if (!requireAccountForChange()) return;
    upsertSavedItem({ ...meal, collection: "Receitas a Dois" });
    void sendFeedback(userId, meal.id, "save", {
      title: meal.title,
      tags: meal.tags,
      domain: "delivery",
      category: "recipe",
    });
    setSaved(true);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, delay: index * 0.05 }}
      className="experience-card flex flex-col justify-between overflow-hidden"
    >
      <div>
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-black/25">
          {meal.image_url && !imageFailed ? <img
            src={meal.image_url}
            alt={meal.title}
            className="h-full w-full object-cover transition duration-500 hover:scale-105"
            loading="lazy"
            onError={() => setImageFailed(true)}
          /> : <div className="flex h-full flex-col items-center justify-center gap-2 bg-[#15232a] pb-8 text-white/45"><ChefHat className="h-10 w-10" /><span className="text-xs">Foto do prato indisponível</span></div>}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/10" />
          <div className="absolute left-3 top-3">
            <span className="pill-accent text-[10px] backdrop-blur-md">
              {meal.location || "Receita a Dois"}
            </span>
          </div>
          <div className="absolute bottom-3 left-3 right-3">
            <h4 className="line-clamp-2 text-base font-semibold text-white">{meal.title}</h4>
          </div>
        </div>

        <div className="space-y-2.5 p-4">
          {meal.description ? (
            <p className="line-clamp-3 text-xs leading-relaxed text-white/65">{meal.description}</p>
          ) : null}

          {meal.ingredients?.length > 0 ? (
            <button
              type="button"
              onClick={() => setShowIngredients(!showIngredients)}
              aria-expanded={showIngredients}
              className="food-action w-full justify-between text-[#f4d06f]"
            >
              <span>{showIngredients ? "Ocultar" : "Ver"} ingredientes ({meal.ingredients.length})</span><ChevronDown className={`h-4 w-4 transition ${showIngredients ? "rotate-180" : ""}`} />
            </button>
          ) : null}

          {showIngredients && meal.ingredients?.length > 0 ? (
            <ul className="space-y-1 rounded-xl bg-white/[0.04] p-3 text-xs text-white/65">
              {meal.ingredients.map((ing: string, i: number) => (
                <li key={i}>• {ing}</li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.06] px-4 py-3">
        <button
          type="button"
          onClick={handleSaveRecipe}
          aria-pressed={saved}
          className={`food-action ${
            saved
              ? "bg-[#f4d06f] text-black"
              : "bg-white/[0.06] text-white/75 hover:bg-white/[0.12] hover:text-white"
          }`}
        >
          <Bookmark className="h-4 w-4" fill={saved ? "currentColor" : "none"} />
          <span>{saved ? "Salva" : "Salvar receita"}</span>
        </button>

        <div className="flex flex-wrap items-center gap-2">
          {meal.youtube_url ? (
            <a
              href={meal.youtube_url}
              target="_blank"
              rel="noopener noreferrer"
              className="food-action text-[#f4d06f]"
            >
              <Play className="h-4 w-4" />Vídeo
            </a>
          ) : null}
          {meal.url ? (
            <a
              href={meal.url}
              target="_blank"
              rel="noopener noreferrer"
              className="food-action food-action-primary"
            >
              <BookOpen className="h-4 w-4" />Ver receita<ArrowUpRight className="h-3.5 w-3.5" />
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
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]["key"]>("all");
  const [selectedItem, setSelectedItem] = useState<any | null>(null);

  const { data: couple } = useQuery({ queryKey: ["couple-me"], queryFn: fetchCoupleMe });
  const { data: context } = useQuery({
    queryKey: ["context", couple?.city || "Sao Paulo", couple?.neighborhood || ""],
    queryFn: () => fetchUserContext(couple || undefined),
  });

  const { feedbackHistory, version: mlVersion, insights } = useContinualLearning(couple, context);

  const { data: randomMeal } = useQuery({
    queryKey: ["random-meal"],
    queryFn: () => fetchMealSuggestions("random"),
  });

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
  });

  const mlState = useMemo(() => {
    void mlVersion;
    const snapshot = getCoupleSnapshot(couple);
    const safeContext = context || buildFallbackContext(snapshot.city);
    return buildMLState(snapshot, safeContext, feedbackHistory);
  }, [couple, context, feedbackHistory, mlVersion]);

  const restaurantItems = useMemo(() => {
    const filtered = filterRestaurantsByCuisine(restaurants || [], selectedCuisine);
    return attachRecommendationImages(rankRecommendationsWithML(filtered, mlState));
  }, [restaurants, selectedCuisine, mlState]);

  const editorialItems = useMemo(
    () => attachRecommendationImages(rankRecommendationsWithML(gastroEditorial || [], mlState)),
    [gastroEditorial, mlState]
  );

  const deliveryItems = useMemo(
    () => attachRecommendationImages(rankRecommendationsWithML(deliveryNearby || [], mlState)),
    [deliveryNearby, mlState]
  );

  const cafeItems = useMemo(
    () => attachRecommendationImages(rankRecommendationsWithML(cafes || [], mlState)),
    [cafes, mlState]
  );

  const dailyMeal = randomMeal?.[0];

  const showEditorial = activeTab === "all" || activeTab === "editorial";
  const showRestaurants = activeTab === "all" || activeTab === "restaurants";
  const showDelivery = activeTab === "all" || activeTab === "delivery";

  return (
    <section className="space-y-8">
      <header className="hero-mesh animate-fade-up rounded-[2rem] border border-white/10 p-6 sm:p-8">
        <div className="space-y-3">
          <p className="inline-flex items-center gap-1.5 text-xs font-medium text-[#f4d06f]">
            <UtensilsCrossed className="h-3.5 w-3.5" />
            <span>Gastronomia & Curadoria Neural ({insights.confidencePercent}% calibrado)</span>
          </p>
          <h2 className="font-display text-3xl font-semibold text-white sm:text-4xl">
            Comer bem em São Paulo, juntos
          </h2>
          <p className="max-w-xl text-sm leading-relaxed text-white/65">
            Restaurantes intimistas, radar gastronômico (Michelin, Paladar, Folha), cafés com livraria, delivery
            selecionado e receitas para preparar a dois.
          </p>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <span className="pill">{restaurantItems.length} restaurantes</span>
          <span className="pill">{cafeItems.length} cafés & docerias</span>
          <span className="pill">{deliveryItems.length} opções delivery</span>
          <span className="pill-accent">{CUISINES.length} culinárias</span>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              aria-pressed={activeTab === tab.key}
              className={tabClass(activeTab === tab.key)}
            >
              <tab.icon className="h-4 w-4" />{tab.label}
            </button>
          ))}
        </div>
      </header>

      {/* Cuisine Selector */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-medium text-white/60">
          <Sparkles className="h-3.5 w-3.5 text-[#f4d06f]" />
          <span>Filtrar restaurantes e receitas por culinária:</span>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {CUISINES.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => setSelectedCuisine(c.key)}
              aria-pressed={selectedCuisine === c.key}
              className={`shrink-0 ${tabClass(selectedCuisine === c.key)}`}
            >
              <c.icon className="h-4 w-4" />{c.label}
            </button>
          ))}
        </div>
      </div>

      {showRestaurants && restaurantItems.length > 0 ? (
        <MediaRail
          title={`Restaurantes · ${CUISINES.find((c) => c.key === selectedCuisine)?.label || ""}`}
          subtitle="Ordenados pela afinidade do casal e histórico gastronômico"
          items={restaurantItems.slice(0, 14)}
          variant="food"
          onOpen={setSelectedItem}
        />
      ) : null}

      {showEditorial && editorialItems.length > 0 ? (
        <MediaRail
          title="Radar Gastronômico SP"
          subtitle="Destaques do Guia Michelin, Paladar Estadão, Guia Folha e aberturas"
          items={editorialItems.slice(0, 14)}
          variant="food"
          onOpen={setSelectedItem}
        />
      ) : null}

      {showRestaurants && cafeItems.length > 0 ? (
        <MediaRail
          title="Cafés, Padarias & Conversa Calma"
          subtitle="Pausas aconchegantes para tarde ou pós-exposição"
          items={cafeItems.slice(0, 14)}
          variant="food"
          onOpen={setSelectedItem}
        />
      ) : null}

      {showDelivery && deliveryItems.length > 0 ? (
        <MediaRail
          title="Delivery Premium em SP"
          subtitle="Os favoritos do casal para pedir em casa sem erro"
          items={deliveryItems.slice(0, 14)}
          variant="food"
          onOpen={setSelectedItem}
        />
      ) : null}

      {/* Recipes Section */}
      <div className="space-y-4 pt-2">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="mb-1.5 flex items-center gap-3">
              <div className="rail-accent" />
              <h3 className="rail-title">Cozinhar a Dois · Receitas Selecionadas</h3>
            </div>
            <p className="text-sm text-white/50">
              Ideias da culinária {CUISINES.find((c) => c.key === selectedCuisine)?.label || ""} para transformar o
              jantar em casa em experiência
            </p>
          </div>
        </div>

        {loadingCuisine ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="experience-card aspect-[4/5] shimmer" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(dailyMeal ? [dailyMeal, ...(cuisineMeals || [])] : cuisineMeals || [])
              .filter((meal, idx, arr) => meal && arr.findIndex((m) => m?.id === meal.id) === idx)
              .slice(0, 6)
              .map((meal: any, i: number) => (
                <MealCard key={meal.id} meal={meal} index={i} userId={userId} />
              ))}
          </div>
        )}
      </div>

      <MediaDetailModal item={selectedItem} userId={userId} onClose={() => setSelectedItem(null)} />
    </section>
  );
}
