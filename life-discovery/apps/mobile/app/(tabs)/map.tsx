import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";

import { fetchContext, fetchCoupleMe, fetchRecommendationsFeed } from "../../src/api";
import { CityMap } from "../../src/components/city-map";
import { MobileShell } from "../../src/components/shell";
import { DEFAULT_CITY } from "../../src/curation";
import { useSession } from "../../src/providers";
import { palette, spacing } from "../../src/theme";

export default function MapTabScreen() {
  const session = useSession();

  const coupleQuery = useQuery({
    queryKey: ["mobile-map-couple", session.token],
    queryFn: () => fetchCoupleMe(session.token),
    enabled: session.ready
  });

  const city = coupleQuery.data?.city || DEFAULT_CITY;

  const contextQuery = useQuery({
    queryKey: ["mobile-map-context", session.token, city],
    queryFn: () => fetchContext(session.token, city),
    enabled: session.ready
  });

  const recommendationsQuery = useQuery({
    queryKey: ["mobile-map-recos", session.token, session.userId, city, contextQuery.data?.weather],
    queryFn: () =>
      fetchRecommendationsFeed({
        token: session.token,
        userId: session.userId,
        city,
        weather: contextQuery.data?.weather
      }),
    enabled: session.ready
  });

  return (
    <MobileShell
      title="Mapa Vivo"
      eyebrow="Spatial view"
      subtitle="Uma leitura espacial do feed para decidir pelo bairro, pela distancia e pelo tipo de noite."
    >
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>{city}</Text>
          <Text style={styles.infoBody}>
            {contextQuery.data?.weather_note || "Sem depender de mapa pesado, o app organiza as recomendacoes por geografia e logistica."}
          </Text>
        </View>

        {recommendationsQuery.isLoading && !recommendationsQuery.data?.items?.length ? (
          <View style={styles.loadingState}>
            <ActivityIndicator color={palette.accent} />
          </View>
        ) : null}

        <CityMap items={recommendationsQuery.data?.items || []} />
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
  infoCard: {
    backgroundColor: palette.panel,
    borderRadius: 24,
    padding: spacing.lg,
    gap: spacing.sm
  },
  infoTitle: {
    color: palette.text,
    fontFamily: "serif",
    fontSize: 28
  },
  infoBody: {
    color: palette.textMuted,
    lineHeight: 22
  },
  loadingState: {
    alignItems: "center",
    paddingVertical: spacing.lg
  }
});
