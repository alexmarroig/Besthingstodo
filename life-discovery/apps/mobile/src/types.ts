export type CouplePatchInferred = {
  city?: string;
  neighborhood?: string;
  search_radius_km?: number;
  max_drive_minutes?: number;
  transport?: string;
  avoid_going_out_when_rain?: boolean;
  weekend_wake_time?: string;
  members?: Array<{
    full_name: string;
    drinks_alcohol?: boolean;
    smokes?: boolean;
    interests?: string[];
    dislikes?: string[];
  }>;
  patch?: Record<string, unknown>;
};
