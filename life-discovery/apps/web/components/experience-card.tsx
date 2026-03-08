"use client";

import { useState } from "react";

import { sendFeedback } from "../lib/api";

export default function ExperienceCard({ userId, exp }: { userId: string; exp: any }) {
  const [status, setStatus] = useState("");

  async function send(action: "like" | "dislike" | "save") {
    await sendFeedback(userId, exp.id, action, {
      reason_tags: action === "dislike" ? ["not_for_us"] : ["good_match"]
    });
    setStatus(action);
  }

  return (
    <article className="rounded-xl border bg-white p-4 shadow-sm">
      <h3 className="text-lg font-semibold">{exp.title}</h3>
      <p className="mt-1 text-sm text-neutral-700">{exp.description}</p>
      <p className="mt-2 text-xs text-neutral-500">{exp.location} | {exp.start_time || "TBD"}</p>
      <p className="mt-2 text-xs text-neutral-500">{(exp.tags || []).join(", ")}</p>
      <div className="mt-3 flex gap-2">
        <button onClick={() => send("like")} className="rounded-full bg-black px-3 py-1 text-xs text-white">like</button>
        <button onClick={() => send("dislike")} className="rounded-full border px-3 py-1 text-xs">dislike</button>
        <button onClick={() => send("save")} className="rounded-full border px-3 py-1 text-xs">save</button>
      </div>
      <p className="mt-2 text-xs text-neutral-500">{status}</p>
    </article>
  );
}
