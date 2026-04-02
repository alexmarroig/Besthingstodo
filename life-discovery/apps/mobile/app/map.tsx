import { useLocalSearchParams } from "expo-router";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";

import { fetchRecommendationsFeed } from "../src/api";
import { CityMap } from "../src/components/city-map";
import { MobileShell } from "../src/components/shell";
import { DEFAULT_CITY } from "../src/curation";
import { useSession } from "../src/providers";
import { palette, spacing } from "../src/theme";

export default function MapScreen() {
  const { focus } = useLocalSearchParams<{ focus?: string }>();
  const session = useSession();

  const recommendationsQuery = useQuery({
    queryKey: ["mobile-map-route", session.token, session.userId],
    queryFn: () =>
      fetchRecommendationsFeed({
        token: session.token,
        userId: session.userId,
        city: DEFAULT_CITY
      }),
    enabled: session.ready
  });

  return (
    <MobileShell
      title="Leitura por bairros"
      eyebrow="Map route"
      subtitle="Uma versao dedicada do mapa para mergulhar mais fundo na geografia da noite."
    >
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {recommendationsQuery.isLoading && !recommendationsQuery.data?.items?.length ? (
          <View style={styles.loadingState}>
            <ActivityIndicator color={palette.accent} />
            <Text style={styles.loadingText}>Abrindo o mapa editorial...</Text>
          </View>
        ) : null}

        <CityMap items={recommendationsQuery.data?.items || []} focusTitle={focus} />
      </ScrollView>
    </MobileShell>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1
  },
  content: {
    gap: spacing.lg,
    paddingBottom: spacing.xxxl
  },
  loadingState: {
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.lg
  },
  loadingText: {
    color: palette.textMuted
  }
});
