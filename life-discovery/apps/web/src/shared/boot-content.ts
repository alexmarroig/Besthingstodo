import type { LucideIcon } from "lucide-react";
import { Clapperboard, Heart, MapPinned, Sparkles, UtensilsCrossed } from "lucide-react";

export type BootSlide = {
  id: string;
  title: string;
  body: string;
  status: string;
  icon: LucideIcon;
};

export const BOOT_SLIDES: BootSlide[] = [
  {
    id: "intro",
    title: "Date nights sem stress",
    body: "Montamos roteiros com restaurante, cinema e cultura — pensados para vocês dois, não para a cidade inteira.",
    status: "Conhecendo o casal...",
    icon: Sparkles,
  },
  {
    id: "curator",
    title: "Curadoria que aprende",
    body: "Favoritos, clima e histórico viram sugestões com match real. Quanto mais vocês usam, mais certeiro fica.",
    status: "Lendo clima e contexto...",
    icon: Heart,
  },
  {
    id: "city",
    title: "São Paulo na palma da mão",
    body: "Restaurantes, eventos culturais e o que assistir em casa — tudo num só lugar, em português.",
    status: "Buscando restaurantes e eventos...",
    icon: UtensilsCrossed,
  },
  {
    id: "ready",
    title: "Quase prontos",
    body: "Organizando carrosséis personalizados para a home. Só mais um instante.",
    status: "Finalizando sugestões...",
    icon: MapPinned,
  },
];
