"use client";

import { useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function OnboardingPage() {
  const [name, setName] = useState("");
  const [city, setCity] = useState("Sao Paulo");
  const [interests, setInterests] = useState("thriller museum exhibition quiet restaurant");
  const [tags, setTags] = useState("thriller,museum,exhibition,restaurant");
  const [msg, setMsg] = useState("");

  async function createUser() {
    const res = await fetch(`${API}/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        city,
        interests_text: interests,
        preferred_tags: tags.split(",").map((x) => x.trim()).filter(Boolean)
      })
    });
    const data = await res.json();
    localStorage.setItem("life_user_id", data.id);
    setMsg(`user_id: ${data.id}`);
  }

  return (
    <main className="space-y-3">
      <h1 className="text-2xl font-semibold">Onboarding</h1>
      <input className="w-full rounded border p-2" placeholder="name" value={name} onChange={(e) => setName(e.target.value)} />
      <input className="w-full rounded border p-2" placeholder="city" value={city} onChange={(e) => setCity(e.target.value)} />
      <input className="w-full rounded border p-2" placeholder="interests text" value={interests} onChange={(e) => setInterests(e.target.value)} />
      <input className="w-full rounded border p-2" placeholder="tags comma-separated" value={tags} onChange={(e) => setTags(e.target.value)} />
      <button onClick={createUser} className="rounded-full bg-black px-4 py-2 text-sm text-white">create user</button>
      <p className="text-sm text-neutral-600">{msg}</p>
    </main>
  );
}

