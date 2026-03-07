"use client";

import { useQuery } from "@tanstack/react-query";

import DiscoveryCard from "../../components/discovery/discovery-card";
import { fetchRecommendations } from "../../lib/api";
import { getUserId } from "../../lib/storage";

export default function HomePage() {
  const userId = getUserId();
  const { data } = useQuery({ queryKey: ["home-recos", userId], queryFn: () => fetchRecommendations(userId) });
  const items = data || [];

  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-semibold">Discovery Feed</h2>
      <p className="text-sm text-white/60">Swipe cards left/right, or use quick actions.</p>
      <div className="grid gap-4 md:grid-cols-2">
        {items.map((item, idx) => (
          <DiscoveryCard key={`${item.id}-${idx}`} item={item} userId={userId} />
        ))}
      </div>
    </section>
  );
}

