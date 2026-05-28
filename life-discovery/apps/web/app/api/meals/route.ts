import { NextResponse } from "next/server";
import { fetchExternalJson, jsonWithCache } from "../_lib/external-api";

const BASE = "https://www.themealdb.com/api/json/v1/1";

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
    description: meal.strInstructions?.slice(0, 200) || "",
    category: "recipe",
    domain: "delivery",
    city: "",
    location: meal.strArea || "",
    image_url: meal.strMealThumb || null,
    tags: [
      meal.strCategory,
      meal.strArea,
      ...(meal.strTags ? meal.strTags.split(",").map((t: string) => t.trim()) : []),
    ].filter(Boolean),
    source: "TheMealDB",
    url: meal.strSource || meal.strYoutube || null,
    youtube_url: meal.strYoutube || null,
    score: null,
    price: null,
    ingredients,
    instructions: meal.strInstructions || "",
    personalization_label: null,
    related_favorite: null,
    quality_score: null,
    latitude: null,
    longitude: null,
    profile_signals: [],
  };
}

function mapMealThumb(meal: any) {
  return {
    id: `meal-${meal.idMeal}`,
    title: meal.strMeal || "Sem título",
    description: "",
    category: "recipe",
    domain: "delivery",
    city: "",
    location: "",
    image_url: meal.strMealThumb || null,
    tags: [],
    source: "TheMealDB",
    url: null,
    score: null,
    price: null,
    personalization_label: null,
    related_favorite: null,
    quality_score: null,
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

    const data = await fetchExternalJson<any>(url, { revalidate: 300 });

    if (type === "categories") {
      return jsonWithCache(data.categories || [], { revalidate: 3600, stale: 600 });
    }

    const meals = data.meals || [];
    const isFilter = type === "filter";
    const results = meals.slice(0, 12).map((meal: any) => (isFilter ? mapMealThumb(meal) : mapMeal(meal)));

    return jsonWithCache(results, { revalidate: 300, stale: 120 });
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}
