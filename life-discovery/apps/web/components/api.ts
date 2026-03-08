const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function getRecommendations(userId: string) {
  const res = await fetch(`${API}/recommendations?user_id=${userId}&city=Sao%20Paulo&limit=8`, { cache: "no-store" });
  if (!res.ok) return [];
  return res.json();
}

