import type { Recommendation } from "@life/shared-types";

export type BatchImageItem = {
  id: string;
  title: string;
  domain?: string | null;
  city?: string | null;
  location?: string | null;
  neighborhood?: string | null;
  url?: string | null;
  booking_url?: string | null;
  image_url?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  quality_score?: number | null;
};

export function toBatchImageItem(item: Recommendation): BatchImageItem {
  return {
    id: item.id,
    title: item.title,
    domain: item.domain,
    city: item.city,
    location: item.location,
    neighborhood: item.neighborhood,
    url: item.url,
    booking_url: item.booking_url,
    image_url: item.image_url,
    latitude: item.latitude,
    longitude: item.longitude,
    quality_score: item.quality_score,
  };
}
