import type { Recommendation } from "@life/shared-types";

/** Imagens editoriais estáveis (Unsplash) por tema — fallback quando não há foto real. */
const THEME_IMAGES: Array<{ keywords: string[]; url: string }> = [
  {
    keywords: ["japon", "sushi", "izakaya", "omakase", "ramen"],
    url: "https://images.unsplash.com/photo-1579584425558c2502eab9c6?auto=format&fit=crop&w=900&q=80",
  },
  {
    keywords: ["italian", "italiana", "massa", "trattoria", "pizza", "pasta"],
    url: "https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=900&q=80",
  },
  {
    keywords: ["cafe", "café", "brunch", "padaria", "bakery"],
    url: "https://images.unsplash.com/photo-1495474472285-4d09bcff4a65?auto=format&fit=crop&w=900&q=80",
  },
  {
    keywords: ["bar", "drink", "coquetel", "wine", "vinho", "cocktail"],
    url: "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=900&q=80",
  },
  {
    keywords: ["mexican", "mexicana", "taco"],
    url: "https://images.unsplash.com/photo-1565299585323-38174c4aab0e?auto=format&fit=crop&w=900&q=80",
  },
  {
    keywords: ["indian", "indiana", "curry"],
    url: "https://images.unsplash.com/photo-1585937421612-70a008296fbe?auto=format&fit=crop&w=900&q=80",
  },
  {
    keywords: ["thai", "tailandesa"],
    url: "https://images.unsplash.com/photo-1559314809-0d155014e29e?auto=format&fit=crop&w=900&q=80",
  },
  {
    keywords: ["french", "francesa", "bistro"],
    url: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=900&q=80",
  },
  {
    keywords: ["chinese", "chinesa", "dim sum"],
    url: "https://images.unsplash.com/photo-1525755662778-989d05058b23?auto=format&fit=crop&w=900&q=80",
  },
  {
    keywords: ["brazilian", "brasileira", "churrasco", "feijoada"],
    url: "https://images.unsplash.com/photo-1529042410759-befb1204b916?auto=format&fit=crop&w=900&q=80",
  },
  {
    keywords: ["burger", "hamburguer"],
    url: "https://images.unsplash.com/photo-1568901347635-4cef5c0f83f0?auto=format&fit=crop&w=900&q=80",
  },
  {
    keywords: ["museum", "museu", "expos"],
    url: "https://images.unsplash.com/photo-1564399579883-451a5d44ec08?auto=format&fit=crop&w=900&q=80",
  },
  {
    keywords: ["cinema", "filme", "movie", "series", "série"],
    url: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=900&q=80",
  },
  {
    keywords: ["event", "festival", "show", "teatro"],
    url: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=900&q=80",
  },
  {
    keywords: ["delivery", "entrega"],
    url: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=900&q=80",
  },
  {
    keywords: ["opening", "abertura", "critica", "review", "editorial", "paladar"],
    url: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=900&q=80",
  },
];

const DOMAIN_DEFAULTS: Record<string, string> = {
  dining_out: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=900&q=80",
  movies_series: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=900&q=80",
  events_exhibitions: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=900&q=80",
  delivery: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=900&q=80",
};

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function buildSearchText(item: {
  title?: string;
  description?: string;
  category?: string;
  domain?: string;
  tags?: string[];
}) {
  return normalizeText([item.title, item.description, item.category, item.domain, ...(item.tags || [])].join(" "));
}

export function resolveThemeImageUrl(item: {
  title?: string;
  description?: string;
  category?: string;
  domain?: string;
  tags?: string[];
}) {
  const text = buildSearchText(item);
  for (const theme of THEME_IMAGES) {
    if (theme.keywords.some((keyword) => text.includes(normalizeText(keyword)))) {
      return theme.url;
    }
  }
  return DOMAIN_DEFAULTS[item.domain || "dining_out"] || DOMAIN_DEFAULTS.dining_out;
}

export function attachRecommendationImage<T extends Recommendation>(item: T): T {
  if (item.image_url) return item;
  return { ...item, image_url: resolveThemeImageUrl(item) };
}

export function attachRecommendationImages<T extends Recommendation>(items: T[]): T[] {
  return items.map(attachRecommendationImage);
}
