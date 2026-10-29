/**
 * Fotos locais e curadas em /images/venues/ — servidas diretamente pelo app/CDN
 * com latência zero, sem rate-limit externo (429) e sem links quebrados (404).
 */
export const KNOWN_VENUE_IMAGES: Record<string, string> = {
  // Restaurantes SP (sp-restaurants.json)
  "sp-casa-porco": "/images/venues/sp-casa-porco.jpg",
  "sp-lellis": "/images/venues/sp-lellis.jpg",
  "sp-libertango": "/images/venues/sp-libertango.jpg",
  "sp-issho": "/images/venues/sp-issho.jpg",
  "sp-pizza-mooca": "/images/venues/sp-pizza-mooca.jpg",
  "sp-mani": "/images/venues/sp-mani.jpg",
  "sp-evvai": "/images/venues/sp-evvai.jpg",
  "sp-braz": "/images/venues/sp-braz.jpg",
  "sp-zdeli": "/images/venues/sp-zdeli.jpg",
  "sp-octavio": "/images/venues/sp-octavio.jpg",
  "sp-travessa": "/images/venues/sp-travessa.jpg",
  "sp-patties": "/images/venues/sp-patties.jpg",

  // Âncoras do perfil do casal
  "profile-anchor-lellis-trattoria": "/images/venues/sp-lellis.jpg",
  "profile-anchor-libertango": "/images/venues/sp-libertango.jpg",
  "profile-anchor-pizzaria-graminha": "/images/venues/pizzaria-graminha.jpg",
  "profile-anchor-issho": "/images/venues/sp-issho.jpg",
  "profile-anchor-livraria-da-travessa": "/images/venues/livraria-travessa.jpg",
  "profile-anchor-livraria-da-travessa-(pinheiros)": "/images/venues/livraria-travessa.jpg",
  "profile-anchor-theatro-municipal": "/images/venues/theatro-municipal.jpg",
  "profile-anchor-planetario": "/images/venues/planetario.jpg",
  "profile-anchor-masp": "/images/venues/masp.jpg",
  "profile-anchor-ims-paulista": "/images/venues/ims-paulista.jpg",

  // Similares curados (core.ts)
  "similar-modern-mamma": "/images/venues/similar-modern-mamma.jpg",
  "similar-nino-cucina": "/images/venues/similar-nino-cucina.jpg",
  "similar-chimi": "/images/venues/similar-chimi.jpg",
  "similar-pobre-juan": "/images/venues/similar-pobre-juan.jpg",
  "similar-braz": "/images/venues/similar-braz.jpg",
  "similar-pizza-da-mooca": "/images/venues/sp-pizza-mooca.jpg",
  "similar-kinoshita": "/images/venues/similar-kinoshita.jpg",
  "similar-aizome": "/images/venues/similar-aizome.jpg",
  "similar-megafauna": "/images/venues/similar-megafauna.jpg",
  "similar-biblioteca-mario": "/images/venues/biblioteca-mario.jpg",
  "similar-sala-sao-paulo": "/images/venues/sala-sao-paulo.jpg",
  "similar-mis": "/images/venues/mis.jpg",
  "similar-catavento": "/images/venues/catavento.jpg",

  // Cinema & Streaming (watch anchors + TMDB fallbacks)
  "watch-belas-artes": "/images/venues/watch-belas-artes.jpg",
  "watch-cinesesc": "/images/venues/watch-cinesesc.jpg",
  "watch-reserva-cultural": "/images/venues/watch-reserva-cultural.jpg",
  "watch-perfect-days": "/images/venues/watch-perfect-days.svg",
  "watch-past-lives": "/images/venues/watch-past-lives.svg",
  "watch-anatomy-of-a-fall": "/images/venues/watch-anatomy-of-a-fall.svg",
  "watch-julie-julia": "/images/venues/watch-julie-julia.svg",
  "tmdb-550": "/images/venues/movie-interstellar.svg",
  "tmdb-551": "/images/venues/movie-parasite.svg",
  "tmdb-552": "/images/venues/series-the-bear.svg",
  "tmdb-553": "/images/venues/movie-oppenheimer.svg",
  "tmdb-554": "/images/venues/series-succession.svg",
  "tmdb-555": "/images/venues/movie-dune-2.svg",
  "tmdb-556": "/images/venues/series-shogun.svg",
  "tmdb-557": "/images/venues/movie-poor-things.svg",

  // Eventos gastronômicos e culturais (gastro-events.json, sympla-events.json, events fallback)
  "gastro-event-taste-sp": "/images/venues/taste-sp.jpg",
  "gastro-event-restaurant-week": "/images/venues/restaurant-week.jpg",
  "gastro-event-ceagesp": "/images/venues/ceagesp.jpg",
  "sympla-snapshot-1": "/images/venues/wine.jpg",
  "sympla-snapshot-2": "/images/venues/workshop-massas.jpg",
  "sympla-snapshot-3": "/images/venues/jazz.svg",
  "sympla-snapshot-4": "/images/venues/standup.jpg",
  "evt-1": "/images/venues/ibirapuera.jpg",
  "evt-2": "/images/venues/vangogh.jpg",
  "evt-3": "/images/venues/standup.jpg",
  "evt-4": "/images/venues/ccsp.jpg",
  "evt-5": "/images/venues/largo-da-batata.jpg",
  "evt-6": "/images/venues/sala-sao-paulo.jpg",
  "fallback-local-event-1": "/images/venues/largo-da-batata.jpg",

  // Editorial e Radar SP (gastro-editorial.json)
  "snapshot-taste-fly-1": "/images/venues/editorial-omakase.jpg",
  "snapshot-sp-secreto-1": "/images/venues/rooftop-sp.jpg",
  "snapshot-farofa-1": "/images/venues/editorial-chefs.jpg",
  "snapshot-cumbuca-1": "/images/venues/wine.jpg",
  "fallback-gastro-1": "/images/venues/sp-evvai.jpg",
  "cinema-news-fallback-1": "/images/venues/watch-belas-artes.jpg",
};

const KNOWN_VENUE_IMAGES_BY_TITLE: Record<string, string> = {
  "lellis trattoria": "/images/venues/sp-lellis.jpg",
  libertango: "/images/venues/sp-libertango.jpg",
  "libertango parrilla": "/images/venues/sp-libertango.jpg",
  "pizzaria graminha": "/images/venues/pizzaria-graminha.jpg",
  issho: "/images/venues/sp-issho.jpg",
  "livraria da travessa": "/images/venues/livraria-travessa.jpg",
  "livraria da travessa (pinheiros)": "/images/venues/livraria-travessa.jpg",
  "livraria da travessa — cafe": "/images/venues/sp-travessa.jpg",
  "livraria da travessa cafe": "/images/venues/sp-travessa.jpg",
  "theatro municipal": "/images/venues/theatro-municipal.jpg",
  "theatro municipal de sao paulo": "/images/venues/theatro-municipal.jpg",
  planetario: "/images/venues/planetario.jpg",
  "planetario ibirapuera": "/images/venues/planetario.jpg",
  "planetario do ibirapuera": "/images/venues/planetario.jpg",
  masp: "/images/venues/masp.jpg",
  "museu de arte de sao paulo": "/images/venues/masp.jpg",
  "ims paulista": "/images/venues/ims-paulista.jpg",
  "instituto moreira salles": "/images/venues/ims-paulista.jpg",
  "pinacoteca": "/images/venues/pinacoteca.jpg",
  "pinacoteca de sao paulo": "/images/venues/pinacoteca.jpg",
  "pinacoteca do estado": "/images/venues/pinacoteca.jpg",
  "ccbb": "/images/venues/ccbb.jpg",
  "ccbb sp": "/images/venues/ccbb.jpg",
  "ccbb sao paulo": "/images/venues/ccbb.jpg",
  "itau cultural": "/images/venues/itau-cultural.jpg",
  "parque ibirapuera": "/images/venues/ibirapuera.jpg",
  "cinemateca": "/images/venues/cinemateca.jpg",
  "cinemateca brasileira": "/images/venues/cinemateca.jpg",
  "centro cultural sao paulo": "/images/venues/ccsp.jpg",
  ccsp: "/images/venues/ccsp.jpg",
  "modern mamma osteria": "/images/venues/similar-modern-mamma.jpg",
  "nino cucina": "/images/venues/similar-nino-cucina.jpg",
  "chimi parrilla": "/images/venues/similar-chimi.jpg",
  "pobre juan": "/images/venues/similar-pobre-juan.jpg",
  "braz pizzaria": "/images/venues/similar-braz.jpg",
  "braz elettrica": "/images/venues/sp-braz.jpg",
  "braz elettrica em casa": "/images/venues/sp-braz.jpg",
  "a pizza da mooca": "/images/venues/sp-pizza-mooca.jpg",
  "a pizza da mooca em casa": "/images/venues/sp-pizza-mooca.jpg",
  kinoshita: "/images/venues/similar-kinoshita.jpg",
  aizome: "/images/venues/similar-aizome.jpg",
  "megafauna + cafe no copan": "/images/venues/similar-megafauna.jpg",
  megafauna: "/images/venues/similar-megafauna.jpg",
  "biblioteca mario de andrade + cafe no centro": "/images/venues/biblioteca-mario.jpg",
  "biblioteca mario de andrade": "/images/venues/biblioteca-mario.jpg",
  "sala sao paulo": "/images/venues/sala-sao-paulo.jpg",
  "orquestra sinfonica na sala sao paulo": "/images/venues/sala-sao-paulo.jpg",
  "mis + roteiro visual em pinheiros": "/images/venues/mis.jpg",
  "mis sp": "/images/venues/mis.jpg",
  "mis experience": "/images/venues/vangogh.jpg",
  "museu catavento": "/images/venues/catavento.jpg",
  mani: "/images/venues/sp-mani.jpg",
  evvai: "/images/venues/sp-evvai.jpg",
  "trattorita evvai": "/images/venues/sp-evvai.jpg",
  nelita: "/images/venues/similar-nino-cucina.jpg",
  "a casa do porco": "/images/venues/sp-casa-porco.jpg",
  "z deli sanduiches": "/images/venues/sp-zdeli.jpg",
  "z deli delivery": "/images/venues/sp-zdeli.jpg",
  "z-deli": "/images/venues/sp-zdeli.jpg",
  "cafe octavio": "/images/venues/sp-octavio.jpg",
  "patties burger": "/images/venues/sp-patties.jpg",
  "patties burger em casa": "/images/venues/sp-patties.jpg",
  patties: "/images/venues/sp-patties.jpg",
  "petra belas artes + cafe depois": "/images/venues/watch-belas-artes.jpg",
  "reag belas artes": "/images/venues/watch-belas-artes.jpg",
  "cine belas artes": "/images/venues/watch-belas-artes.jpg",
  "cinesesc + jantar leve em pinheiros": "/images/venues/watch-cinesesc.jpg",
  cinesesc: "/images/venues/watch-cinesesc.jpg",
  "sesc sp": "/images/venues/watch-cinesesc.jpg",
  "sesc pompeia": "/images/venues/watch-cinesesc.jpg",
  "sesc pinheiros": "/images/venues/pinheiros.jpg",
  "reserva cultural + noite pela paulista": "/images/venues/watch-reserva-cultural.jpg",
  "reserva cultural": "/images/venues/watch-reserva-cultural.jpg",
  "perfect days": "/images/venues/watch-perfect-days.svg",
  "perfect days em casa + cafe doce": "/images/venues/watch-perfect-days.svg",
  "past lives": "/images/venues/watch-past-lives.svg",
  "past lives em casa + jantar pedido do lugar favorito": "/images/venues/watch-past-lives.svg",
  "anatomy of a fall": "/images/venues/watch-anatomy-of-a-fall.svg",
  "anatomy of a fall em casa + conversa longa depois": "/images/venues/watch-anatomy-of-a-fall.svg",
  "julie & julia": "/images/venues/watch-julie-julia.svg",
  "julie & julia em casa + pedir algo gostoso": "/images/venues/watch-julie-julia.svg",
  interstellar: "/images/venues/movie-interstellar.svg",
  parasita: "/images/venues/movie-parasite.svg",
  parasite: "/images/venues/movie-parasite.svg",
  "the bear": "/images/venues/series-the-bear.svg",
  oppenheimer: "/images/venues/movie-oppenheimer.svg",
  succession: "/images/venues/series-succession.svg",
  "duna: parte dois": "/images/venues/movie-dune-2.svg",
  shogun: "/images/venues/series-shogun.svg",
  "pobres criaturas": "/images/venues/movie-poor-things.svg",
  "taste sao paulo festival": "/images/venues/taste-sp.jpg",
  "restaurant week sao paulo": "/images/venues/restaurant-week.jpg",
  "festivais gastronomicos ceagesp": "/images/venues/ceagesp.jpg",
  "noite de vinhos e gastronomia autoral": "/images/venues/wine.jpg",
  "workshop de massas para casais": "/images/venues/workshop-massas.jpg",
  "sunset jazz no rooftop": "/images/venues/jazz.svg",
  "stand-up intimista para casais": "/images/venues/standup.jpg",
  "festival de jazz no parque": "/images/venues/ibirapuera.jpg",
  "exposicao imersiva: van gogh": "/images/venues/vangogh.jpg",
  "stand-up comedy: humor a dois": "/images/venues/standup.jpg",
  "cinema ao ar livre: classicos": "/images/venues/ccsp.jpg",
  "feira gastronomica noturna": "/images/venues/largo-da-batata.jpg",
  "feira gastronomica noturna em sao paulo": "/images/venues/largo-da-batata.jpg",
};

/** Pool local ordenado por tema para fallback sem repetição visual */
const LOCAL_THEME_POOLS: Record<string, string[]> = {
  italian: [
    "/images/venues/sp-lellis.jpg",
    "/images/venues/similar-modern-mamma.jpg",
    "/images/venues/similar-nino-cucina.jpg",
    "/images/venues/workshop-massas.jpg",
  ],
  pizza: [
    "/images/venues/sp-pizza-mooca.jpg",
    "/images/venues/sp-braz.jpg",
    "/images/venues/similar-braz.jpg",
    "/images/venues/pizzaria-graminha.jpg",
  ],
  japanese: [
    "/images/venues/sp-issho.jpg",
    "/images/venues/similar-kinoshita.jpg",
    "/images/venues/similar-aizome.jpg",
    "/images/venues/editorial-omakase.jpg",
  ],
  steak: [
    "/images/venues/sp-libertango.jpg",
    "/images/venues/similar-chimi.jpg",
    "/images/venues/similar-pobre-juan.jpg",
    "/images/venues/taste-sp.jpg",
  ],
  burger: [
    "/images/venues/sp-patties.jpg",
    "/images/venues/sp-zdeli.jpg",
  ],
  cafe: [
    "/images/venues/sp-octavio.jpg",
    "/images/venues/sp-travessa.jpg",
    "/images/venues/livraria-travessa.jpg",
    "/images/venues/similar-megafauna.jpg",
  ],
  fine_dining: [
    "/images/venues/sp-evvai.jpg",
    "/images/venues/sp-mani.jpg",
    "/images/venues/sp-casa-porco.jpg",
    "/images/venues/editorial-chefs.jpg",
    "/images/venues/restaurant-week.jpg",
  ],
  wine: [
    "/images/venues/wine.jpg",
    "/images/venues/rooftop-sp.jpg",
    "/images/venues/vila-madalena.jpg",
  ],
  museum: [
    "/images/venues/masp.jpg",
    "/images/venues/pinacoteca.jpg",
    "/images/venues/ims-paulista.jpg",
    "/images/venues/mis.jpg",
    "/images/venues/ccbb.jpg",
    "/images/venues/itau-cultural.jpg",
    "/images/venues/catavento.jpg",
    "/images/venues/vangogh.jpg",
  ],
  cultural: [
    "/images/venues/theatro-municipal.jpg",
    "/images/venues/sala-sao-paulo.jpg",
    "/images/venues/planetario.jpg",
    "/images/venues/biblioteca-mario.jpg",
    "/images/venues/ccsp.jpg",
    "/images/venues/ibirapuera.jpg",
  ],
  cinema: [
    "/images/venues/watch-belas-artes.jpg",
    "/images/venues/watch-cinesesc.jpg",
    "/images/venues/watch-reserva-cultural.jpg",
    "/images/venues/cinemateca.jpg",
    "/images/venues/movie-interstellar.svg",
    "/images/venues/movie-parasite.svg",
  ],
};

function normalizeVenueKey(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function stableHash(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function resolveKnownVenueImage(id?: string | null): string | null {
  if (!id) return null;
  return KNOWN_VENUE_IMAGES[id] || null;
}

export function resolveKnownVenueImageByTitle(title?: string | null): string | null {
  if (!title) return null;
  const key = normalizeVenueKey(title);
  if (KNOWN_VENUE_IMAGES_BY_TITLE[key]) return KNOWN_VENUE_IMAGES_BY_TITLE[key];

  const firstSegment = key.split(/[+—–-]/)[0]?.trim();
  if (firstSegment && KNOWN_VENUE_IMAGES_BY_TITLE[firstSegment]) {
    return KNOWN_VENUE_IMAGES_BY_TITLE[firstSegment];
  }

  for (const [knownTitle, imageUrl] of Object.entries(KNOWN_VENUE_IMAGES_BY_TITLE)) {
    if (knownTitle.length >= 5 && key.includes(knownTitle)) {
      return imageUrl;
    }
  }

  return null;
}

export function resolveKnownVenueImageForItem(
  id?: string | null,
  title?: string | null,
  location?: string | null
): string | null {
  return (
    resolveKnownVenueImage(id) ||
    resolveKnownVenueImageByTitle(title) ||
    resolveKnownVenueImageByTitle(location)
  );
}

/**
 * Resolve uma imagem local contextual a partir de tags, categoria, título e domínio,
 * garantindo que nenhum card fique sem foto ou dependa de chamadas lentas.
 */
export function resolveContextualLocalImage(item: {
  id?: string | null;
  title?: string | null;
  description?: string | null;
  category?: string | null;
  domain?: string | null;
  location?: string | null;
  neighborhood?: string | null;
  tags?: string[] | null;
  source?: string | null;
}): string {
  const exact = resolveKnownVenueImageForItem(item.id, item.title, item.location);
  if (exact) return exact;

  const text = normalizeVenueKey(
    [
      item.title,
      item.description,
      item.category,
      item.location,
      item.neighborhood,
      item.source,
      ...(item.tags || []),
    ]
      .filter(Boolean)
      .join(" ")
  );

  // Match specific cultural venues in text
  if (text.includes("masp")) return "/images/venues/masp.jpg";
  if (text.includes("pinacoteca")) return "/images/venues/pinacoteca.jpg";
  if (text.includes("ccbb")) return "/images/venues/ccbb.jpg";
  if (text.includes("itau cultural")) return "/images/venues/itau-cultural.jpg";
  if (text.includes("ims")) return "/images/venues/ims-paulista.jpg";
  if (text.includes("mis")) return "/images/venues/mis.jpg";
  if (text.includes("catavento")) return "/images/venues/catavento.jpg";
  if (text.includes("planetario")) return "/images/venues/planetario.jpg";
  if (text.includes("theatro municipal") || text.includes("teatro municipal")) return "/images/venues/theatro-municipal.jpg";
  if (text.includes("sala sao paulo") || text.includes("orquestra")) return "/images/venues/sala-sao-paulo.jpg";
  if (text.includes("belas artes")) return "/images/venues/watch-belas-artes.jpg";
  if (text.includes("reserva cultural")) return "/images/venues/watch-reserva-cultural.jpg";
  if (text.includes("cinemateca")) return "/images/venues/cinemateca.jpg";
  if (text.includes("sesc")) return "/images/venues/watch-cinesesc.jpg";
  if (text.includes("ibirapuera")) return "/images/venues/ibirapuera.jpg";
  if (text.includes("copan") || text.includes("megafauna")) return "/images/venues/similar-megafauna.jpg";
  if (text.includes("travessa") || text.includes("livraria")) return "/images/venues/livraria-travessa.jpg";
  if (text.includes("biblioteca")) return "/images/venues/biblioteca-mario.jpg";
  if (text.includes("ceagesp")) return "/images/venues/ceagesp.jpg";
  if (text.includes("largo da batata") || text.includes("feira")) return "/images/venues/largo-da-batata.jpg";
  if (text.includes("jazz")) return "/images/venues/jazz.svg";
  if (text.includes("stand up") || text.includes("stand-up") || text.includes("comedia") || text.includes("humor")) {
    return "/images/venues/standup.jpg";
  }

  const hash = stableHash(item.id || item.title || text || "default");
  const pick = (poolKey: keyof typeof LOCAL_THEME_POOLS) => {
    const pool = LOCAL_THEME_POOLS[poolKey];
    return pool[hash % pool.length];
  };

  if (text.includes("pizza") || text.includes("napolitana")) return pick("pizza");
  if (text.includes("japon") || text.includes("sushi") || text.includes("omakase") || text.includes("izakaya") || text.includes("sashimi")) {
    return pick("japanese");
  }
  if (text.includes("italian") || text.includes("massa") || text.includes("trattoria") || text.includes("pasta")) {
    return pick("italian");
  }
  if (text.includes("burger") || text.includes("hamburguer") || text.includes("sanduiche") || text.includes("deli")) {
    return pick("burger");
  }
  if (text.includes("carne") || text.includes("parrilla") || text.includes("churrasco") || text.includes("steak")) {
    return pick("steak");
  }
  if (text.includes("vinho") || text.includes("wine") || text.includes("rooftop")) {
    return pick("wine");
  }
  if (text.includes("cafe") || text.includes("brunch") || text.includes("padaria")) {
    return pick("cafe");
  }

  if (item.domain === "movies_series" || text.includes("cinema") || text.includes("filme") || text.includes("serie")) {
    return pick("cinema");
  }
  if (item.domain === "dining_out" || item.domain === "delivery") {
    return pick("fine_dining");
  }
  if (text.includes("exposic") || text.includes("museu") || text.includes("arte")) {
    return pick("museum");
  }

  return pick("cultural");
}

export function dedupeImageAssignments<T extends { id: string; title?: string; image_url?: string | null }>(
  items: T[],
  resolved: Record<string, string | null>
): Record<string, string | null> {
  const usedRemoteUrls = new Set<string>();
  const output: Record<string, string | null> = {};

  for (const item of items) {
    const candidate = resolved[item.id] ?? item.image_url ?? resolveKnownVenueImageForItem(item.id, item.title);
    const normalized = candidate?.trim() || null;
    if (!normalized) continue;

    // Local curated images (/images/venues/...) are always accepted without nulling out
    if (normalized.startsWith("/images/")) {
      output[item.id] = normalized;
      continue;
    }

    if (usedRemoteUrls.has(normalized)) {
      output[item.id] = resolveContextualLocalImage(item);
      continue;
    }
    usedRemoteUrls.add(normalized);
    output[item.id] = normalized;
  }

  return output;
}
