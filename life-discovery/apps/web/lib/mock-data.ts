import rawEvents from "../public/real-events.json";
import { DateNightPlan, Recommendation } from "./types";

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
  if (haystack.includes("restaurant") || haystack.includes("jantar") || haystack.includes("food")) return "dining_out";
  return "events_exhibitions";
}

export const mockRecommendations: Recommendation[] = (rawEvents as RawEvent[]).map((item, index) => ({
  ...item,
  id: String(item.id || `mock-${index}`),
  title: repairText(item.title) || "Experiência em destaque",
  description: repairText(item.description) || "Sugestão curada para vocês explorarem juntos.",
  location: repairText(item.location) || "São Paulo",
  city: repairText(item.city) || "São Paulo",
  source: repairText(item.source) || "curadoria local",
  domain: item.domain || inferDomain(item),
  tags: (item.tags || []).map((tag) => repairText(tag)).filter(Boolean)
}));

export const fallbackDateNightPlan: DateNightPlan = {
  activity_1: {
    title: "Passeio leve pela Paulista com café especial",
    type: "warmup",
    reason: "Começa a noite sem pressa e ajuda o casal a entrar no clima de conexão."
  },
  activity_2: {
    title: "Exposição ou mostra intimista no MASP",
    type: "culture",
    reason: "Mistura repertório cultural com conversa boa, sem exigir uma programação pesada."
  },
  activity_3: {
    title: "Jantar romântico em ambiente silencioso",
    type: "dining",
    reason: "Fecha a noite com conforto, troca genuína e espaço para lembrar o melhor do dia."
  },
  reasoning:
    "Plano pensado para um casal que quer variedade, clima acolhedor e um roteiro fácil de executar em São Paulo."
};

export function fallbackConciergeSuggestions(message: string) {
  const lowered = message.toLowerCase();

  if (lowered.includes("chuva")) {
    return [
      { title: "Museu com café", reason: "Mantém a experiência protegida da chuva e ainda rende conversa." },
      { title: "Sessão de cinema + sobremesa", reason: "É simples de executar e funciona bem em noite mais fria." }
    ];
  }

  if (lowered.includes("barato") || lowered.includes("econom")) {
    return [
      { title: "Piquenique urbano + livraria", reason: "Baixo custo e bom equilíbrio entre passeio e intimidade." },
      { title: "Mostra cultural gratuita", reason: "Entrega repertório sem pressionar o orçamento." }
    ];
  }

  return [
    { title: "Exposição + jantar leve", reason: "Combina descoberta com tempo de qualidade a dois." },
    { title: "Café especial + caminhada em bairro charmoso", reason: "Ótimo para uma noite espontânea e tranquila." },
    { title: "Cinema alternativo + taça de vinho", reason: "Funciona bem para casais que curtem clima mais intimista." }
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
