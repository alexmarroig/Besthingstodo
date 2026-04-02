import { CouplePatchInferred } from "./types";

export type OnboardingDraft = {
  accountName: string;
  city: string;
  neighborhood: string;
  preferredNeighborhoods: string;
  transport: string;
  avoidRain: boolean;
  searchRadiusKm: number;
  maxDriveMinutes: number;
  weekendWakeTime: string;
  preferredDaypart: "day" | "night" | "flexible";
  dateCadence: "spontaneous" | "weekly" | "planned";
  dateGoal: "relax" | "celebrate" | "discover" | "talk";
  mood: "romantic" | "cultural" | "calm" | "mixed";
  budget: "low" | "medium" | "high";
  quietVsSocial: "quiet" | "balanced" | "social";
  indoorVsOutdoor: "indoor" | "mixed" | "outdoor";
  romanticVsGroup: "romantic" | "balanced" | "group";
  crowdTolerance: "avoid" | "balanced" | "like";
  noiseTolerance: "low" | "medium" | "high";
  planningStyle: "fast" | "balanced" | "detailed";
  alcoholPreference: "avoid" | "social" | "like";
  foodRestrictions: string;
  accessibilityNeeds: string;
  sensoryLimits: string;
  member1Name: string;
  member1DrinksAlcohol: boolean;
  member1Smokes: boolean;
  member1Interests: string;
  member1Dislikes: string;
  member2Name: string;
  member2DrinksAlcohol: boolean;
  member2Smokes: boolean;
  member2Interests: string;
  member2Dislikes: string;
  favoriteRestaurants: string;
  favoriteMovies: string;
  favoriteSeries: string;
  favoritePlaces: string;
  wishlist: string;
  relationshipStage: "new" | "steady" | "long_term";
  celebrationDates: string;
  onboardingComplete: boolean;
};

export const defaultOnboardingDraft: OnboardingDraft = {
  accountName: "Alex & Camila",
  city: "Sao Paulo",
  neighborhood: "Campo Belo",
  preferredNeighborhoods: "Pinheiros, Vila Madalena, Paulista",
  transport: "car",
  avoidRain: true,
  searchRadiusKm: 10,
  maxDriveMinutes: 40,
  weekendWakeTime: "10:00",
  preferredDaypart: "night",
  dateCadence: "weekly",
  dateGoal: "discover",
  mood: "romantic",
  budget: "medium",
  quietVsSocial: "quiet",
  indoorVsOutdoor: "indoor",
  romanticVsGroup: "romantic",
  crowdTolerance: "avoid",
  noiseTolerance: "low",
  planningStyle: "balanced",
  alcoholPreference: "social",
  foodRestrictions: "",
  accessibilityNeeds: "",
  sensoryLimits: "lugares muito apertados ou barulhentos",
  member1Name: "Alex",
  member1DrinksAlcohol: false,
  member1Smokes: false,
  member1Interests: "technology, science, psychology, astrology",
  member1Dislikes: "crowded places, bars, nightclubs",
  member2Name: "Camila",
  member2DrinksAlcohol: false,
  member2Smokes: false,
  member2Interests: "psychology, astrology",
  member2Dislikes: "crowded places, bars, nightclubs",
  favoriteRestaurants: "Lellis Trattoria, Libertango, Issho",
  favoriteMovies: "Interstellar, Parasite, The Others",
  favoriteSeries: "This Is Us, The Bear",
  favoritePlaces: "Livraria da Travessa, MASP",
  wishlist: "Theatro Municipal, Planetario",
  relationshipStage: "long_term",
  celebrationDates: "aniversario em junho, datas especiais improvisadas",
  onboardingComplete: false
};

function csvToList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function buildOnboardingAnswers(draft: OnboardingDraft) {
  return [
    { category: "preferred_experiences", value: draft.mood, weight: 1 },
    { category: "favorite_movie_genres", value: draft.favoriteMovies, weight: 1 },
    { category: "preferred_restaurants", value: draft.favoriteRestaurants, weight: 1 },
    { category: "budget_range", value: draft.budget, weight: 1 },
    { category: "distance_willing", value: `${draft.searchRadiusKm}km`, weight: 1 },
    { category: "quiet_social", value: draft.quietVsSocial, weight: 1 },
    { category: "indoor_outdoor", value: draft.indoorVsOutdoor, weight: 1 },
    { category: "romantic_group", value: draft.romanticVsGroup, weight: 1 },
    { category: "preferred_daypart", value: draft.preferredDaypart, weight: 1 },
    { category: "date_goal", value: draft.dateGoal, weight: 1 },
    { category: "crowd_tolerance", value: draft.crowdTolerance, weight: 1 },
    { category: "noise_tolerance", value: draft.noiseTolerance, weight: 1 },
    { category: "alcohol_preference", value: draft.alcoholPreference, weight: 1 },
    { category: "food_restrictions", value: draft.foodRestrictions || "none", weight: 1 },
    { category: "preferred_neighborhoods", value: draft.preferredNeighborhoods, weight: 1 }
  ];
}

export function buildCouplePatchFromDraft(draft: OnboardingDraft): CouplePatchInferred {
  return {
    city: draft.city,
    neighborhood: draft.neighborhood,
    search_radius_km: draft.searchRadiusKm,
    max_drive_minutes: draft.maxDriveMinutes,
    transport: draft.transport,
    avoid_going_out_when_rain: draft.avoidRain,
    weekend_wake_time: draft.weekendWakeTime,
    members: [
      {
        full_name: draft.member1Name,
        drinks_alcohol: draft.member1DrinksAlcohol,
        smokes: draft.member1Smokes,
        interests: csvToList(draft.member1Interests),
        dislikes: csvToList(draft.member1Dislikes)
      },
      {
        full_name: draft.member2Name,
        drinks_alcohol: draft.member2DrinksAlcohol,
        smokes: draft.member2Smokes,
        interests: csvToList(draft.member2Interests),
        dislikes: csvToList(draft.member2Dislikes)
      }
    ],
    patch: {
      lifestyle: {
        avoid_crowded_places: draft.quietVsSocial === "quiet" || draft.crowdTolerance === "avoid",
        preferences: [draft.mood, draft.quietVsSocial === "quiet" ? "small" : "flexible", draft.budget, draft.dateGoal],
        pace: draft.planningStyle,
        sensory_limits: csvToList(draft.sensoryLimits)
      },
      location: {
        city: draft.city,
        neighborhood: draft.neighborhood,
        preferred_neighborhoods: csvToList(draft.preferredNeighborhoods),
        transport: draft.transport,
        max_drive_minutes: draft.maxDriveMinutes,
        avoid_going_out_when_rain: draft.avoidRain,
        weekend_wake_time: draft.weekendWakeTime,
        preferred_daypart: draft.preferredDaypart
      },
      interests: {
        cinema: {
          favorite_titles: csvToList(draft.favoriteMovies)
        },
        series: csvToList(draft.favoriteSeries),
        favorite_places: csvToList(draft.favoritePlaces)
      },
      dining: {
        dining_out: csvToList(draft.favoriteRestaurants).map((name) => ({ name })),
        likes: csvToList(draft.favoritePlaces),
        restrictions: csvToList(draft.foodRestrictions),
        alcohol_preference: draft.alcoholPreference
      },
      culture: {
        wishlist: csvToList(draft.wishlist)
      },
      accessibility: {
        notes: csvToList(draft.accessibilityNeeds),
        noise_tolerance: draft.noiseTolerance
      },
      relationship: {
        stage: draft.relationshipStage,
        celebration_dates: csvToList(draft.celebrationDates),
        cadence: draft.dateCadence
      }
    }
  };
}
