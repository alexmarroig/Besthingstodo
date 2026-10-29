import { NextResponse } from "next/server";
import { fetchExternalJson, jsonWithCache } from "../_lib/external-api";

const BASE = "https://www.themealdb.com/api/json/v1/1";

const FALLBACK_MEALS = [
  {
    id: "meal-it-risotto",
    title: "Risoto de Funghi Secchi com Parmesão Curado",
    description:
      "Hidrate o funghi em caldo quente, refogue echalotes na manteiga, adicione arroz Carnaroli, deglaçe com vinho branco seco e finalize com manteiga gelada e Grana Padano.",
    category: "recipe",
    domain: "delivery",
    city: "São Paulo",
    location: "Italian",
    image_url: "/images/venues/lellis-trattoria.jpg",
    tags: ["Italian", "Risotto", "Romântico", "Jantar em Casa"],
    source: "Receita do Chef",
    url: "https://www.themealdb.com",
    youtube_url: null,
    score: 9.4,
    quality_score: 94,
    price: null,
    ingredients: [
      "300g de arroz Carnaroli ou Arbório",
      "40g de funghi secchi hidratado",
      "1L de caldo de legumes artesanal",
      "80g de queijo parmesão ralado na hora",
      "2 colheres de manteiga sem sal gelada",
    ],
    instructions:
      "Hidrate o funghi por 20 minutos, coe reservando o líquido e incorpore aos poucos ao arroz até atingir textura cremosa al dente.",
  },
  {
    id: "meal-jp-ramen",
    title: "Shoyu Ramen Artesanal com Ovo Ajitsuke",
    description:
      "Caldo aromático de gengibre, dashi e shoyu especial, servido com macarrão alcalino fresco, cogumelos shiitake grelhados e ovo marinado de gema cremosa.",
    category: "recipe",
    domain: "delivery",
    city: "São Paulo",
    location: "Japanese",
    image_url: "/images/venues/issho.jpg",
    tags: ["Japanese", "Ramen", "Conforto", "Noite Fria"],
    source: "Receita do Chef",
    url: "https://www.themealdb.com",
    youtube_url: null,
    score: 9.2,
    quality_score: 92,
    price: null,
    ingredients: [
      "2 porções de lámen fresco",
      "800ml de caldo dashi + legumes",
      "60ml de tare de shoyu e mirin",
      "2 ovos cozidos por exatos 6m30s",
      "150g de cogumelos shiitake fatiados",
    ],
    instructions:
      "Prepare o caldo aromático, salteie os cogumelos no óleo de gergelim, cozinhe a massa por 2 minutos e monte as tigelas bem quentes.",
  },
  {
    id: "meal-it-ravioli",
    title: "Ravioloni de Queijo na Manteiga de Sálvia",
    description:
      "Massa fresca recheada com ricota cremosa e pecorino, envolvida em emulsão dourada de manteiga noisette e folhas crocantes de sálvia fresca.",
    category: "recipe",
    domain: "delivery",
    city: "São Paulo",
    location: "Italian",
    image_url: "/images/venues/nino-cucina.jpg",
    tags: ["Italian", "Massa", "Clássico", "Rápido"],
    source: "Receita do Chef",
    url: "https://www.themealdb.com",
    youtube_url: null,
    score: 9.5,
    quality_score: 95,
    price: null,
    ingredients: [
      "400g de ravioloni fresco de queijo",
      "60g de manteiga de qualidade",
      "12 folhas de sálvia fresca",
      "Queijo pecorino ou parmesão a gosto",
      "Pimenta-do-reino moída na hora",
    ],
    instructions:
      "Cozinhe a massa em água salgada por 3 minutos, transfira direto para a frigideira com a manteiga dourada e sálvia e emulsione com um pouco da água do cozimento.",
  },
  {
    id: "meal-fr-steak",
    title: "Steak au Poivre com Batatas Rústicas ao Alecrim",
    description:
      "Filé alto selado na crosta de pimentas, finalizado com molho aveludado de redução e batatas douradas crocantes por fora e macias por dentro.",
    category: "recipe",
    domain: "delivery",
    city: "São Paulo",
    location: "French",
    image_url: "/images/venues/libertango.jpg",
    tags: ["French", "Carne", "Bistrô", "Encontro"],
    source: "Receita do Chef",
    url: "https://www.themealdb.com",
    youtube_url: null,
    score: 9.3,
    quality_score: 93,
    price: null,
    ingredients: [
      "2 medalhões altos (200g cada)",
      "1 colher de sopa de pimenta-do-reino em grãos quebrados",
      "150ml de creme de leite fresco",
      "300g de batatas bolinha com alecrim",
      "Manteiga e azeite extravirgem",
    ],
    instructions:
      "Sele os medalhões em frigideira bem quente por 3 minutos de cada lado, reserve aquecido e reduza o creme de leite no fundo da frigideira.",
  },
];

function mapMeal(meal: any) {
  const ingredients: string[] = [];
  for (let i = 1; i <= 20; i++) {
    const ing = meal[`strIngredient${i}`];
    const measure = meal[`strMeasure${i}`];
    if (ing && ing.trim()) {
      ingredients.push(`${measure?.trim() || ""} ${ing.trim()}`.trim());
    }
  }

  return {
    id: `meal-${meal.idMeal}`,
    title: meal.strMeal || "Sem título",
    description: meal.strInstructions?.slice(0, 220) || "Receita selecionada para preparar em casal.",
    category: "recipe",
    domain: "delivery",
    city: "São Paulo",
    location: meal.strArea || "Internacional",
    image_url: meal.strMealThumb || "/images/venues/mani.jpg",
    tags: [
      meal.strCategory,
      meal.strArea,
      ...(meal.strTags ? meal.strTags.split(",").map((t: string) => t.trim()) : []),
    ].filter(Boolean),
    source: "TheMealDB",
    url: meal.strSource || meal.strYoutube || `https://www.themealdb.com/meal/${meal.idMeal}`,
    youtube_url: meal.strYoutube || null,
    score: 9.0,
    quality_score: 90,
    price: null,
    ingredients,
    instructions: meal.strInstructions || "",
    personalization_label: null,
    related_favorite: null,
    latitude: null,
    longitude: null,
    profile_signals: [],
  };
}

function mapMealThumb(meal: any, areaLabel = "") {
  return {
    id: `meal-${meal.idMeal}`,
    meal_id: meal.idMeal,
    title: meal.strMeal || "Sem título",
    description: `Prato clássico da culinária ${areaLabel || "internacional"}, ideal para uma noite gastronômica em casa.`,
    category: "recipe",
    domain: "delivery",
    city: "São Paulo",
    location: areaLabel || "Culinária Autoral",
    image_url: meal.strMealThumb || "/images/venues/mani.jpg",
    tags: [areaLabel, "receita", "em casa"].filter(Boolean),
    source: "TheMealDB",
    url: `https://www.themealdb.com/meal/${meal.idMeal}`,
    score: 8.8,
    quality_score: 88,
    price: null,
    ingredients: [],
    personalization_label: null,
    related_favorite: null,
    latitude: null,
    longitude: null,
    profile_signals: [],
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "random";
  const query = searchParams.get("query") || "";
  const category = searchParams.get("category") || "";
  const area = searchParams.get("area") || "";

  try {
    let url = "";

    switch (type) {
      case "random":
        url = `${BASE}/random.php`;
        break;
      case "search":
        url = `${BASE}/search.php?s=${encodeURIComponent(query)}`;
        break;
      case "filter":
        if (category) url = `${BASE}/filter.php?c=${encodeURIComponent(category)}`;
        else if (area) url = `${BASE}/filter.php?a=${encodeURIComponent(area)}`;
        else url = `${BASE}/filter.php?c=Seafood`;
        break;
      case "categories":
        url = `${BASE}/categories.php`;
        break;
      case "lookup":
        url = `${BASE}/lookup.php?i=${encodeURIComponent(query)}`;
        break;
      default:
        url = `${BASE}/random.php`;
    }

    const data = await fetchExternalJson<any>(url, { revalidate: 300, timeoutMs: 2800 });

    if (type === "categories") {
      return jsonWithCache(data.categories || [], { revalidate: 3600, stale: 600 });
    }

    const meals = data.meals || [];
    if (!meals.length) {
      return jsonWithCache(FALLBACK_MEALS, { revalidate: 300, stale: 120 });
    }

    const isFilter = type === "filter";
    const results = meals
      .slice(0, 12)
      .map((meal: any) => (isFilter ? mapMealThumb(meal, area || category) : mapMeal(meal)));

    return jsonWithCache(results, { revalidate: 300, stale: 120 });
  } catch {
    return NextResponse.json(FALLBACK_MEALS, { status: 200 });
  }
}
