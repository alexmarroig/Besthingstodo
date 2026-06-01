export type RecommendationDomain = "dining_out" | "delivery" | "movies_series" | "events_exhibitions" | string;
export type ContentTier = "signature" | "curated" | "discovery" | null;
export type AvailabilityKind = "venue" | "delivery" | "streaming" | "event" | null;
export type IndoorOutdoor = "indoor" | "outdoor" | "mixed" | null;

export type Experience = {
  id: string;
  title: string;
  description: string;
  category: string;
  domain?: RecommendationDomain;
  content_tier?: ContentTier;
  city: string;
  location: string;
  neighborhood?: string | null;
  distance_label?: string | null;
  indoor_outdoor?: IndoorOutdoor;
  weather_fit?: string | null;
  couple_fit_reason?: string | null;
  avoid_reason?: string | null;
  image_url?: string | null;
  personalization_label?: string | null;
  related_favorite?: string | null;
  image_fallback_key?: string | null;
  quality_score?: number | null;
  availability_kind?: AvailabilityKind;
  editorial_source?: string | null;
  booking_url?: string | null;
  price_band?: string | null;
  start_time?: string | null;
  price?: number | null;
  rating?: number | null;
  review_snippet?: string | null;
  tags: string[];
  source: string;
  url?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  profile_signals?: string[];
};

export type Recommendation = Experience & {
  score?: number;
  reason?: string;
};

export type FeedbackSignal = "like" | "dislike" | "save" | "not_now";

export type DateNightPlanActivity = {
  title: string;
  type: string;
  reason: string;
  recommendation_id?: string | null;
  time_window?: "morning" | "afternoon" | "night";
  is_indoor?: boolean;
  is_new_vs_familiar?: "new" | "familiar";
  image_url?: string | null;
  cta_url?: string | null;
  spoiler_hint?: string | null;
};

export type DateNightPlan = {
  activity_1: DateNightPlanActivity;
  activity_2: DateNightPlanActivity;
  activity_3: DateNightPlanActivity;
  reasoning: string;
  weather_note?: string;
  couple_note?: string;
  source_recommendation_ids?: string[];
  planning_notes?: string[];
};

export type CoupleMember = {
  full_name: string;
  email?: string | null;
  birth_date?: string | null;
  drinks_alcohol?: boolean;
  smokes?: boolean;
  occupation?: string | null;
  interests?: string[];
  dislikes?: string[];
  movie_genres?: string[];
  series_genres?: string[];
  music_genres?: string[];
  prefers_theater?: boolean;
  likes_party?: boolean;
  allergies?: string[];
  intolerances?: string[];
  food_dislikes?: string[];
};

export type CouplePreferences = {
  preferred_cuisines?: string[];
  avoided_cuisines?: string[];
  romantic_walk_types?: string[];
  preferred_dayparts?: Array<"morning" | "afternoon" | "night">;
  preferred_activities?: string[];
  budget_range?: "low" | "medium" | "high";
  alcohol_policy?: "both_drink" | "one_drinks" | "none_drink";
  avoids_outdoor_when_rain?: boolean;
};

export type CoupleSnapshot = {
  user_id?: string;
  email?: string;
  account_name: string;
  city: string;
  neighborhood?: string | null;
  country?: string;
  search_radius_km?: number;
  max_drive_minutes?: number;
  transport?: string;
  avoid_going_out_when_rain?: boolean;
  weekend_wake_time?: string;
  members: CoupleMember[];
  preferences?: CouplePreferences;
  profile?: {
    schema_version?: string;
    couple_profile_json?: Record<string, any>;
  };
};

export type ExperienceContext = {
  city: string;
  neighborhood?: string | null;
  temperature: number | null;
  feels_like?: number | null;
  humidity?: number | null;
  wind_speed?: number | null;
  condition?: string | null;
  weather: string;
  local_time: string;
  day_of_week: string;
  weather_label: string;
  weather_note: string;
  time_label: string;
  isRainy: boolean;
  isNight: boolean;
  isHot?: boolean;
  isCold?: boolean;
  icon_url?: string | null;
};

export type ConciergeOption = {
  title: string;
  summary: string;
  why_it_fits: string;
  constraints_applied: string[];
  weather_note: string;
  steps: string[];
  recommendation_ids?: string[];
};

export type ConciergeResponse = {
  intro: string;
  memory: string[];
  options: ConciergeOption[];
};

export const DEFAULT_USER_ID = "7d713693-e677-518a-a2a7-47cafb70c3f3";
