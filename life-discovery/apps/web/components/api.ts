import { getAccessToken } from "../lib/storage";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function getRecommendations() {
  const token = getAccessToken();
  const res = await fetch(`${API}/recommendations?city=Sao%20Paulo&limit=8`, {
    cache: "no-store",
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  if (!res.ok) return [];
  return res.json();
}
