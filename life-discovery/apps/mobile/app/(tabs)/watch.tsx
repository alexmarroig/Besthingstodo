import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";

import { fetchContext, fetchCoupleMe, fetchRecommendationsFeed } from "../../src/api";
import { EmptyStateCard } from "../../src/components/empty-state-card";
import { LoadingScreen } from "../../src/components/loading-screen";
import { RecommendationCard } from "../../src/components/recommendation-card";
import { MobileShell } from "../../src/components/shell";
import { SectionTitle } from "../../src/components/section-title";
import { DEFAULT_CITY } from "../../src/curation";
import { useSession } from "../../src/providers";
import { palette, spacing } from "../../src/theme";

export default function WatchScreen() {
  const session = useSession();

  const coupleQuery = useQuery({
    queryKey: ["mobile-watch-couple", session.token],
    queryFn: () => fetchCoupleMe(session.token),
    enabled: session.ready
  });

  const city = coupleQuery.data?.city || DEFAULT_CITY;

  const contextQuery = useQuery({
    queryKey: ["mobile-watch-context", session.token, city],
    queryFn: () => fetchContext(session.token, city),
    enabled: session.ready
  });

  const watchQuery = useQuery({
    queryKey: ["mobile-watch", session.token, session.userId, city, contextQuery.data?.weather],
    queryFn: () =>
      fetchRecommendationsFeed({
        token: session.token,
        userId: session.userId,
        city,
        domain: "movies_series",
        weather: contextQuery.data?.weather
      }),
    enabled: session.ready
  });

  const items = watchQuery.data?.items || [];
  const cinema = items.filter((item) => item.category === "cinema").slice(0, 3);
  const atHome = items.filter((item) => item.category !== "cinema").slice(0, 6);

  return (
    <MobileShell
      title="Watch Together"
      eyebrow="Cinema and streaming"
      subtitle="Uma tela mobile para separar rapidamente o que vale ver juntos fora de casa e no sofa."
    >
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.contextCard}>
          <Text style={styles.contextTitle}>{contextQuery.data?.weather_label || "contexto estavel"}</Text>
          <Text style={styles.contextBody}>
            {contextQuery.data?.weather_note || "A selecao continua funcionando mesmo quando o backend cai para modo curado."}
          </Text>
        </View>

        {watchQuery.isLoading && !items.length ? (
          <LoadingScreen title="Buscando o que ver" subtitle="Separando cinema, streaming e opcoes com mais chance real de agradar os dois." inline />
        ) : null}

        {cinema.length ? (
          <View style={styles.section}>
            <SectionTitle
              eyebrow="Fora de casa"
              title="Cinema com clima de date"
              subtitle="Salas e programas com mais chance real de encaixar na noite."
            />
            {cinema.map((item) => (
              <RecommendationCard key={item.id} item={item} compact />
            ))}
          </View>
        ) : null}

        <View style={styles.section}>
          <SectionTitle
            eyebrow="Em casa"
            title="Filmes e series para decidir rapido"
            subtitle="Sem rolar catalogo infinito. Aqui entra o que parece mais forte para ver juntos."
          />
          {!watchQuery.isLoading && !atHome.length ? (
            <EmptyStateCard
              icon="film-outline"
              title="Nada para assistir agora"
              body="Quando nao houver opcoes prontas, o app continua no modo leve e volta para a curadoria local."
            />
          ) : null}
          {atHome.map((item) => (
            <RecommendationCard key={item.id} item={item} compact />
          ))}
        </View>
      </ScrollView>
    </MobileShell>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
    paddingBottom: spacing.xxxl
  },
  scroll: {
    flex: 1
  },
  contextCard: {
    padding: spacing.lg,
    borderRadius: 24,
    backgroundColor: palette.panel,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    gap: spacing.sm
  },
  contextTitle: {
    color: palette.text,
    fontFamily: "serif",
    fontSize: 24
  },
  contextBody: {
    color: palette.textMuted,
    fontSize: 14,
    lineHeight: 22
  },
  section: {
    gap: spacing.md
  }
});
