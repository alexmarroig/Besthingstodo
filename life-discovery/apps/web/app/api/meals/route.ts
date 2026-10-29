import { NextResponse } from "next/server";
import recipeFallbacks from "../_lib/recipe-fallbacks.json";
import { fetchExternalJson, jsonWithCache } from "../_lib/external-api";

const BASE = "https://www.themealdb.com/api/json/v1/1";

const FALLBACK_MEALS = recipeFallbacks.map(mapMeal);

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
    image_url: meal.strMealThumb || null,
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
    image_url: meal.strMealThumb || null,
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
