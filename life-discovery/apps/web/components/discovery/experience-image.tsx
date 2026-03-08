"use client";

import { useEffect, useState } from "react";

import { Recommendation } from "../../lib/types";

type PhotoResponse = {
  url?: string | null;
  source?: string | null;
};

export default function ExperienceImage({ item }: { item: Recommendation }) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams({
      title: item.title || "",
      location: item.location || "",
      city: item.city || "Sao Paulo"
    });
    if (item.latitude != null) params.set("lat", String(item.latitude));
    if (item.longitude != null) params.set("lon", String(item.longitude));

    fetch(`/api/place-photo?${params.toString()}`)
      .then((r) => r.json())
      .then((data: PhotoResponse) => {
        if (active && data?.url) setImageUrl(data.url);
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [item.title, item.location, item.city, item.latitude, item.longitude]);

  if (!imageUrl) {
    return <div className="h-40 bg-gradient-to-br from-primary/40 to-accent/30" />;
  }

  return (
    <div className="relative h-40 overflow-hidden">
      <img src={imageUrl} alt={item.title} className="h-full w-full object-cover" loading="lazy" />
      <div className="absolute inset-0 bg-black/20" />
    </div>
  );
}

