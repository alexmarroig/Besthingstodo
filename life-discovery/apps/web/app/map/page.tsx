"use client";

import { useQuery } from "@tanstack/react-query";

import ExperienceMap from "../../components/discovery/experience-map";
import { fetchRecommendations } from "../../lib/api";
import { getUserId } from "../../lib/storage";

export default function MapPage() {
  const userId = getUserId();
  const { data } = useQuery({ queryKey: ["map-recos", userId], queryFn: () => fetchRecommendations(userId) });

  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-semibold">Map</h2>
      <ExperienceMap items={data || []} />
    </section>
  );
}

