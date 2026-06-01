export const MOVIE_GENRES = ["ação", "comédia", "drama", "romance", "suspense", "sci-fi", "terror"];
export const SERIES_GENRES = ["drama", "comédia", "suspense", "documentário", "romance", "true crime"];
export const MUSIC_GENRES = ["mpb", "pop", "jazz", "indie", "eletrônica", "rock", "samba"];
export const CUISINES = ["italiana", "japonesa", "brasileira", "mexicana", "árabe", "vegetariana", "contemporânea"];
export const ACTIVITIES = ["cinema", "teatro", "museu", "show", "livraria", "jantar", "café", "parque"];
export const ROMANTIC_WALKS = ["jantar intimista", "cinema", "teatro", "museu", "show ao vivo", "livraria + café"];

export const DATE_GOALS = [
  { id: "relax", label: "Relaxar" },
  { id: "celebrate", label: "Celebrar" },
  { id: "discover", label: "Descobrir" },
  { id: "talk", label: "Conversar" },
] as const;

export const MOODS = [
  { id: "romantic", label: "Romântico" },
  { id: "cultural", label: "Cultural" },
  { id: "calm", label: "Calmo" },
  { id: "mixed", label: "Misto" },
] as const;

export const BUDGETS = [
  { id: "low", label: "Econômico" },
  { id: "medium", label: "Médio" },
  { id: "high", label: "Premium" },
] as const;

export const CROWD_OPTIONS = [
  { id: "avoid", label: "Evitar lotação" },
  { id: "balanced", label: "Equilibrado" },
  { id: "like", label: "Gosto de movimento" },
] as const;

export const NOISE_OPTIONS = [
  { id: "low", label: "Silêncio" },
  { id: "medium", label: "Moderado" },
  { id: "high", label: "Animado" },
] as const;

export function toggleArray(value: string[], target: string) {
  return value.includes(target) ? value.filter((item) => item !== target) : [...value, target];
}
