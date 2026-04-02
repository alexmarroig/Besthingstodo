import { Linking } from "react-native";
import { Recommendation } from "@life/shared-types";

export async function openRecommendationTarget(item: Recommendation) {
  const url = item.booking_url || item.url;
  if (url) {
    await Linking.openURL(url);
    return;
  }

  const query = encodeURIComponent(`${item.location || item.title}, ${item.city}`);
  await Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`);
}

export async function openRecommendationMap(item: Recommendation) {
  const query = encodeURIComponent(`${item.location || item.title}, ${item.city}`);
  await Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`);
}
