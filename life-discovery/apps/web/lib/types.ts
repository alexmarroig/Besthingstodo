export type Recommendation = {
  id: string;
  title: string;
  description: string;
  category: string;
  domain?: "dining_out" | "delivery" | "movies_series" | "events_exhibitions" | string;
  city: string;
  location: string;
  start_time?: string | null;
  price?: number | null;
  tags: string[];
  source: string;
  url?: string | null;
  score?: number;
  reason?: string;
  latitude?: number | null;
  longitude?: number | null;
};

export type DateNightPlan = {
  activity_1: { title: string; type: string; reason: string };
  activity_2: { title: string; type: string; reason: string };
  activity_3: { title: string; type: string; reason: string };
  reasoning: string;
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
};

export const DEFAULT_USER_ID = "7d713693-e677-518a-a2a7-47cafb70c3f3";
