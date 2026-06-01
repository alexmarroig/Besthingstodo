const CATEGORY_LABELS: Record<string, string> = {
  restaurant: "Restaurante",
  cafe: "Café",
  bar: "Bar",
  fast_food: "Lanchonete",
  delivery: "Delivery",
  event: "Evento",
  gastro_event: "Evento gastronômico",
  opening: "Abertura",
  review: "Crítica",
  trend: "Tendência",
  editorial: "Matéria",
  movie: "Filme",
  series: "Série",
  news: "Notícia",
  museum: "Museu",
  recipe: "Receita",
};

const TAG_LABELS: Record<string, string> = {
  basketball: "basquete",
  sports: "esporte",
  nbl: "basquete",
  restaurant: "restaurante",
  catering: "gastronomia",
  cafe: "café",
  fast_food: "lanchonete",
  music: "música",
  comedy: "comédia",
  theatre: "teatro",
  theater: "teatro",
  arts: "arte",
  family: "família",
  festival: "festival",
  food: "gastronomia",
  wine: "vinho",
};

export function localizeCategory(category?: string | null) {
  if (!category) return "Sugestão";
  const key = category.toLowerCase().trim();
  return CATEGORY_LABELS[key] || category.replace(/_/g, " ");
}

export function localizeTag(tag: string) {
  const trimmed = tag.trim();
  if (!trimmed) return "";
  const key = trimmed.toLowerCase();
  return TAG_LABELS[key] || trimmed;
}

export function localizeTags(tags: string[] = []) {
  const seen = new Set<string>();
  const localized: string[] = [];
  for (const tag of tags) {
    const value = localizeTag(tag);
    const normalized = value.toLowerCase();
    if (!value || seen.has(normalized)) continue;
    seen.add(normalized);
    localized.push(value);
  }
  return localized;
}
