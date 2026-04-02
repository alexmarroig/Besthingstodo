import { Recommendation } from "@life/shared-types";

type SourceTheme = {
  badge: string;
  eyebrow: string;
  gradient: string;
};

const HOST_LABELS: Array<{ match: string; label: string; badge: string; eyebrow: string; gradient: string }> = [
  { match: "guide.michelin.com", label: "Michelin Guide", badge: "Guia confiavel", eyebrow: "Selecao Michelin", gradient: "from-[#7f1d1d] via-[#111827] to-[#f59e0b]" },
  { match: "masp.org.br", label: "MASP", badge: "Fonte oficial", eyebrow: "Museu oficial", gradient: "from-[#1d4ed8] via-[#0f172a] to-[#f97316]" },
  { match: "ims.com.br", label: "IMS Paulista", badge: "Fonte oficial", eyebrow: "Acervo oficial", gradient: "from-[#1e293b] via-[#111827] to-[#38bdf8]" },
  { match: "pinacoteca.org.br", label: "Pinacoteca", badge: "Fonte oficial", eyebrow: "Museu oficial", gradient: "from-[#4c1d95] via-[#111827] to-[#f59e0b]" },
  { match: "theatromunicipal.org.br", label: "Theatro Municipal", badge: "Fonte oficial", eyebrow: "Palco oficial", gradient: "from-[#6b21a8] via-[#111827] to-[#f97316]" },
  { match: "prefeitura.sp.gov.br", label: "Planetario Ibirapuera", badge: "Fonte oficial", eyebrow: "Agenda oficial", gradient: "from-[#14532d] via-[#111827] to-[#22c55e]" },
  { match: "asas.br.com", label: "REAG Belas Artes", badge: "Cinema oficial", eyebrow: "Sala de cinema", gradient: "from-[#1e1b4b] via-[#111827] to-[#ef4444]" },
  { match: "reservacultural.com.br", label: "Reserva Cultural", badge: "Cinema oficial", eyebrow: "Sala de cinema", gradient: "from-[#312e81] via-[#111827] to-[#fb7185]" },
  { match: "cinemateca.org.br", label: "Cinemateca Brasileira", badge: "Cinema oficial", eyebrow: "Arquivo de cinema", gradient: "from-[#111827] via-[#1d4ed8] to-[#f97316]" },
  { match: "mubi.com", label: "MUBI", badge: "Streaming", eyebrow: "Curadoria de cinema", gradient: "from-[#111827] via-[#27272a] to-[#ef4444]" },
  { match: "telecine.globo.com", label: "Telecine", badge: "Streaming", eyebrow: "Catalogo em casa", gradient: "from-[#111827] via-[#1d4ed8] to-[#ec4899]" },
  { match: "sesc.com.br", label: "SESC", badge: "Fonte oficial", eyebrow: "Programacao cultural", gradient: "from-[#0f172a] via-[#1d4ed8] to-[#22c55e]" },
  { match: "lellistrattoria.com.br", label: "Lellis Trattoria", badge: "Casa favorita", eyebrow: "Restaurante conhecido", gradient: "from-[#7f1d1d] via-[#111827] to-[#fb7185]" },
  { match: "apizzadamooca.com.br", label: "A Pizza da Mooca", badge: "Casa selecionada", eyebrow: "Pizza da noite", gradient: "from-[#78350f] via-[#111827] to-[#f59e0b]" },
  { match: "pattiesburger.com", label: "Patties", badge: "Delivery forte", eyebrow: "Pedido certeiro", gradient: "from-[#92400e] via-[#111827] to-[#f97316]" },
  { match: "zdeli.com.br", label: "Z Deli", badge: "Delivery forte", eyebrow: "Pedido certeiro", gradient: "from-[#0f172a] via-[#111827] to-[#eab308]" },
  { match: "brazelettrica.com.br", label: "Braz Elettrica", badge: "Delivery forte", eyebrow: "Pizza em casa", gradient: "from-[#7c2d12] via-[#111827] to-[#f97316]" },
  { match: "forneriasanpaolo.com.br", label: "Forneria San Paolo", badge: "Delivery forte", eyebrow: "Jantar em casa", gradient: "from-[#7f1d1d] via-[#111827] to-[#fda4af]" },
  { match: "cabanaburger.com.br", label: "Cabana Burger", badge: "Delivery forte", eyebrow: "Pedido em casa", gradient: "from-[#92400e] via-[#111827] to-[#facc15]" },
  { match: "instagram.com", label: "Instagram oficial", badge: "Fonte social", eyebrow: "Perfil oficial", gradient: "from-[#7c3aed] via-[#111827] to-[#fb7185]" }
];

const EDITORIAL_LABELS: Record<string, SourceTheme & { label: string }> = {
  official: { label: "Fonte oficial", badge: "Fonte oficial", eyebrow: "Origem oficial", gradient: "from-[#1d4ed8] via-[#0f172a] to-[#38bdf8]" },
  favorite: { label: "Favorito do casal", badge: "Historico do casal", eyebrow: "Referencia de voces", gradient: "from-[#7f1d1d] via-[#111827] to-[#fb7185]" },
  editorial: { label: "Curadoria local", badge: "Curadoria local", eyebrow: "Selecao editorial", gradient: "from-[#4338ca] via-[#0f172a] to-[#f97316]" },
  michelin: { label: "Michelin Guide", badge: "Guia confiavel", eyebrow: "Selecao Michelin", gradient: "from-[#7f1d1d] via-[#111827] to-[#f59e0b]" }
};

function safeUrl(value?: string | null) {
  if (!value) return null;
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function titleLabel(raw?: string | null) {
  if (!raw) return "Curadoria local";
  return raw
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function getRecommendationSourceMeta(item: Recommendation) {
  const target = safeUrl(item.booking_url || item.url || null);
  const host = target?.hostname.toLowerCase() || "";
  const hostMatch = HOST_LABELS.find((entry) => host === entry.match || host.endsWith(`.${entry.match}`));

  if (hostMatch) {
    return {
      label: hostMatch.label,
      badge: hostMatch.badge,
      eyebrow: hostMatch.eyebrow,
      gradient: hostMatch.gradient,
      host
    };
  }

  const editorialKey = String(item.editorial_source || "").toLowerCase();
  const editorial = EDITORIAL_LABELS[editorialKey];
  if (editorial) {
    return {
      label: editorial.label,
      badge: editorial.badge,
      eyebrow: editorial.eyebrow,
      gradient: editorial.gradient,
      host
    };
  }

  return {
    label: titleLabel(item.source || item.editorial_source || "curadoria local"),
    badge: "Fonte da plataforma",
    eyebrow: "Selecao da plataforma",
    gradient: "from-[#1d4ed8] via-[#0f172a] to-[#f97316]",
    host
  };
}
