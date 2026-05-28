// Legacy compatibility module — re-exports from the new API client
import { fetchRecommendations } from "@/shared/api/client";
import { getUserId } from "@/shared/storage";

export async function getRecommendations() {
  return fetchRecommendations(getUserId(), "Sao Paulo");
}
