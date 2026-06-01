export type EditorialTopic = "openings" | "reviews" | "trends" | "events" | "all";

export type SourceDefinition = {
  id: string;
  label: string;
  feeds?: string[];
  domain: "dining_out" | "movies_series" | "events_exhibitions";
  contentTier: "signature" | "curated";
  curationBoost: number;
  topics: EditorialTopic[];
  tags: string[];
};

export const GASTRO_EDITORIAL_SOURCES: SourceDefinition[] = [
  {
    id: "catraca_livre",
    label: "Catraca Livre",
    feeds: ["https://catracalivre.com.br/feed/"],
    domain: "dining_out",
    contentTier: "curated",
    curationBoost: 18,
    topics: ["events", "trends", "all"],
    tags: ["gratuito", "cultura", "sao paulo"],
  },
  {
    id: "folha_comer_beber",
    label: "Folha Comer & Beber",
    feeds: ["https://feeds.folha.uol.com.br/emscmp/reservado/comerdabem/rss091.xml"],
    domain: "dining_out",
    contentTier: "signature",
    curationBoost: 22,
    topics: ["reviews", "trends", "openings", "all"],
    tags: ["critica", "gastronomia", "folha"],
  },
  {
    id: "estadao_paladar",
    label: "Estadão Paladar",
    feeds: ["https://www.estadao.com.br/paladar/rss"],
    domain: "dining_out",
    contentTier: "signature",
    curationBoost: 24,
    topics: ["reviews", "trends", "openings", "all"],
    tags: ["critica", "paladar", "tendencias"],
  },
  {
    id: "exame_casual",
    label: "Exame Casual",
    feeds: ["https://exame.com/feed/rss"],
    domain: "dining_out",
    contentTier: "curated",
    curationBoost: 16,
    topics: ["openings", "trends", "all"],
    tags: ["abertura", "bar", "restaurante"],
  },
];

export const CINEMA_NEWS_SOURCES: SourceDefinition[] = [
  {
    id: "omelete",
    label: "Omelete",
    feeds: ["https://www.omelete.com.br/feeds/rss.xml"],
    domain: "movies_series",
    contentTier: "curated",
    curationBoost: 14,
    topics: ["all"],
    tags: ["cinema", "series", "noticias"],
  },
  {
    id: "adorocinema",
    label: "AdoroCinema",
    feeds: ["https://www.adorocinema.com/rss/news.xml"],
    domain: "movies_series",
    contentTier: "curated",
    curationBoost: 12,
    topics: ["all"],
    tags: ["cinema", "estreias", "critica"],
  },
];

export const LOCAL_EVENT_SOURCES: SourceDefinition[] = [
  {
    id: "catraca_livre",
    label: "Catraca Livre",
    feeds: ["https://catracalivre.com.br/feed/"],
    domain: "events_exhibitions",
    contentTier: "curated",
    curationBoost: 16,
    topics: ["events", "all"],
    tags: ["gratuito", "evento", "sao paulo"],
  },
];

export const EDITORIAL_SOURCE_BOOST: Record<string, number> = {
  "taste & fly": 25,
  "estadão paladar": 24,
  paladar: 24,
  "folha comer & beber": 22,
  "exame casual": 16,
  "catraca livre": 18,
  "são paulo secreto": 15,
  cumbuca: 14,
  "farofa magazine": 20,
  michelin: 26,
  omelete: 12,
  adorocinema: 12,
};

export const PLACE_INTENT_QUERIES: Record<string, { query: string; tags: string[] }> = {
  date_night: { query: "restaurante romantico jantar sao paulo", tags: ["romantico", "jantar"] },
  brunch: { query: "brunch cafe sao paulo", tags: ["brunch", "cafe"] },
  wine: { query: "vinho wine bar sao paulo", tags: ["vinho", "wine bar"] },
  japanese: { query: "restaurante japones sushi sao paulo", tags: ["japones", "sushi"] },
  italian: { query: "restaurante italiano trattoria sao paulo", tags: ["italiano", "massa"] },
  mexican: { query: "restaurante mexicano tacos sao paulo", tags: ["mexicano", "taco"] },
  french: { query: "restaurante frances bistro sao paulo", tags: ["frances", "bistro"] },
  indian: { query: "restaurante indiano curry sao paulo", tags: ["indiano", "curry"] },
  thai: { query: "restaurante tailandes sao paulo", tags: ["tailandes", "thai"] },
  brazilian: { query: "restaurante brasileiro churrasco sao paulo", tags: ["brasileiro", "churrasco"] },
  chinese: { query: "restaurante chines dim sum sao paulo", tags: ["chines", "dim sum"] },
};

export const TICKETMASTER_GASTRO_KEYWORDS = [
  "gastronomia",
  "festival",
  "restaurant week",
  "wine",
  "food",
];
