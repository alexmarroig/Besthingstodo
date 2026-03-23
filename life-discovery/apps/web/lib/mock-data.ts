import rawEvents from "../public/real-events.json";
import { CoupleSnapshot, DateNightPlan, Recommendation } from "./types";

type RawEvent = Omit<Recommendation, "domain"> & {
  domain?: Recommendation["domain"];
};

function repairText(value?: string | null) {
  if (!value) return "";

  return value
    .replace(/Ã¡/g, "á")
    .replace(/Ã¢/g, "â")
    .replace(/Ã£/g, "ã")
    .replace(/Ã§/g, "ç")
    .replace(/Ã©/g, "é")
    .replace(/Ãª/g, "ê")
    .replace(/Ã­/g, "í")
    .replace(/Ã³/g, "ó")
    .replace(/Ã´/g, "ô")
    .replace(/Ãµ/g, "õ")
    .replace(/Ãº/g, "ú")
    .replace(/Ã /g, "à")
    .replace(/â€”/g, "—")
    .replace(/â€¢/g, "•")
    .replace(/â€™/g, "'")
    .replace(/Â/g, "");
}

function inferDomain(item: RawEvent): Recommendation["domain"] {
  const haystack = [item.category, item.title, item.description, ...(item.tags || [])].join(" ").toLowerCase();
  if (haystack.includes("delivery")) return "delivery";
  if (haystack.includes("movie") || haystack.includes("cinema") || haystack.includes("series")) return "movies_series";
  if (haystack.includes("restaurant") || haystack.includes("jantar") || haystack.includes("food") || haystack.includes("café") || haystack.includes("cafe")) return "dining_out";
  return "events_exhibitions";
}

const editorialSeeds: Recommendation[] = [
  {
    id: "editorial-ims-paulista",
    title: "IMS Paulista + café sem pressa",
    description: "Fim de tarde com repertório visual, café gostoso e espaço para conversar sem correria.",
    category: "cultural",
    domain: "events_exhibitions",
    city: "São Paulo",
    location: "Avenida Paulista",
    neighborhood: "Paulista",
    distance_label: "bate-volta bom",
    indoor_outdoor: "indoor",
    weather_fit: "Ótimo para hoje porque funciona bem mesmo se o clima estiver indeciso.",
    couple_fit_reason: "Entrega repertório cultural com ritmo calmo e conversa fácil, bem na linha de vocês.",
    image_fallback_key: "museum",
    quality_score: 96,
    price: 0,
    tags: ["museu", "café", "intimista", "paulista"],
    source: "curadoria local",
    url: null
  },
  {
    id: "editorial-japan-house",
    title: "Japan House + jantar leve na Paulista",
    description: "Boa opção para uma noite com design, exposição e fechamento confortável sem exagero de logística.",
    category: "cultural",
    domain: "events_exhibitions",
    city: "São Paulo",
    location: "Avenida Paulista",
    neighborhood: "Paulista",
    distance_label: "bate-volta bom",
    indoor_outdoor: "indoor",
    weather_fit: "Segura bem uma noite chuvosa sem tirar o charme da saída.",
    couple_fit_reason: "Mistura descoberta cultural e rota simples, sem depender de bar ou lugar lotado.",
    image_fallback_key: "museum",
    quality_score: 94,
    price: 0,
    tags: ["design", "exposição", "jantar", "indoor"],
    source: "curadoria local",
    url: null
  },
  {
    id: "editorial-livraria-travessa",
    title: "Livraria da Travessa em Pinheiros no finzinho do dia",
    description: "Programa pequeno, acolhedor e muito alinhado com uma noite gostosa sem obrigação de render demais.",
    category: "bookstore",
    domain: "events_exhibitions",
    city: "São Paulo",
    location: "Pinheiros",
    neighborhood: "Pinheiros",
    distance_label: "bate-volta bom",
    indoor_outdoor: "indoor",
    weather_fit: "Funciona ótimo quando a ideia é ficar em ambiente gostoso e protegido.",
    couple_fit_reason: "Conversa + livros + café é quase um resumo do repertório afetivo de vocês.",
    image_fallback_key: "bookstore",
    quality_score: 98,
    price: 0,
    tags: ["livraria", "café", "pinheiros", "cozy"],
    source: "curadoria local",
    url: null
  },
  {
    id: "editorial-cinesala",
    title: "Cinema de rua no Cinesala + sobremesa depois",
    description: "Noite mais intimista, silenciosa e sem a sensação de programa genérico de shopping.",
    category: "cinema",
    domain: "movies_series",
    city: "São Paulo",
    location: "Pinheiros",
    neighborhood: "Pinheiros",
    distance_label: "bate-volta bom",
    indoor_outdoor: "indoor",
    weather_fit: "Resolve super bem quando o clima pede algo coberto e sem muito deslocamento mental.",
    couple_fit_reason: "Tem cara de date de verdade: escuro, conversa depois e nada centrado em bebida.",
    image_fallback_key: "cinema",
    quality_score: 97,
    price: 34,
    tags: ["cinema", "intimista", "sobremesa", "quiet"],
    source: "curadoria local",
    url: null
  },
  {
    id: "editorial-masp",
    title: "MASP com foco em exposição + jantar sem pressa",
    description: "Clássico que ainda funciona quando o que importa é sair do automático com um programa elegante.",
    category: "museum",
    domain: "events_exhibitions",
    city: "São Paulo",
    location: "MASP",
    neighborhood: "Paulista",
    distance_label: "bate-volta bom",
    indoor_outdoor: "indoor",
    weather_fit: "Muito sólido para noite de chuva ou tempo fechado.",
    couple_fit_reason: "Cultural, bonito e simples de justificar como encontro especial sem forçar a barra.",
    image_fallback_key: "museum",
    quality_score: 99,
    price: 0,
    tags: ["masp", "museu", "jantar", "romântico"],
    source: "curadoria local",
    url: null
  },
  {
    id: "editorial-futuro-refeitorio",
    title: "Jantar confortável em Pinheiros, sem cara de bar",
    description: "Boa pedida para comer bem, conversar e manter a noite leve sem cair na lógica de drinks.",
    category: "dining",
    domain: "dining_out",
    city: "São Paulo",
    location: "Pinheiros",
    neighborhood: "Pinheiros",
    distance_label: "bate-volta bom",
    indoor_outdoor: "indoor",
    weather_fit: "Encaixa bem mesmo quando o tempo pede refúgio e pouca fricção.",
    couple_fit_reason: "Traz o momento de jantar com conforto, sem puxar a experiência para álcool ou lotação.",
    image_fallback_key: "dining",
    quality_score: 95,
    price: 90,
    tags: ["jantar", "confortável", "quiet", "romântico"],
    source: "curadoria local",
    url: null
  },
  {
    id: "editorial-ibirapuera",
    title: "Volta curta no Ibirapuera + café para desacelerar",
    description: "Quando o tempo ajuda, é um jeito leve de sair de casa sem transformar a noite em operação.",
    category: "outdoor",
    domain: "events_exhibitions",
    city: "São Paulo",
    location: "Parque Ibirapuera",
    neighborhood: "Ibirapuera",
    distance_label: "deslocamento curto",
    indoor_outdoor: "outdoor",
    weather_fit: "Brilha mais em noite aberta e temperatura gostosa.",
    couple_fit_reason: "Traz movimento leve e conversa, sem barulho e sem excesso de estímulo.",
    image_fallback_key: "outdoor",
    quality_score: 86,
    price: 0,
    tags: ["parque", "caminhada", "café", "leve"],
    source: "curadoria local",
    url: null
  },
  {
    id: "editorial-casa-das-rosas",
    title: "Casa das Rosas + café literário",
    description: "Uma opção delicada para quando vocês querem algo cultural, baixo esforço e cheio de assunto.",
    category: "cultural",
    domain: "events_exhibitions",
    city: "São Paulo",
    location: "Paulista",
    neighborhood: "Paulista",
    distance_label: "bate-volta bom",
    indoor_outdoor: "mixed",
    weather_fit: "Funciona bem com tempo estável e ainda segura parte do roteiro coberto.",
    couple_fit_reason: "É doce sem ser clichê e conversa diretamente com o lado livro + repertório de vocês.",
    image_fallback_key: "bookstore",
    quality_score: 92,
    price: 0,
    tags: ["literatura", "café", "jardim", "calmo"],
    source: "curadoria local",
    url: null
  }
];

const premiumDiningSeeds: Recommendation[] = [
  {
    id: "premium-modern-mamma",
    title: "Modern Mamma Osteria para jantar sem pressa",
    description: "Italiano com atmosfera aconchegante e boa chance de virar uma noite realmente especial para o casal.",
    category: "restaurant",
    domain: "dining_out",
    content_tier: "signature",
    city: "São Paulo",
    location: "Jardins",
    neighborhood: "Jardins",
    distance_label: "bate-volta bom",
    indoor_outdoor: "indoor",
    weather_fit: "Ótimo para noite mais fechada ou quando vocês querem só decidir e ir.",
    couple_fit_reason: "Se Lellis já funciona para vocês, aqui entra como primo contemporâneo com a mesma lógica de massa boa + conversa longa.",
    personalization_label: "parecido com um favorito",
    related_favorite: "Lellis Trattoria",
    image_fallback_key: "dining",
    quality_score: 97,
    price: 130,
    tags: ["italiano", "date", "jardins", "aconchegante"],
    source: "guia curado do casal",
    profile_signals: ["lellis trattoria", "massa", "romantic dinner"],
    url: null
  },
  {
    id: "premium-nino-cucina",
    title: "Nino Cucina para noite italiana com clima mais atual",
    description: "Boa pedida para quando a vontade é repetir o conforto da trattoria em um lugar mais contemporâneo.",
    category: "restaurant",
    domain: "dining_out",
    content_tier: "signature",
    city: "São Paulo",
    location: "Jardins",
    neighborhood: "Jardins",
    distance_label: "bate-volta bom",
    indoor_outdoor: "indoor",
    weather_fit: "Vai bem mesmo quando o clima pede refúgio e logística simples.",
    couple_fit_reason: "Conversa com o repertório italiano do casal sem parecer repetição literal do favorito.",
    personalization_label: "curado para o perfil de vocês",
    related_favorite: "Lellis Trattoria",
    image_fallback_key: "dining",
    quality_score: 95,
    price: 135,
    tags: ["italiano", "romântico", "massa", "jantar"],
    source: "guia curado do casal",
    profile_signals: ["lellis trattoria", "italiano", "cozy"],
    url: null
  },
  {
    id: "premium-aizome",
    title: "Aizomê para japonês mais calmo e especial",
    description: "Rota boa para quando vocês querem jantar japonês com mais atmosfera de encontro do que de rotina.",
    category: "restaurant",
    domain: "dining_out",
    content_tier: "signature",
    city: "São Paulo",
    location: "Jardins",
    neighborhood: "Jardins",
    distance_label: "bate-volta bom",
    indoor_outdoor: "indoor",
    weather_fit: "Combina bem com noite coberta e sem improviso demais.",
    couple_fit_reason: "Mantém o eixo de conforto de Issho, mas sobe o nível da experiência para uma noite especial.",
    personalization_label: "parecido com um favorito",
    related_favorite: "Issho",
    image_fallback_key: "dining",
    quality_score: 96,
    price: 160,
    tags: ["japonês", "quiet", "elegante", "date"],
    source: "guia curado do casal",
    profile_signals: ["issho", "yakissoba", "japanese comfort"],
    url: null
  },
  {
    id: "premium-braz-pinheiros",
    title: "Bráz em Pinheiros para pizza sem erro",
    description: "Boa para quando a noite pede conforto, zero esforço mental e ainda assim cara de encontro.",
    category: "restaurant",
    domain: "dining_out",
    content_tier: "signature",
    city: "São Paulo",
    location: "Pinheiros",
    neighborhood: "Pinheiros",
    distance_label: "bate-volta bom",
    indoor_outdoor: "indoor",
    weather_fit: "Encaixa bem em qualquer clima e ajuda a decidir rápido.",
    couple_fit_reason: "Se Pizzaria Graminha é memória afetiva, a Bráz funciona como variação muito segura no mesmo universo.",
    personalization_label: "parecido com um favorito",
    related_favorite: "Pizzaria Graminha",
    image_fallback_key: "dining",
    quality_score: 94,
    price: 98,
    tags: ["pizza", "comfort", "casual", "date"],
    source: "guia curado do casal",
    profile_signals: ["pizzaria graminha", "pizza", "comfort food"],
    url: null
  }
];

const premiumDeliverySeeds: Recommendation[] = [
  {
    id: "premium-patties-delivery",
    title: "Patties em casa + filme de suspense",
    description: "Entrega rápida e gostosa para quando a noite pede sofá, comida confiável e zero atrito.",
    category: "delivery",
    domain: "delivery",
    content_tier: "signature",
    city: "São Paulo",
    location: "Em casa",
    neighborhood: "Campo Belo",
    distance_label: "zero deslocamento",
    indoor_outdoor: "indoor",
    weather_fit: "Perfeito para chuva, preguiça boa ou decisão em cima da hora.",
    couple_fit_reason: "Patties já aparece no repertório de vocês, então entra como solução segura para noite de filme ou série.",
    personalization_label: "favorito do casal",
    related_favorite: "Patties",
    image_fallback_key: "dining",
    quality_score: 96,
    price: 85,
    tags: ["delivery", "burger", "movie night", "comfort"],
    source: "guia curado do casal",
    profile_signals: ["patties", "delivery", "comfort"],
    url: null
  },
  {
    id: "premium-zdeli-delivery",
    title: "Z-Deli em casa para noite de série sem fricção",
    description: "Boa pedida para quando vocês querem algo gostoso e previsível, sem transformar a noite em decisão cansativa.",
    category: "delivery",
    domain: "delivery",
    content_tier: "curated",
    city: "São Paulo",
    location: "Em casa",
    neighborhood: "Campo Belo",
    distance_label: "zero deslocamento",
    indoor_outdoor: "indoor",
    weather_fit: "Segura muito bem um dia mais corrido ou clima fechado.",
    couple_fit_reason: "Conversa com o repertório real de delivery do casal e combina com o estilo de noite mais acolhida.",
    personalization_label: "favorito do casal",
    related_favorite: "Z-Deli",
    image_fallback_key: "dining",
    quality_score: 92,
    price: 95,
    tags: ["delivery", "sanduíche", "series", "aconchegante"],
    source: "guia curado do casal",
    profile_signals: ["z-deli", "delivery", "this is us"],
    url: null
  },
  {
    id: "premium-issho-delivery",
    title: "Issho em casa para jantar japonês e sessão dupla",
    description: "Entrega boa para transformar a noite em algo mais gostoso sem precisar sair.",
    category: "delivery",
    domain: "delivery",
    content_tier: "curated",
    city: "São Paulo",
    location: "Em casa",
    neighborhood: "Campo Belo",
    distance_label: "zero deslocamento",
    indoor_outdoor: "indoor",
    weather_fit: "Excelente quando a ideia é proteger a noite do clima e manter o conforto.",
    couple_fit_reason: "Leva um favorito do casal para o contexto de sofá, filme e conversa longa.",
    personalization_label: "favorito do casal",
    related_favorite: "Issho",
    image_fallback_key: "dining",
    quality_score: 93,
    price: 110,
    tags: ["delivery", "japonês", "movie night", "quiet"],
    source: "guia curado do casal",
    profile_signals: ["issho", "delivery", "japanese comfort"],
    url: null
  }
];

const premiumCultureSeeds: Recommendation[] = [
  {
    id: "premium-pinacoteca",
    title: "Pinacoteca + café no centro com tempo para conversar",
    description: "Programa forte de repertório visual para quando vocês querem sair do automático sem cara de tarefa.",
    category: "museum",
    domain: "events_exhibitions",
    content_tier: "signature",
    city: "São Paulo",
    location: "Luz",
    neighborhood: "Centro",
    distance_label: "vale a travessia",
    indoor_outdoor: "indoor",
    weather_fit: "Muito boa opção para dia fechado ou quando vocês querem programa sólido e protegido.",
    couple_fit_reason: "Se MASP, IMS e exposições com mais leitura entram bem, a Pinacoteca amplia esse repertório com bastante chance de agradar vocês dois.",
    personalization_label: "curado para o perfil de vocês",
    related_favorite: "MASP",
    image_fallback_key: "museum",
    quality_score: 96,
    price: 30,
    tags: ["museu", "exposição", "centro", "café"],
    source: "guia curado do casal",
    profile_signals: ["masp", "ims paulista", "jung", "nise da silveira"],
    url: null
  },
  {
    id: "premium-tomie-ohtake",
    title: "Instituto Tomie Ohtake + café em Pinheiros",
    description: "Boa descoberta cultural para noites em que a prioridade é repertório + logística simples.",
    category: "museum",
    domain: "events_exhibitions",
    content_tier: "signature",
    city: "São Paulo",
    location: "Pinheiros",
    neighborhood: "Pinheiros",
    distance_label: "bate-volta bom",
    indoor_outdoor: "indoor",
    weather_fit: "Funciona muito bem em dia de chuva ou quando vocês querem algo sem atrito.",
    couple_fit_reason: "Combina com a curiosidade cultural do casal e fica perto do eixo livraria + café que já aparece forte no perfil.",
    personalization_label: "curado para o perfil de vocês",
    related_favorite: "Livraria da Travessa",
    image_fallback_key: "museum",
    quality_score: 94,
    price: 20,
    tags: ["arte", "pinheiros", "exposição", "calmo"],
    source: "guia curado do casal",
    profile_signals: ["livraria da travessa", "ims paulista", "dopamine land"],
    url: null
  },
  {
    id: "premium-theatro-municipal",
    title: "Theatro Municipal para tirar a wishlist do papel",
    description: "Programa com peso cultural e bastante cara de ocasião especial, sem ser engessado.",
    category: "cultural",
    domain: "events_exhibitions",
    content_tier: "signature",
    city: "São Paulo",
    location: "Centro",
    neighborhood: "Centro",
    distance_label: "vale a travessia",
    indoor_outdoor: "indoor",
    weather_fit: "Segue funcionando muito bem mesmo se o tempo virar.",
    couple_fit_reason: "Já aparece na wishlist de vocês, então não é descoberta solta: é uma pendência boa para virar noite memorável.",
    personalization_label: "wishlist do casal",
    related_favorite: "Theatro Municipal",
    image_fallback_key: "museum",
    quality_score: 97,
    price: 0,
    tags: ["wishlist", "teatro", "clássico", "especial"],
    source: "guia curado do casal",
    profile_signals: ["theatro municipal", "classic culture"],
    url: null
  },
  {
    id: "premium-planetario",
    title: "Planetário para noite curiosa e diferente",
    description: "Boa escolha para quando vocês querem um programa um pouco fora do óbvio, mas ainda muito dateável.",
    category: "cultural",
    domain: "events_exhibitions",
    content_tier: "curated",
    city: "São Paulo",
    location: "Ibirapuera",
    neighborhood: "Ibirapuera",
    distance_label: "deslocamento curto",
    indoor_outdoor: "indoor",
    weather_fit: "Ajuda bastante quando o clima está indeciso e vocês querem algo protegido.",
    couple_fit_reason: "Conecta com ciência, curiosidade e com a wishlist que já aparece no perfil do casal.",
    personalization_label: "wishlist do casal",
    related_favorite: "Planetario",
    image_fallback_key: "museum",
    quality_score: 93,
    price: 0,
    tags: ["planetário", "ciência", "date", "wishlist"],
    source: "guia curado do casal",
    profile_signals: ["planetario", "science", "interstellar"],
    url: null
  }
];

const premiumCinemaAndWatchSeeds: Recommendation[] = [
  {
    id: "premium-belas-artes",
    title: "Petra Belas Artes + café depois da sessão",
    description: "Cinema com mais cara de ritual do que shopping, ótimo para render assunto e clima de encontro.",
    category: "cinema",
    domain: "movies_series",
    content_tier: "signature",
    city: "São Paulo",
    location: "Consolação",
    neighborhood: "Consolação",
    distance_label: "bate-volta bom",
    indoor_outdoor: "indoor",
    weather_fit: "Excelente em noite chuvosa ou quando vocês querem algo coberto e especial.",
    couple_fit_reason: "Conversa com o gosto de vocês por filmes com tensão, repertório e pós-filme que rende conversa.",
    personalization_label: "cinema com a energia de vocês",
    related_favorite: "Parasite",
    image_fallback_key: "cinema",
    quality_score: 97,
    price: 38,
    tags: ["cinema", "date", "debate", "intimista"],
    source: "guia curado do casal",
    profile_signals: ["parasite", "the others", "plot twist", "suspense"],
    url: null
  },
  {
    id: "premium-cinesesc",
    title: "CineSesc para sessão com mais repertório",
    description: "Boa rota para ver algo menos óbvio sem perder a leveza de uma noite boa a dois.",
    category: "cinema",
    domain: "movies_series",
    content_tier: "signature",
    city: "São Paulo",
    location: "Pinheiros",
    neighborhood: "Pinheiros",
    distance_label: "bate-volta bom",
    indoor_outdoor: "indoor",
    weather_fit: "Vai super bem quando a ideia é programa coberto com pouca fricção.",
    couple_fit_reason: "Se Interstellar e filmes com mais ambição visual entram bem, esse tipo de sala combina muito mais com vocês do que circuito genérico.",
    personalization_label: "cinema com a energia de vocês",
    related_favorite: "Interstellar",
    image_fallback_key: "cinema",
    quality_score: 95,
    price: 32,
    tags: ["cinema", "autor", "pinheiros", "quiet"],
    source: "guia curado do casal",
    profile_signals: ["interstellar", "elevated sci-fi", "cinema"],
    url: null
  },
  {
    id: "premium-past-lives",
    title: "Past Lives em casa + jantar pedido de um favorito",
    description: "Noite de sofá com peso romântico e conversa, sem cair na sensação de escolha aleatória.",
    category: "streaming",
    domain: "movies_series",
    content_tier: "signature",
    city: "São Paulo",
    location: "Em casa",
    neighborhood: "Campo Belo",
    distance_label: "zero deslocamento",
    indoor_outdoor: "indoor",
    weather_fit: "Perfeito para clima fechado, cansaço ou vontade de ficar mais recolhidos.",
    couple_fit_reason: "Se Titanic fica no repertório afetivo, aqui entra um romance mais maduro e íntimo com grande chance de tocar vocês.",
    personalization_label: "parecido com o que vocês assistem",
    related_favorite: "Titanic",
    image_fallback_key: "cinema",
    quality_score: 96,
    price: 0,
    tags: ["filme", "romântico", "em casa", "sofá"],
    source: "guia curado do casal",
    profile_signals: ["titanic", "big romance", "this is us"],
    url: null
  },
  {
    id: "premium-anatomy-fall",
    title: "Anatomy of a Fall em casa + conversa longa depois",
    description: "Escolha boa para quando o programa ideal é assistir algo inteligente e depois ficar debatendo tudo.",
    category: "streaming",
    domain: "movies_series",
    content_tier: "signature",
    city: "São Paulo",
    location: "Em casa",
    neighborhood: "Campo Belo",
    distance_label: "zero deslocamento",
    indoor_outdoor: "indoor",
    weather_fit: "Muito boa para noite silenciosa, coberta e sem energia social.",
    couple_fit_reason: "Segue o trilho de Parasite e The Others: suspense, leitura fina e bastante assunto no pós.",
    personalization_label: "parecido com o que vocês assistem",
    related_favorite: "Parasite",
    image_fallback_key: "cinema",
    quality_score: 95,
    price: 0,
    tags: ["filme", "plot twist", "debate", "em casa"],
    source: "guia curado do casal",
    profile_signals: ["parasite", "the others", "plot twist"],
    url: null
  }
];

export const editorialCatalog: Recommendation[] = [
  ...editorialSeeds,
  ...premiumDiningSeeds,
  ...premiumDeliverySeeds,
  ...premiumCultureSeeds,
  ...premiumCinemaAndWatchSeeds
];

function keepRawEvent(item: RawEvent) {
  const haystack = repairText([item.category, item.title, item.description, ...(item.tags || [])].join(" ")).toLowerCase();
  const positiveSignals = ["cinema", "exposição", "museu", "museum", "livraria", "café", "cafe", "festival", "show", "concerto", "parque", "feira gastronômica", "gastronomic"];
  const negativeSignals = ["conference", "conferência", "summit", "curso", "workshop", "imersão", "cadaver", "bootcamp", "certification", "training"];

  if (negativeSignals.some((signal) => haystack.includes(signal))) return false;
  return positiveSignals.some((signal) => haystack.includes(signal));
}

const repairedRawEvents: Recommendation[] = (rawEvents as RawEvent[])
  .filter((item) => keepRawEvent(item))
  .map((item, index) => ({
  ...item,
  id: String(item.id || `mock-${index}`),
  title: repairText(item.title) || "Experiência em destaque",
  description: repairText(item.description) || "Sugestão curada para vocês explorarem juntos.",
  location: repairText(item.location) || "São Paulo",
  city: repairText(item.city) || "São Paulo",
  source: repairText(item.source) || "curadoria local",
  domain: item.domain || inferDomain(item),
  content_tier: "discovery" as const,
  image_fallback_key: "editorial",
  tags: (item.tags || []).map((tag) => repairText(tag)).filter(Boolean)
}))
  .slice(0, 32);

export const mockRecommendations: Recommendation[] = [...editorialCatalog, ...repairedRawEvents];

export const fallbackDateNightPlan: DateNightPlan = {
  activity_1: {
    title: "Livraria da Travessa em Pinheiros no finzinho do dia",
    type: "warmup",
    reason: "Começa a noite com clima acolhedor e assunto fácil, sem exigir energia demais.",
    recommendation_id: "editorial-livraria-travessa"
  },
  activity_2: {
    title: "IMS Paulista + café sem pressa",
    type: "culture",
    reason: "Coloca repertório cultural no meio do encontro sem transformar tudo em programação pesada.",
    recommendation_id: "editorial-ims-paulista"
  },
  activity_3: {
    title: "Jantar confortável em Pinheiros, sem cara de bar",
    type: "dining",
    reason: "Fecha a noite com conforto, conversa boa e sem depender de bebida para funcionar.",
    recommendation_id: "editorial-futuro-refeitorio"
  },
  reasoning: "Plano pensado para um casal que prefere programas culturais, acolhedores e com logística simples em São Paulo.",
  weather_note: "Se o tempo fechar, as três etapas continuam funcionando bem com pouca fricção.",
  couple_note: "O roteiro evita clima de bar, excesso de lotação e sugestões com cara de curso.",
  source_recommendation_ids: ["editorial-livraria-travessa", "editorial-ims-paulista", "editorial-futuro-refeitorio"],
  planning_notes: ["Comecem sem pressa.", "Se o jantar encaixar muito bem, vocês podem pular a etapa cultural sem perder a noite."]
};

export function fallbackConciergeSuggestions(message: string) {
  const lowered = message.toLowerCase();

  if (lowered.includes("chuva")) {
    return [
      { title: "MASP com foco em exposição + jantar sem pressa", reason: "Mantém o programa inteiro coberto e ainda rende sensação de encontro especial." },
      { title: "Cinema de rua no Cinesala + sobremesa depois", reason: "É íntimo, simples de executar e não depende de tempo aberto." }
    ];
  }

  if (lowered.includes("barato") || lowered.includes("econom")) {
    return [
      { title: "Casa das Rosas + café literário", reason: "Entrega repertório e clima gostoso com custo muito controlado." },
      { title: "IMS Paulista + café sem pressa", reason: "Dá um encontro com assunto e pouca pressão no orçamento." }
    ];
  }

  return [
    { title: "Livraria da Travessa em Pinheiros no finzinho do dia", reason: "Tem cara de programa muito de vocês: conversa, café e pouca fricção." },
    { title: "Japan House + jantar leve na Paulista", reason: "Equilibra descoberta cultural e um fechamento confortável para a noite." },
    { title: "Cinema de rua no Cinesala + sobremesa depois", reason: "Funciona super bem quando a ideia é algo íntimo e sem lugar lotado." }
  ];
}

export const fallbackCulturalDNA = {
  cultural_dna: {
    energia_social: "média",
    curiosidade_cultural: "alta",
    abertura_a_novidades: "alta",
    conforto_logistico: "média",
    ritmo_preferido: "calmo"
  }
};

export const fallbackCoupleSnapshot: CoupleSnapshot = {
  account_name: "Alex & Camila",
  city: "São Paulo",
  neighborhood: "Campo Belo",
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
  profile: {
    schema_version: "v1",
    couple_profile_json: {
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
        preferences: ["romantic", "cozy", "cultural", "small", "fun"]
      },
      interests: {
        topics: ["technology", "science", "psychology", "astrology"],
        cinema: {
          favorite_style: ["suspense", "plot twist", "without nudity", "not horror"],
          favorite_titles: ["Interstellar", "Titanic", "Parasite", "The Others"]
        },
        series: ["This Is Us", "The Bear"]
      },
      dining: {
        dining_out: [
          { name: "Lellis Trattoria" },
          { name: "Libertango" },
          { name: "Pizzaria Graminha" },
          { name: "Issho" }
        ],
        delivery: ["Patties", "Z-Deli", "Issho"],
        likes: ["cafes", "bookstores"],
        favorite_bookstore: "Livraria da Travessa"
      },
      culture: {
        liked_exhibitions: ["Jung", "Nise da Silveira", "Dopamine Land"],
        wishlist: ["Theatro Municipal", "Planetario"]
      }
    }
  }
};

