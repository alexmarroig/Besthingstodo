"use client";

import { useEffect, useState } from "react";

import ExperienceCard from "../../components/experience-card";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function RecommendationsPage() {
  const [userId, setUserId] = useState("");
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    const id = localStorage.getItem("life_user_id") || "";
    setUserId(id);
    if (!id) return;
    fetch(`${API}/recommendations?user_id=${id}&city=Sao%20Paulo&limit=10`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setItems);
  }, []);

  return (
    <main className="space-y-4">
      <h1 className="text-2xl font-semibold">Recommendations</h1>
      {!userId ? <p className="text-sm text-neutral-600">Create user in onboarding first.</p> : null}
      <div className="grid gap-3">
        {items.map((exp) => (
          <ExperienceCard key={exp.id} userId={userId} exp={exp} />
        ))}
      </div>
    </main>
  );
}

