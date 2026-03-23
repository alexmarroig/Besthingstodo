import {
  ConciergeOption,
  ConciergeResponse,
  CoupleSnapshot,
  DateNightPlan,
  ExperienceContext,
  Recommendation
} from "./types";

const DEFAULT_PROFILE = {
  location: {
    city: "Sao Paulo",
    neighborhood: "Campo Belo",
    max_drive_minutes: 40,
    transport: "car",
    avoid_going_out_when_rain: true
  },
  lifestyle: {
    avoid_crowded_places: true,
    avoid_bar: true,
    avoid_nightclub: true,
    preferences: ["romantic", "fun", "instagrammable", "small", "cozy"]
  },
  interests: {
    topics: ["technology", "science", "psychology", "astrology"],
    parks: ["Villa-Lobos"],
    cinema: {
      favorite_style: ["suspense", "plot twist", "without nudity", "not horror"],
      favorite_titles: ["Interstellar", "Titanic", "Parasite", "The Others"]
    },
    series: ["This Is Us", "The Bear"]
  },
  dining: {
    dining_out: [
      { name: "Lellis Trattoria", dishes: ["ravioloni de queijo", "bife a milanesa"] },
      { name: "Libertango", dishes: ["ojo de bife"] },
      { name: "Pizzaria Graminha", dishes: ["portuguesa", "pizza de chocolate"] },
      { name: "Issho", dishes: ["yakissoba"] }
    ],
    delivery: ["Patties", "Z-Deli", "Issho"],
    likes: ["cafes", "bookstores"],
    favorite_bookstore: "Livraria da Travessa (Pinheiros)",
    best_time_for_bookstore: "near closing"
  },
  culture: {
    liked_exhibitions: ["Jung", "Nise da Silveira", "Jardim de Luzes", "Dopamine Land"],
    wishlist: ["Theatro Municipal", "Planetario"]
  }
};

const DEFAULT_COUPLE: CoupleSnapshot = {
  account_name: "Alex & Camila",
  city: "Sao Paulo",
  neighborhood: "Campo Belo",
  country: "Brazil",
  search_radius_km: 10,
  max_drive_minutes: 40,
  transport: "car",
  avoid_going_out_when_rain: true,
  weekend_wake_time: "10:00",
  members: [
    {
      full_name: "Alex",
      drinks_alcohol: false,
      smokes: false,
      interests: ["technology", "science", "psychology", "astrology"],
      dislikes: ["crowded places", "nightclubs", "bars", "onion"]
    },
    {
      full_name: "Camila",
      drinks_alcohol: false,
      smokes: false,
      interests: ["psychology", "astrology"],
      dislikes: ["crowded places", "nightclubs", "bars"]
    }
  ],
  profile: { schema_version: "v1", couple_profile_json: DEFAULT_PROFILE }
};

const FAVORITE_VENUE_META: Record<string, { neighborhood: string; domain: Recommendation["domain"]; category: string; tags: string[]; fallback: string }> = {
  "lellis trattoria": { neighborhood: "Bela Vista", domain: "dining_out", category: "restaurant", tags: ["massa", "clássico", "romântico"], fallback: "dining" },
  libertango: { neighborhood: "Moema", domain: "dining_out", category: "restaurant", tags: ["carne", "aconchegante", "jantar"], fallback: "dining" },
  "pizzaria graminha": { neighborhood: "Moema", domain: "dining_out", category: "restaurant", tags: ["pizza", "conforto", "casual"], fallback: "dining" },
  issho: { neighborhood: "Moema", domain: "dining_out", category: "restaurant", tags: ["japonês", "conforto", "noite"], fallback: "dining" },
  "livraria da travessa": { neighborhood: "Pinheiros", domain: "events_exhibitions", category: "bookstore", tags: ["livraria", "café", "intimista"], fallback: "bookstore" },
  "theatro municipal": { neighborhood: "Centro", domain: "events_exhibitions", category: "cultural", tags: ["teatro", "wishlist", "clássico"], fallback: "museum" },
  planetario: { neighborhood: "Ibirapuera", domain: "events_exhibitions", category: "cultural", tags: ["planetário", "wishlist", "experiência"], fallback: "museum" },
  masp: { neighborhood: "Paulista", domain: "events_exhibitions", category: "museum", tags: ["museu", "exposição", "clássico"], fallback: "museum" },
  "ims paulista": { neighborhood: "Paulista", domain: "events_exhibitions", category: "museum", tags: ["fotografia", "café", "curadoria"], fallback: "museum" }
};


const SIMILAR_THEME_BY_FAVORITE: Record<string, string[]> = {
  "lellis trattoria": ["italian-romantic"],
  libertango: ["steak-romantic"],
  "pizzaria graminha": ["pizza-comfort"],
  issho: ["japanese-comfort"],
  "livraria da travessa": ["bookstore-cafe"],
  "theatro municipal": ["classic-culture"],
  planetario: ["science-culture"],
  masp: ["museum-culture"],
  "ims paulista": ["museum-culture", "bookstore-cafe"]
};

const WATCH_THEME_BY_REFERENCE: Record<string, string[]> = {
  suspense: ["smart-twist"],
  "plot twist": ["smart-twist"],
  interstellar: ["elevated-sci-fi"],
  titanic: ["big-romance"],
  parasite: ["smart-twist"],
  "the others": ["smart-twist"],
  "this is us": ["warm-series"],
  "the bear": ["chef-drama"]
};

const SIMILAR_VENUE_CATALOG: Array<{
  id: string;
  title: string;
  neighborhood: string;
  domain: Recommendation["domain"];
  category: string;
  theme: string;
  tags: string[];
  description: string;
  reason: string;
  fallback: string;
  price?: number | null;
}> = [
  {
    id: "similar-modern-mamma",
    title: "Modern Mamma Osteria",
    neighborhood: "Jardins",
    domain: "dining_out",
    category: "restaurant",
    theme: "italian-romantic",
    tags: ["massa", "trattoria", "aconchegante"],
    description: "Italiano com cara de noite especial sem precisar virar programa engessado.",
    reason: "Se Lellis funciona para vocês, aqui entra como primo contemporâneo com a mesma energia de jantar confortável.",
    fallback: "dining",
    price: 120
  },
  {
    id: "similar-nino-cucina",
    title: "Nino Cucina",
    neighborhood: "Jardins",
    domain: "dining_out",
    category: "restaurant",
    theme: "italian-romantic",
    tags: ["italiano", "date", "aconchegante"],
    description: "Boa opção para repetir a lógica de trattoria caprichada em clima mais atual.",
    reason: "Mantém a linha de jantar italiano que costuma agradar vocês, mas abre uma variação de repertório.",
    fallback: "dining",
    price: 130
  },
  {
    id: "similar-chimi",
    title: "Chimi Parrilla",
    neighborhood: "Moema",
    domain: "dining_out",
    category: "restaurant",
    theme: "steak-romantic",
    tags: ["carne", "jantar", "intimista"],
    description: "Parrilla com clima de encontro e menos cara de rodízio ou operação barulhenta.",
    reason: "Se Libertango conversa com vocês, essa é uma variação forte do mesmo eixo carne + conforto.",
    fallback: "dining",
    price: 140
  },
  {
    id: "similar-pobre-juan",
    title: "Pobre Juan",
    neighborhood: "Ibirapuera",
    domain: "dining_out",
    category: "restaurant",
    theme: "steak-romantic",
    tags: ["carne", "especial", "noite"],
    description: "Jantar mais clássico para quando a ideia é dar um pouco mais de peso ao encontro.",
    reason: "Segue o trilho de steakhouse confortável que se aproxima de Libertango sem depender de bar.",
    fallback: "dining",
    price: 170
  },
  {
    id: "similar-braz",
    title: "Bráz Pizzaria",
    neighborhood: "Pinheiros",
    domain: "dining_out",
    category: "restaurant",
    theme: "pizza-comfort",
    tags: ["pizza", "conforto", "casual"],
    description: "Pizza forte para quando vocês querem algo sem erro e com clima gostoso.",
    reason: "Se a lógica da Graminha é conforto + pizza boa, a Bráz entra como similar muito segura.",
    fallback: "dining",
    price: 95
  },
  {
    id: "similar-pizza-da-mooca",
    title: "A Pizza da Mooca",
    neighborhood: "Mooca",
    domain: "dining_out",
    category: "restaurant",
    theme: "pizza-comfort",
    tags: ["pizza", "aconchegante", "date"],
    description: "Boa alternativa para uma noite casual com muito mais cara de casal do que de saída aleatória.",
    reason: "Pega a memória afetiva de pizzaria favorita e traduz para um contexto novo, mas ainda familiar.",
    fallback: "dining",
    price: 100
  },
  {
    id: "similar-kinoshita",
    title: "Kinoshita",
    neighborhood: "Vila Nova Conceição",
    domain: "dining_out",
    category: "restaurant",
    theme: "japanese-comfort",
    tags: ["japonês", "calmo", "especial"],
    description: "Japô mais refinado para quando a vontade é variar do repertório sem sair do eixo de conforto.",
    reason: "Se Issho já entra bem, o Kinoshita funciona como evolução de jantar japonês para uma noite especial.",
    fallback: "dining",
    price: 180
  },
  {
    id: "similar-aizome",
    title: "Aizomê",
    neighborhood: "Jardins",
    domain: "dining_out",
    category: "restaurant",
    theme: "japanese-comfort",
    tags: ["japonês", "elegante", "quiet"],
    description: "Leva o conforto do japonês para um lugar mais calmo e intencional.",
    reason: "Mantém a família de sabores que vocês curtem, com mais atmosfera de encontro.",
    fallback: "dining",
    price: 160
  },
  {
    id: "similar-megafauna",
    title: "Megafauna + café no Copan",
    neighborhood: "Centro",
    domain: "events_exhibitions",
    category: "bookstore",
    theme: "bookstore-cafe",
    tags: ["livraria", "café", "descoberta"],
    description: "Livraria com assinatura mais contemporânea para quem gosta de livraria como programa em si.",
    reason: "Se a Travessa é um favorito, Megafauna entra como similar de repertório e clima de conversa.",
    fallback: "bookstore",
    price: 0
  },
  {
    id: "similar-biblioteca-mario",
    title: "Biblioteca Mário de Andrade + café no centro",
    neighborhood: "Centro",
    domain: "events_exhibitions",
    category: "bookstore",
    theme: "bookstore-cafe",
    tags: ["livros", "centro", "calmo"],
    description: "Programa de cidade com mais personalidade do que uma parada genérica em shopping.",
    reason: "Traz a mesma lógica de livro + conversa, só que com uma pegada mais paulistana e nova.",
    fallback: "bookstore",
    price: 0
  },
  {
    id: "similar-sala-sao-paulo",
    title: "Sala São Paulo",
    neighborhood: "Centro",
    domain: "events_exhibitions",
    category: "cultural",
    theme: "classic-culture",
    tags: ["música", "cultural", "clássico"],
    description: "Boa expansão para quem já tem Theatro Municipal na wishlist e quer peso cultural sem cara de aula.",
    reason: "É o tipo de programa vizinho do Theatro Municipal: repertório forte, mas ainda muito dateável.",
    fallback: "museum",
    price: 0
  },
  {
    id: "similar-mis",
    title: "MIS + roteiro visual em Pinheiros",
    neighborhood: "Pinheiros",
    domain: "events_exhibitions",
    category: "museum",
    theme: "museum-culture",
    tags: ["museu", "imagem", "curadoria"],
    description: "Museu com energia parecida de repertório visual e conversa boa no pós.",
    reason: "Se MASP e IMS entram bem, o MIS aparece como similar natural dentro do mesmo território cultural.",
    fallback: "museum",
    price: 0
  },
  {
    id: "similar-catavento",
    title: "Museu Catavento",
    neighborhood: "Centro",
    domain: "events_exhibitions",
    category: "museum",
    theme: "science-culture",
    tags: ["ciência", "descoberta", "experiência"],
    description: "Puxa curiosidade e descoberta, o que conversa com ciência e com a vontade de variar do óbvio.",
    reason: "Se o Planetário aparece como desejo, o Catavento entra como similar inteligente e mais exploratório.",
    fallback: "museum",
    price: 0
  }
];

const WATCH_MATCH_CATALOG: Array<{
  id: string;
  title: string;
  location: string;
  neighborhood: string;
  category: string;
  theme: string;
  tags: string[];
  description: string;
  reason: string;
  price?: number | null;
}> = [
  {
    id: "watch-belas-artes",
    title: "Petra Belas Artes + café depois",
    location: "Consolação",
    neighborhood: "Consolação",
    category: "cinema",
    theme: "smart-twist",
    tags: ["cinema de rua", "conversa depois", "intimista"],
    description: "Sessão com mais cara de cinema de verdade, boa para sair do automático e ainda render assunto depois.",
    reason: "Quando vocês gostam de virada, tensão elegante e conversa pós-filme, esse circuito funciona melhor do que shopping genérico.",
    price: 38
  },
  {
    id: "watch-cinesesc",
    title: "CineSesc + jantar leve em Pinheiros",
    location: "Pinheiros",
    neighborhood: "Pinheiros",
    category: "cinema",
    theme: "elevated-sci-fi",
    tags: ["cinema", "repertório", "date"],
    description: "Boa rota para quando a ideia é ver algo mais autoral sem perder a leveza do encontro.",
    reason: "Se Interstellar e filmes com mais ambição visual entram bem, esse tipo de sala costuma encaixar melhor com o repertório de vocês.",
    price: 32
  },
  {
    id: "watch-reserva-cultural",
    title: "Reserva Cultural + noite pela Paulista",
    location: "Paulista",
    neighborhood: "Paulista",
    category: "cinema",
    theme: "big-romance",
    tags: ["cinema", "paulista", "romântico"],
    description: "Programa com cara de cidade e potencial de virar noite completa sem muito esforço logístico.",
    reason: "Faz sentido quando vocês querem romance com peso emocional, mas sem cair no clichê de restaurante apenas.",
    price: 40
  },
  {
    id: "watch-perfect-days",
    title: "Perfect Days em casa + café doce",
    location: "Em casa",
    neighborhood: "Em casa",
    category: "streaming",
    theme: "warm-series",
    tags: ["filme", "calmo", "em casa"],
    description: "Filme de ritmo humano e aconchegante para noites em que vocês querem desacelerar de verdade.",
    reason: "Conversa bem com a delicadeza emocional que costuma funcionar para vocês e não exige energia social nenhuma.",
    price: 0
  },
  {
    id: "watch-past-lives",
    title: "Past Lives em casa + jantar pedido do lugar favorito",
    location: "Em casa",
    neighborhood: "Em casa",
    category: "streaming",
    theme: "big-romance",
    tags: ["filme", "romântico", "sofá"],
    description: "Boa escolha para quando a noite pede romance adulto, conversa e um pouco de emoção sem exagero.",
    reason: "Se Titanic fica na memória afetiva, aqui aparece uma versão mais íntima e contemporânea da mesma vontade de sentir a história.",
    price: 0
  },
  {
    id: "watch-anatomy-of-a-fall",
    title: "Anatomy of a Fall em casa + conversa longa depois",
    location: "Em casa",
    neighborhood: "Em casa",
    category: "streaming",
    theme: "smart-twist",
    tags: ["filme", "plot twist", "debate"],
    description: "Ótimo para uma noite em que o mais gostoso é assistir juntos e depois destrinchar tudo.",
    reason: "Mantém o prazer de suspense inteligente e leitura de detalhes, bem perto do eixo Parasite e The Others.",
    price: 0
  },
  {
    id: "watch-julie-julia",
    title: "Julie & Julia em casa + pedir algo gostoso",
    location: "Em casa",
    neighborhood: "Em casa",
    category: "streaming",
    theme: "chef-drama",
    tags: ["filme", "comida", "comfort"],
    description: "Programa simpático para transformar comida + sofá em algo mais intencional do que só ligar qualquer coisa.",
    reason: "Se The Bear virou referência afetiva, essa opção preserva o prazer da cozinha e da relação sem a ansiedade da série.",
    price: 0
  }
];
const POSITIVE_KEYWORDS = [
  "museu",
  "museum",
  "exposição",
  "exhibition",
  "cinema",
  "cafe",
  "café",
  "livraria",
  "bookstore",
  "jantar",
  "restaurant",
  "concerto",
  "concert",
  "parque",
  "gallery",
  "galeria",
  "theatro",
  "ims",
  "masp",
  "japan house",
  "planetario"
];

const NEGATIVE_KEYWORDS = [
  "conference",
  "conferência",
  "summit",
  "curso",
  "workshop",
  "imersão",
  "cadaver",
  "lab",
  "certification",
  "training",
  "bootcamp",
  "education conference"
];

const BAR_KEYWORDS = ["bar", "wine", "vinho", "cocktail", "drinks", "beer", "cerveja"];
const QUIET_KEYWORDS = ["cozy", "quiet", "calm", "intimista", "bookstore", "café", "cafe", "museu", "museum", "livraria", "trattoria"];
const OUTDOOR_KEYWORDS = ["park", "parque", "praça", "walk", "caminhada", "garden", "jardim"];
const INDOOR_KEYWORDS = ["museum", "museu", "cinema", "livraria", "café", "cafe", "restaurant", "theatro", "galeria", "exposição", "planetario"];

export function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function containsKeyword(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(normalizeText(keyword)));
}

function mergeProfile(base: Record<string, any>, patch: Record<string, any> | undefined) {
  if (!patch) return base;
  const result: Record<string, any> = { ...base };
  for (const [key, value] of Object.entries(patch)) {
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      result[key] &&
      typeof result[key] === "object" &&
      !Array.isArray(result[key])
    ) {
      result[key] = mergeProfile(result[key], value as Record<string, any>);
    } else {
      result[key] = value;
    }
  }
  return result;
}

export function getCoupleSnapshot(couple?: CoupleSnapshot | null): CoupleSnapshot {
  if (!couple) return DEFAULT_COUPLE;
  const profile = mergeProfile(DEFAULT_PROFILE, couple.profile?.couple_profile_json as Record<string, any> | undefined);
  return {
    ...DEFAULT_COUPLE,
    ...couple,
    profile: {
      schema_version: couple.profile?.schema_version || "v1",
      couple_profile_json: profile
    },
    members: couple.members?.length ? couple.members : DEFAULT_COUPLE.members
  };
}

function dayLabel(hour: number) {
  if (hour < 12) return "manhã";
  if (hour < 18) return "fim de tarde";
  return "noite";
}

export function buildFallbackContext(city = "Sao Paulo"): ExperienceContext {
  const now = new Date();
  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      hour: "2-digit",
      hour12: false,
      timeZone: "America/Sao_Paulo"
    }).format(now)
  );

  return {
    city,
    temperature: null,
    weather: "unknown",
    local_time: now.toISOString(),
    day_of_week: new Intl.DateTimeFormat("pt-BR", { weekday: "long", timeZone: "America/Sao_Paulo" }).format(now),
    weather_label: "tempo instável",
    weather_note: "Sem clima ao vivo, então priorizei opções confortáveis e fáceis de encaixar.",
    time_label: dayLabel(hour),
    isRainy: false,
    isNight: hour >= 18
  };
}

export function refineContext(raw: any, fallbackCity = "Sao Paulo"): ExperienceContext {
  const base = buildFallbackContext(raw?.city || fallbackCity);
  const weather = String(raw?.weather || base.weather).toLowerCase();
  const localTime = raw?.local_time || base.local_time;
  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      hour: "2-digit",
      hour12: false,
      timeZone: "America/Sao_Paulo"
    }).format(new Date(localTime))
  );
  const isRainy = /rain|drizzle|storm/.test(weather);
  const weatherLabel = isRainy ? "chuva por perto" : /clear|sun/.test(weather) ? "céu aberto" : /cloud|mist|fog/.test(weather) ? "tempo fechado" : base.weather_label;
  const weatherNote = isRainy
    ? "Hoje vale puxar lugares cobertos, de logística simples e com cara de refúgio."
    : /clear|sun/.test(weather)
      ? "A noite está favorável para estender um pouco o passeio sem correria."
      : "O melhor é combinar conforto com deslocamento simples, sem depender demais do tempo.";

  return {
    city: raw?.city || fallbackCity,
    temperature: typeof raw?.temperature === "number" ? raw.temperature : null,
    weather,
    local_time: localTime,
    day_of_week: raw?.day_of_week || base.day_of_week,
    weather_label: weatherLabel,
    weather_note: weatherNote,
    time_label: dayLabel(hour),
    isRainy,
    isNight: hour >= 18
  };
}

function extractFavoriteVenues(couple: CoupleSnapshot) {
  const diningOut = couple.profile?.couple_profile_json?.dining?.dining_out || [];
  const bookstore = couple.profile?.couple_profile_json?.dining?.favorite_bookstore;
  const wishlist = couple.profile?.couple_profile_json?.culture?.wishlist || [];
  const likedExhibitions = couple.profile?.couple_profile_json?.culture?.liked_exhibitions || [];

  return [
    ...diningOut.map((item: any) => item.name).filter(Boolean),
    bookstore,
    ...wishlist,
    ...likedExhibitions,
    "MASP",
    "IMS Paulista"
  ]
    .filter(Boolean)
    .map((value: string) => String(value));
}

function extractDeliveryFavorites(couple: CoupleSnapshot) {
  return (couple.profile?.couple_profile_json?.dining?.delivery || [])
    .filter(Boolean)
    .map((value: string) => String(value));
}

function extractWatchReferences(couple: CoupleSnapshot) {
  const cinemaStyles = couple.profile?.couple_profile_json?.interests?.cinema?.favorite_style || [];
  const favoriteTitles = couple.profile?.couple_profile_json?.interests?.cinema?.favorite_titles || [];
  const favoriteSeries = couple.profile?.couple_profile_json?.interests?.series || [];

  return [...cinemaStyles, ...favoriteTitles, ...favoriteSeries]
    .filter(Boolean)
    .map((value: string) => String(value));
}

function extractPreferenceTerms(couple: CoupleSnapshot) {
  const topics = couple.profile?.couple_profile_json?.interests?.topics || [];
  const lifestyle = couple.profile?.couple_profile_json?.lifestyle?.preferences || [];
  const likes = couple.profile?.couple_profile_json?.dining?.likes || [];
  const favoriteDishes = (couple.profile?.couple_profile_json?.dining?.dining_out || []).flatMap((item: any) => item.dishes || []);
  const exhibitions = couple.profile?.couple_profile_json?.culture?.liked_exhibitions || [];
  const memberInterests = couple.members.flatMap((member) => member.interests || []);
  return [...topics, ...lifestyle, ...likes, ...favoriteDishes, ...exhibitions, ...memberInterests].map((value) => String(value));
}

function extractProfileSignals(couple: CoupleSnapshot) {
  return Array.from(
    new Set([
      ...extractPreferenceTerms(couple),
      ...extractFavoriteVenues(couple),
      ...extractDeliveryFavorites(couple),
      ...extractWatchReferences(couple)
    ])
  )
    .map((value) => String(value).trim())
    .filter((value) => value.length > 2);
}

function favoriteVenueMatches(item: Recommendation, couple: CoupleSnapshot) {
  const text = normalizeText([item.title, item.location, item.description, item.reason || "", ...(item.tags || []), ...((item.profile_signals as string[]) || [])].join(" "));
  return extractFavoriteVenues(couple).filter((venue) => text.includes(normalizeText(venue)));
}

function profileSignalMatches(item: Recommendation, couple: CoupleSnapshot) {
  const text = normalizeText([item.title, item.location, item.description, item.reason || "", ...(item.tags || []), ...((item.profile_signals as string[]) || [])].join(" "));
  return extractProfileSignals(couple).filter((signal) => text.includes(normalizeText(signal)));
}

function buildProfileAnchors(couple: CoupleSnapshot, context: ExperienceContext): Recommendation[] {
  const favorites = extractFavoriteVenues(couple);
  const anchors: Recommendation[] = [];

  for (const venue of favorites) {
    const key = normalizeText(venue);
    const meta = FAVORITE_VENUE_META[key] || {
      neighborhood: couple.neighborhood || "São Paulo",
      domain: "events_exhibitions" as Recommendation["domain"],
      category: "experience",
      tags: ["preferência do casal", "curadoria pessoal"],
      fallback: "editorial"
    };

    const isDining = meta.domain === "dining_out";
    const isRainFriendly = context.isRainy || meta.category === "restaurant" || meta.category === "museum" || meta.category === "bookstore";

    anchors.push({
      id: `profile-anchor-${key.replace(/\s+/g, "-")}`,
      title: venue,
      description: isDining
        ? "Lugar que já conversa com o histórico gastronômico do casal e entra como aposta forte quando a ideia é jantar bem."
        : "Lugar que faz sentido pelo histórico cultural e afetivo do casal, não só porque está disponível na cidade.",
      category: meta.category,
      domain: meta.domain,
      content_tier: "signature",
      city: couple.city || "São Paulo",
      location: venue,
      neighborhood: meta.neighborhood,
      distance_label: "bate-volta bom",
      indoor_outdoor: isDining ? "indoor" : "mixed",
      weather_fit: isRainFriendly
        ? "Continua fazendo sentido mesmo se o tempo virar."
        : "Brilha mais quando o clima colabora e vocês querem estender a noite.",
      couple_fit_reason: isDining
        ? `É um favorito ou muito próximo do repertório de jantar que vocês já curtiram, então entra com prioridade alta.`
        : `Não é sugestão genérica: isso conecta com a wishlist e com referências culturais que já apareceram no perfil de vocês.`,
      personalization_label: isDining || key.includes("livraria") ? "favorito do casal" : "wishlist do casal",
      related_favorite: venue,
      image_fallback_key: meta.fallback,
      quality_score: isDining ? 97 : 95,
      price: null,
      tags: [...meta.tags, "personalizado", "casal"],
      source: "curadoria personalizada",
      profile_signals: [venue],
      url: null
    });
  }

  return anchors;
}


function extractFavoriteThemes(couple: CoupleSnapshot) {
  const favorites = extractFavoriteVenues(couple).map((venue) => normalizeText(venue));
  return Array.from(new Set(favorites.flatMap((venue) => SIMILAR_THEME_BY_FAVORITE[venue] || [])));
}

function extractWatchThemes(couple: CoupleSnapshot) {
  const references = extractWatchReferences(couple).map((value) => normalizeText(value));
  return Array.from(new Set(references.flatMap((value) => WATCH_THEME_BY_REFERENCE[value] || [])));
}

function themeReference(theme: string, couple: CoupleSnapshot) {
  const favorites = extractFavoriteVenues(couple);
  return favorites.find((venue) => (SIMILAR_THEME_BY_FAVORITE[normalizeText(venue)] || []).includes(theme)) || "um favorito do casal";
}

function watchThemeReference(theme: string, couple: CoupleSnapshot) {
  const references = extractWatchReferences(couple);
  return references.find((value) => (WATCH_THEME_BY_REFERENCE[normalizeText(value)] || []).includes(theme)) || "algo que vocês já curtem assistir";
}

function buildSimilarAnchors(couple: CoupleSnapshot, context: ExperienceContext): Recommendation[] {
  const themes = extractFavoriteThemes(couple);
  const exactFavorites = extractFavoriteVenues(couple).map((venue) => normalizeText(venue));

  return SIMILAR_VENUE_CATALOG
    .filter((item) => themes.includes(item.theme) && !exactFavorites.includes(normalizeText(item.title)))
    .map((item) => {
      const reference = themeReference(item.theme, couple);
      return {
        id: item.id,
        title: item.title,
        description: item.description,
        category: item.category,
        domain: item.domain,
        content_tier: "curated",
        city: couple.city || "São Paulo",
        location: item.title,
        neighborhood: item.neighborhood,
        distance_label: "bate-volta bom",
        indoor_outdoor: item.domain === "dining_out" || item.domain === "movies_series" ? "indoor" : "mixed",
        weather_fit: context.isRainy ? "Continua sendo uma boa mesmo com clima mais fechado." : "Boa similar para quando vocês querem variar sem sair do mesmo universo.",
        couple_fit_reason: item.reason,
        personalization_label: "parecido com um favorito",
        related_favorite: reference,
        image_fallback_key: item.fallback,
        quality_score: 91,
        price: item.price ?? null,
        tags: [...item.tags, "similar aos favoritos", "descoberta guiada"],
        source: "curadoria personalizada",
        profile_signals: [reference],
        url: null
      } satisfies Recommendation;
    });
}

function buildWatchAnchors(couple: CoupleSnapshot, context: ExperienceContext): Recommendation[] {
  const themes = extractWatchThemes(couple);
  if (!themes.length) return [];

  return WATCH_MATCH_CATALOG.filter((item) => themes.includes(item.theme)).map((item) => {
    const reference = watchThemeReference(item.theme, couple);
    const atHome = normalizeText(item.location) === "em casa";

    return {
      id: item.id,
      title: item.title,
      description: item.description,
      category: item.category,
      domain: "movies_series",
      content_tier: atHome ? "curated" : "signature",
      city: couple.city || "São Paulo",
      location: item.location,
      neighborhood: item.neighborhood,
      distance_label: atHome ? "zero deslocamento" : "bate-volta bom",
      indoor_outdoor: "indoor",
      weather_fit: atHome
        ? "Perfeito para quando vocês querem clima de casal sem logística nenhuma."
        : context.isRainy
          ? "Boa escolha porque mantém a noite coberta e ainda com cara de programa."
          : "Funciona bem quando a ideia é assistir juntos e estender a conversa depois.",
      couple_fit_reason: item.reason,
      personalization_label: atHome ? "parecido com o que vocês assistem" : "cinema com a energia de vocês",
      related_favorite: reference,
      image_fallback_key: "cinema",
      quality_score: atHome ? 90 : 92,
      price: item.price ?? null,
      tags: [...item.tags, "assistir juntos", "personalizado"],
      source: "curadoria personalizada",
      profile_signals: [reference],
      url: null
    } satisfies Recommendation;
  });
}
function inferNeighborhood(item: Recommendation) {
  const text = normalizeText([item.location, item.title, ...(item.tags || [])].join(" "));
  if (text.includes("pinheiros")) return "Pinheiros";
  if (text.includes("paulista") || text.includes("bela vista")) return "Paulista";
  if (text.includes("ibirapuera")) return "Ibirapuera";
  if (text.includes("vila madalena")) return "Vila Madalena";
  if (text.includes("moema")) return "Moema";
  if (text.includes("centro") || text.includes("republica")) return "Centro";
  if (text.includes("jardins")) return "Jardins";
  if (text.includes("campo belo")) return "Campo Belo";
  return item.neighborhood || "São Paulo";
}

function inferIndoorOutdoor(item: Recommendation): Recommendation["indoor_outdoor"] {
  const text = normalizeText([item.title, item.description, item.reason || "", ...(item.tags || [])].join(" "));
  if (containsKeyword(text, OUTDOOR_KEYWORDS) && containsKeyword(text, INDOOR_KEYWORDS)) return "mixed";
  if (containsKeyword(text, OUTDOOR_KEYWORDS)) return "outdoor";
  if (containsKeyword(text, INDOOR_KEYWORDS)) return "indoor";
  return item.domain === "dining_out" || item.domain === "movies_series" ? "indoor" : "mixed";
}

function inferFallbackKey(item: Recommendation): string {
  const text = normalizeText([item.title, item.description, ...(item.tags || [])].join(" "));
  if (text.includes("cinema") || item.domain === "movies_series") return "cinema";
  if (text.includes("livraria") || text.includes("bookstore")) return "bookstore";
  if (text.includes("cafe") || text.includes("café")) return "cafe";
  if (text.includes("museu") || text.includes("museum") || text.includes("exposição")) return "museum";
  if (text.includes("jantar") || text.includes("restaurant") || item.domain === "dining_out") return "dining";
  if (containsKeyword(text, OUTDOOR_KEYWORDS)) return "outdoor";
  return "editorial";
}

function buildDistanceLabel(neighborhood: string, couple: CoupleSnapshot) {
  const base = normalizeText(couple.neighborhood || "");
  const target = normalizeText(neighborhood);
  if (!base || !target || base === target) return "perto de vocês";
  if (["campo belo", "moema", "ibirapuera"].includes(base) && ["moema", "ibirapuera", "campo belo"].includes(target)) {
    return "deslocamento curto";
  }
  if (["pinheiros", "paulista", "jardins", "vila madalena", "bela vista", "centro"].includes(target)) {
    return "bate-volta bom";
  }
  return "vale a travessia";
}

function buildCoupleReason(item: Recommendation, couple: CoupleSnapshot, context: ExperienceContext) {
  const explicitMatch = favoriteVenueMatches(item, couple)[0];
  const profileMatch = profileSignalMatches(item, couple)[0];
  const preferences = extractPreferenceTerms(couple);
  const combinedText = normalizeText([item.title, item.description, item.reason || "", ...(item.tags || []), preferences.join(" ")].join(" "));

  if (explicitMatch) {
    return `Isso conversa diretamente com o histórico de vocês, especialmente ${explicitMatch}, então não entra como sugestão aleatória.`;
  }
  if (profileMatch) {
    return `Isso está mais forte porque conversa com ${profileMatch}, que já aparece no repertório real do casal.`;
  }
  if (containsKeyword(combinedText, ["livraria", "bookstore", "cafe", "café"])) {
    return "Tem clima de conversa boa e combina com o lado café + livraria de vocês.";
  }
  if (containsKeyword(combinedText, ["museum", "museu", "ims", "masp", "exposição", "theatro", "planetario"])) {
    return "Entrega repertório cultural alinhado ao que já aparece na wishlist e nas referências de vocês.";
  }
  if (containsKeyword(combinedText, ["cinema", "movie", "suspense", "plot twist"])) {
    return "Funciona bem para uma noite mais íntima, com o tipo de cinema que conversa com o gosto de vocês.";
  }
  if (item.domain === "dining_out") {
    return "Ajuda a transformar a saída em encontro de verdade, priorizando restaurantes com mais chance de agradar vocês dois.";
  }
  if (context.isRainy && item.indoor_outdoor === "indoor") {
    return "Faz sentido hoje porque segura o clima e ainda preserva o clima de encontro.";
  }
  return "É uma opção mais alinhada com o estilo calmo, cultural e aconchegante que vocês vêm buscando.";
}

function buildAvoidReason(item: Recommendation, couple: CoupleSnapshot, context: ExperienceContext) {
  const text = normalizeText([item.title, item.description, item.reason || "", ...(item.tags || [])].join(" "));
  if (containsKeyword(text, NEGATIVE_KEYWORDS)) return "Parece mais curso ou conferência do que rolê para o casal.";
  if ((couple.profile?.couple_profile_json?.lifestyle?.avoid_bar || !couple.members.some((member) => member.drinks_alcohol)) && containsKeyword(text, BAR_KEYWORDS)) {
    return "Puxa demais para bar ou bebida, o que não combina com as restrições atuais.";
  }
  if (context.isRainy && inferIndoorOutdoor(item) === "outdoor" && couple.avoid_going_out_when_rain) {
    return "Depende demais do tempo aberto para funcionar bem hoje.";
  }
  return "";
}

function scoreRecommendation(item: Recommendation, couple: CoupleSnapshot, context: ExperienceContext) {
  const text = normalizeText([item.title, item.description, item.reason || "", item.location, ...(item.tags || [])].join(" "));
  const favoriteMatches = favoriteVenueMatches(item, couple);
  const profileMatches = profileSignalMatches(item, couple);
  const preferenceTerms = extractPreferenceTerms(couple).map(normalizeText);
  let score = 55;

  if (containsKeyword(text, POSITIVE_KEYWORDS)) score += 18;
  if (containsKeyword(text, QUIET_KEYWORDS)) score += 10;
  if (item.domain === "dining_out") score += 10;
  if (item.domain === "delivery") score += 8;
  if (item.domain === "movies_series") score += 12;
  if (item.domain === "events_exhibitions") score += 7;
  if (item.content_tier === "signature") score += 22;
  if (item.content_tier === "curated") score += 14;
  if (containsKeyword(text, NEGATIVE_KEYWORDS)) score -= 45;
  if ((couple.profile?.couple_profile_json?.lifestyle?.avoid_bar || !couple.members.some((member) => member.drinks_alcohol)) && containsKeyword(text, BAR_KEYWORDS)) score -= 22;
  if (context.isRainy && inferIndoorOutdoor(item) === "indoor") score += 8;
  if (context.isRainy && inferIndoorOutdoor(item) === "outdoor" && couple.avoid_going_out_when_rain) score -= 16;
  if (normalizeText(item.location || "") === normalizeText(item.city || "")) score -= 4;
  if (containsKeyword(text, ["romantic", "cozy", "calm", "intimista", "quiet"])) score += 10;
  if (favoriteMatches.length) score += 24 + favoriteMatches.length * 6;
  if (profileMatches.length) score += 18 + profileMatches.length * 4;
  if (preferenceTerms.some((term) => term && text.includes(term))) score += 12;
  if ((item.source || "").toLowerCase().includes("personalizada")) score += 18;
  if ((item.source || "").toLowerCase().includes("guia curado")) score += 16;

  return Math.max(0, Math.min(100, score));
}

function shouldSuppressGenericItem(item: Recommendation, couple: CoupleSnapshot) {
  if (item.content_tier && item.content_tier !== "discovery") return false;

  const text = normalizeText([item.title, item.description, item.reason || "", item.location, ...(item.tags || [])].join(" "));
  const hasStrongSignal =
    favoriteVenueMatches(item, couple).length > 0 ||
    profileSignalMatches(item, couple).length > 0 ||
    containsKeyword(text, POSITIVE_KEYWORDS) ||
    item.domain === "dining_out" ||
    item.domain === "delivery" ||
    item.domain === "movies_series";

  if (containsKeyword(text, NEGATIVE_KEYWORDS)) return true;
  if (item.domain === "events_exhibitions" && !hasStrongSignal) return true;
  if ((item.quality_score || 0) < 70 && !hasStrongSignal) return true;
  return false;
}

function uniqueByTitle(items: Recommendation[]) {
  const map = new Map<string, Recommendation>();
  for (const item of items) {
    const key = normalizeText([item.title, item.location].join(" "));
    const existing = map.get(key);
    if (!existing || (item.quality_score || 0) > (existing.quality_score || 0)) {
      map.set(key, item);
    }
  }
  return Array.from(map.values());
}

export function curateRecommendations(items: Recommendation[], options?: { context?: ExperienceContext; couple?: CoupleSnapshot; limit?: number }) {
  const couple = getCoupleSnapshot(options?.couple);
  const context = options?.context || buildFallbackContext(couple.city);
  const mergedItems = [...items];

  const curated = uniqueByTitle(mergedItems)
    .map((item) => {
      const neighborhood = inferNeighborhood(item);
      const indoorOutdoor = inferIndoorOutdoor(item);
      const qualityScore = scoreRecommendation(item, couple, context);
      const avoidReason = buildAvoidReason(item, couple, context);
      const favoriteMatch = favoriteVenueMatches(item, couple)[0];
      const weatherFit = context.isRainy
        ? indoorOutdoor === "indoor"
          ? "Ótimo para hoje porque segura bem a chuva."
          : "Melhor só se o tempo firmar."
        : indoorOutdoor === "outdoor"
          ? "Aproveita bem uma janela de tempo mais aberta."
          : "Funciona bem mesmo sem depender do clima.";

      return {
        ...item,
        neighborhood,
        distance_label: item.distance_label || buildDistanceLabel(neighborhood, couple),
        indoor_outdoor: indoorOutdoor,
        weather_fit: item.weather_fit || weatherFit,
        couple_fit_reason: item.couple_fit_reason || buildCoupleReason(item, couple, context),
        personalization_label: item.personalization_label || (favoriteMatch ? "favorito do casal" : undefined),
        related_favorite: item.related_favorite || favoriteMatch || undefined,
        avoid_reason: item.avoid_reason || avoidReason || undefined,
        image_fallback_key: item.image_fallback_key || inferFallbackKey(item),
        quality_score: item.quality_score ?? qualityScore
      };
    })
    .filter((item) => !shouldSuppressGenericItem(item, couple))
    .filter((item) => (item.quality_score || 0) >= 40)
    .sort((a, b) => (b.quality_score || 0) - (a.quality_score || 0));

  return curated.slice(0, options?.limit || curated.length);
}

export function buildDayBrief(items: Recommendation[], context: ExperienceContext, couple?: CoupleSnapshot) {
  const snapshot = getCoupleSnapshot(couple);
  const indoorCount = items.filter((item) => item.indoor_outdoor === "indoor").length;
  const nearbyCount = items.filter((item) => item.distance_label === "perto de vocês" || item.distance_label === "deslocamento curto").length;
  const personalizedCount = items.filter((item) => !!item.personalization_label || (item.source || "").includes("personalizada") || favoriteVenueMatches(item, snapshot).length > 0).length;

  const headline = context.isRainy
    ? "Hoje pede lugares cobertos, pessoais e fáceis de encaixar."
    : context.isNight
      ? "Hoje combina com um roteiro leve, cultural e com cara de vocês."
      : "Hoje vale puxar algo gostoso, perto e muito mais pessoal.";

  const summary = `Monte um plano a partir de ${personalizedCount} apostas diretamente ligadas aos gostos do casal, ${indoorCount} opções mais protegidas e ${nearbyCount} com deslocamento simples.`;
  const chips = [
    context.weather_label,
    `${snapshot.neighborhood || "São Paulo"} como base`,
    "personalizado para o casal",
    snapshot.profile?.couple_profile_json?.lifestyle?.avoid_crowded_places ? "sem lotação" : "mais flexível"
  ];

  return { headline, summary, chips };
}

export function buildWatchRecommendations(args: {
  recommendations: Recommendation[];
  context: ExperienceContext;
  couple?: CoupleSnapshot | null;
  limit?: number;
}) {
  const snapshot = getCoupleSnapshot(args.couple);
  return curateRecommendations(args.recommendations, { context: args.context, couple: snapshot })
    .filter((item) => item.domain === "movies_series")
    .slice(0, args.limit || 12);
}

export function pickForVibe(items: Recommendation[], vibe: "romantic" | "cultural" | "nearby" | "cozy") {
  const filtered = items.filter((item) => {
    const text = normalizeText([item.title, item.couple_fit_reason || "", ...(item.tags || [])].join(" "));
    if (vibe === "romantic") return containsKeyword(text, ["romantic", "intimista", "jantar", "cinema", "cafe", "café", "trattoria"]);
    if (vibe === "cultural") return containsKeyword(text, ["museum", "museu", "ims", "masp", "cinema", "livraria", "theatro", "planetario"]);
    if (vibe === "nearby") return item.distance_label === "perto de vocês" || item.distance_label === "deslocamento curto";
    return containsKeyword(text, ["cozy", "calm", "quiet", "café", "livraria", "bookstore", "trattoria"]);
  });

  return filtered.length ? filtered : items;
}

function extractMemory(message: string, previousMemory: string[]) {
  const text = normalizeText(message);
  const next = new Set(previousMemory);

  if (text.includes("nao bebo") || text.includes("não bebo") || text.includes("sem alcool")) next.add("sem álcool");
  if (text.includes("barato") || text.includes("economico") || text.includes("econômico")) next.add("orçamento mais leve");
  if (text.includes("chuva")) next.add("lugar coberto");
  if (text.includes("romant")) next.add("mais romântico");
  if (text.includes("perto") || text.includes("bairro")) next.add("perto de vocês");
  if (text.includes("hoje")) next.add("hoje à noite");
  if (text.includes("curso") || text.includes("palestra")) next.add("evitar curso");
  if (text.includes("jantar") || text.includes("restaurante")) next.add("foco em jantar");

  return Array.from(next);
}

function applyMemory(items: Recommendation[], memory: string[]) {
  return items.filter((item) => {
    const text = normalizeText([item.title, item.description, item.reason || "", ...(item.tags || [])].join(" "));
    if (memory.includes("sem álcool") && containsKeyword(text, BAR_KEYWORDS)) return false;
    if (memory.includes("lugar coberto") && item.indoor_outdoor === "outdoor") return false;
    if (memory.includes("evitar curso") && containsKeyword(text, NEGATIVE_KEYWORDS)) return false;
    if (memory.includes("perto de vocês") && item.distance_label === "vale a travessia") return false;
    if (memory.includes("foco em jantar") && item.domain !== "dining_out") return false;
    return true;
  });
}

function buildConciergeOption(item: Recommendation, memory: string[], context: ExperienceContext): ConciergeOption {
  const steps = [
    `Comecem por ${item.title} em ${item.neighborhood || item.location || item.city}.`,
    item.url ? "Abram a fonte oficial e confirmem horário ou disponibilidade." : "Abram a rota e validem o deslocamento antes de sair.",
    "Se fizer sentido, salvem agora para o roteiro da noite não se perder."
  ];

  return {
    title: item.title,
    summary: `${item.location || item.neighborhood || item.city} • ${item.distance_label || "boa logística"} • ${item.category}`,
    why_it_fits: item.couple_fit_reason || "Combina com o estilo do casal para hoje.",
    constraints_applied: memory.filter(Boolean),
    weather_note: item.weather_fit || context.weather_note,
    steps,
    recommendation_ids: [item.id]
  };
}

export function buildConciergeResponse(args: {
  message: string;
  recommendations: Recommendation[];
  context: ExperienceContext;
  couple?: CoupleSnapshot | null;
  memory?: string[];
  apiSuggestions?: Array<{ title?: string; reason?: string }>;
}): ConciergeResponse {
  const snapshot = getCoupleSnapshot(args.couple);
  const derivedMemory = extractMemory(args.message, args.memory || []);
  if (!snapshot.members.some((member) => member.drinks_alcohol)) derivedMemory.push("sem álcool");
  if (snapshot.profile?.couple_profile_json?.lifestyle?.avoid_crowded_places) derivedMemory.push("sem lotação");
  derivedMemory.push("evitar curso");

  const memory = Array.from(new Set(derivedMemory)).slice(0, 6);
  const curated = applyMemory(curateRecommendations(args.recommendations, { context: args.context, couple: snapshot }), memory);
  const top = curated.slice(0, 3);

  const options = top.length
    ? top.map((item) => buildConciergeOption(item, memory, args.context))
    : (args.apiSuggestions || []).slice(0, 3).map((item) => ({
        title: item.title || "Sugestão do concierge",
        summary: "Plano leve para hoje em São Paulo",
        why_it_fits: item.reason || "Mantém a noite simples, gostosa e alinhada ao momento do casal.",
        constraints_applied: memory,
        weather_note: args.context.weather_note,
        steps: ["Revisem o plano", "Abram o lugar no mapa", "Salvem se fizer sentido"],
        recommendation_ids: []
      }));

  const intro = args.context.isRainy
    ? "Eu puxaria algo coberto, íntimo e muito alinhado ao repertório do casal."
    : "Eu puxaria algo leve, pessoal e com lugares que já têm mais chance real de agradar vocês dois.";

  return { intro, memory, options };
}

function pickFirst(items: Recommendation[], matchers: string[], fallback: Recommendation[]) {
  const found = items.find((item) => containsKeyword(normalizeText([item.title, item.description, ...(item.tags || [])].join(" ")), matchers));
  return found || fallback[0] || null;
}

export function buildDateNightPlan(args: { recommendations: Recommendation[]; context: ExperienceContext; couple?: CoupleSnapshot | null }): DateNightPlan | null {
  const snapshot = getCoupleSnapshot(args.couple);
  const curated = curateRecommendations(args.recommendations, { context: args.context, couple: snapshot });
  if (curated.length < 2) return null;
  const warmup = pickFirst(curated, ["cafe", "café", "livraria", "bookstore"], curated);
  const culture = pickFirst(curated, ["museum", "museu", "ims", "masp", "cinema", "exposição", "theatro", "planetario"], curated.slice(1));
  const dinner = pickFirst(curated, ["restaurant", "jantar", "massa", "trattoria", "dessert", "libertango", "issho"], curated.slice(2));
  if (!warmup || !culture || !dinner) return null;

  return {
    activity_1: {
      title: warmup?.title || "Café gostoso em lugar calmo",
      type: "warmup",
      reason: warmup?.couple_fit_reason || "Começa a noite sem pressa e ajuda a entrar no ritmo do encontro.",
      recommendation_id: warmup?.id || null
    },
    activity_2: {
      title: culture?.title || "Programa cultural leve",
      type: "culture",
      reason: culture?.couple_fit_reason || "Traz assunto e repertório sem pesar a programação.",
      recommendation_id: culture?.id || null
    },
    activity_3: {
      title: dinner?.title || "Jantar confortável e sem excesso de logística",
      type: "dining",
      reason: dinner?.couple_fit_reason || "Fecha a noite em clima de conversa boa, sem depender de bebida.",
      recommendation_id: dinner?.id || null
    },
    reasoning: "Roteiro montado a partir das sugestões com melhor aderência real ao perfil do casal, priorizando favoritos, wishlist cultural e conforto logístico.",
    weather_note: args.context.weather_note,
    couple_note: "Mantive o plano sem foco em bares, sem cara de curso e puxando lugares mais conectados ao histórico de vocês.",
    source_recommendation_ids: [warmup?.id, culture?.id, dinner?.id].filter(Boolean) as string[],
    planning_notes: [
      `Base de saída: ${snapshot.neighborhood || snapshot.city}`,
      snapshot.avoid_going_out_when_rain ? "Se o tempo fechar, prefira os trechos cobertos." : "Vocês podem aceitar um pouco mais de improviso com o clima.",
      "Se uma etapa encaixar muito bem, vale estender e cortar a próxima sem culpa."
    ]
  };
}






