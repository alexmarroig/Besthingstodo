import type { CoupleSnapshot } from "@life/shared-types";

export type ProfileGap = {
  id: string;
  label: string;
  why: string;
  href: string;
  weight: number;
};

export function getProfileGaps(couple?: CoupleSnapshot | null): ProfileGap[] {
  if (!couple) {
    return [
      {
        id: "start",
        label: "Montar perfil do casal",
        why: "Sem isso as sugestões ficam genéricas.",
        href: "/onboarding",
        weight: 10,
      },
    ];
  }

  const gaps: ProfileGap[] = [];
  const prefs = couple.preferences || {};
  const members = couple.members || [];

  if (!couple.neighborhood) {
    gaps.push({
      id: "neighborhood",
      label: "Informar bairro base",
      why: "Melhora sugestões perto de vocês.",
      href: "/onboarding?step=0",
      weight: 8,
    });
  }

  if (!(prefs.preferred_cuisines || []).length) {
    gaps.push({
      id: "cuisines",
      label: "Escolher culinárias preferidas",
      why: "Restaurantes passam a refletir o gosto de vocês.",
      href: "/profile?tab=casal",
      weight: 9,
    });
  }

  if (!(prefs.favorite_restaurants || []).length) {
    gaps.push({
      id: "restaurants",
      label: "Adicionar restaurantes favoritos",
      why: "O app replica o estilo dos lugares que vocês já amam.",
      href: "/profile?tab=repertorio",
      weight: 10,
    });
  }

  if (!members.some((member) => (member.movie_genres || []).length || (member.series_genres || []).length)) {
    gaps.push({
      id: "watch",
      label: "Marcar gêneros de filme e série",
      why: "Melhora o trilho de cinema em casa.",
      href: "/profile?tab=pessoa1",
      weight: 7,
    });
  }

  if (!(prefs.preferred_activities || []).length) {
    gaps.push({
      id: "activities",
      label: "Definir tipos de passeio",
      why: "Eventos e experiências ficam mais certeiros.",
      href: "/profile?tab=casal",
      weight: 8,
    });
  }

  if (!(prefs.wishlist || []).length) {
    gaps.push({
      id: "wishlist",
      label: "Adicionar wishlist de lugares",
      why: "Prioriza experiências que vocês querem viver.",
      href: "/profile?tab=repertorio",
      weight: 6,
    });
  }

  return gaps.sort((a, b) => b.weight - a.weight);
}

export function getProfileCompleteness(couple?: CoupleSnapshot | null) {
  const checks = [
    Boolean(couple?.city && couple?.neighborhood),
    Boolean((couple?.preferences?.preferred_cuisines || []).length),
    Boolean((couple?.preferences?.favorite_restaurants || []).length),
    Boolean((couple?.preferences?.preferred_activities || []).length),
    Boolean(
      (couple?.members || []).some(
        (member) => (member.movie_genres || []).length > 0 || (member.series_genres || []).length > 0
      )
    ),
    Boolean((couple?.preferences?.romantic_walk_types || []).length),
    Boolean((couple?.preferences?.wishlist || []).length),
    Boolean((couple?.members || []).some((member) => (member.interests || []).length > 0)),
  ];

  const filled = checks.filter(Boolean).length;
  const percent = Math.round((filled / checks.length) * 100);
  const gaps = getProfileGaps(couple);

  return {
    percent,
    filled,
    total: checks.length,
    nextGap: gaps[0] || null,
    gaps,
    isComplete: percent >= 85,
  };
}
