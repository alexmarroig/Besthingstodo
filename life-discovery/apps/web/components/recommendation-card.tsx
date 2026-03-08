"use client";

import { useState } from "react";

export default function RecommendationCard({
  userId,
  id,
  title,
  description,
  tags
}: {
  userId: string;
  id: string;
  title: string;
  description: string;
  tags: string[];
}) {
  const [status, setStatus] = useState("");

  async function feedback(action: "like" | "dislike") {
    await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, experience_id: id, action })
    });
    setStatus(action === "like" ? "Liked" : "Disliked");
  }

  return (
    <article className="rounded-2xl border bg-white p-4 shadow-sm">
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-neutral-700">{description}</p>
      <p className="mt-2 text-xs text-neutral-500">{tags.join(", ")}</p>
      <div className="mt-4 flex items-center gap-2">
        <button onClick={() => feedback("like")} className="rounded-full bg-black px-3 py-1 text-xs text-white">
          Like
        </button>
        <button onClick={() => feedback("dislike")} className="rounded-full border px-3 py-1 text-xs">
          Dislike
        </button>
        <span className="text-xs text-neutral-500">{status}</span>
      </div>
    </article>
  );
}

