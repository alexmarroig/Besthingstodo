"use client";

import { useEffect, useState } from "react";

import ExperienceCard from "../../components/experience-card";
import { fetchRecommendations } from "@/shared/api/client";
import { getUserId } from "@/shared/storage";

export default function RecommendationsPage() {
  const [items, setItems] = useState<any[]>([]);
  const userId = getUserId();

  useEffect(() => {
    fetchRecommendations(userId, "Sao Paulo")
      .then(setItems)
      .catch(() => setItems([]));
  }, [userId]);

  return (
    <main className="space-y-4">
      <h1 className="text-2xl font-semibold">Recomendações</h1>
      <div className="grid gap-3">
        {items.map((exp) => (
          <ExperienceCard key={exp.id} userId={userId} exp={exp} />
        ))}
      </div>
    </main>
  );
}
