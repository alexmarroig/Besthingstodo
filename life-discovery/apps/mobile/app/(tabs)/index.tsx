import { useMemo, useState } from "react";
import { RefreshControl, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";

import { fetchContext, fetchCoupleMe, fetchRecommendationsFeed } from "../../src/api";
import { ActionTile } from "../../src/components/action-tile";
import { EmptyStateCard } from "../../src/components/empty-state-card";
import { LoadingScreen } from "../../src/components/loading-screen";
import { RecommendationCard } from "../../src/components/recommendation-card";
import { SectionTitle } from "../../src/components/section-title";
import { MobileShell } from "../../src/components/shell";
import { StatPill } from "../../src/components/stat-pill";
import { BRAND, DEFAULT_CITY } from "../../src/curation";
import { useAgendaItems, useOnboardingDraft, useSavedItems } from "../../src/local-data";
import { useSession } from "../../src/providers";
import { palette, spacing } from "../../src/theme";

export default function TodayScreen() {
  const session = useSession();
  const [showNow, setShowNow] = useState(false);

  const coupleQuery = useQuery({
    queryKey: ["mobile-couple", session.token],
    queryFn: () => fetchCoupleMe(session.token),
    enabled: session.ready
  });

  const city = coupleQuery.data?.city || DEFAULT_CITY;

  const contextQuery = useQuery({
    queryKey: ["mobile-context", session.token, city],
    queryFn: () => fetchContext(session.token, city),
    enabled: session.ready
  });

  const recommendationsQuery = useQuery({
    queryKey: ["mobile-home", session.token, session.userId, city, contextQuery.data?.weather],
    queryFn: () =>
      fetchRecommendationsFeed({
        token: session.token,
        userId: session.userId,
        city,
        weather: contextQuery.data?.weather
      }),
    enabled: session.ready
  });

  const items = recommendationsQuery.data?.items || [];
  const spotlight = items.slice(0, 4);
  const nowSuggestions = useMemo(() => {
    const categories = new Set<string>();
    const candidates = items.filter(item => item.domain !== "movies_series" && item.domain !== "delivery");
    const distinct = candidates.filter(item => {
      if (categories.has(item.category)) return false;
      categories.add(item.category);
      return true;
    });
    return [...distinct, ...candidates.filter(item => !distinct.includes(item))].slice(0, 3);
  }, [items]);
  const atHome = items.filter((item) => item.domain === "delivery" || item.category === "movie" || item.category === "series").slice(0, 3);
  const cultural = items.filter((item) => item.domain === "events_exhibitions").slice(0, 3);
  const modeLabel = recommendationsQuery.data?.isFallback ? "modo curado" : "modo personalizado";
  const { data: savedItems = [] } = useSavedItems();
  const { data: agendaItems = [] } = useAgendaItems();
  const { data: onboardingDraft } = useOnboardingDraft();

  const refreshing = coupleQuery.isRefetching || contextQuery.isRefetching || recommendationsQuery.isRefetching;

  const headline = useMemo(() => {
    if (contextQuery.data?.isRainy) {
      return "Hoje pede escolhas cobertas, bonitas e sem friccao.";
    }
    return "A versao mobile do feed para decidir mais rapido.";
  }, [contextQuery.data]);

  return (
    <MobileShell
      title={BRAND.name}
      eyebrow="Descubra mais. Viva mais."
      subtitle="Encontre seu próximo programa sem precisar abrir cinco aplicativos."
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              coupleQuery.refetch();
              contextQuery.refetch();
              recommendationsQuery.refetch();
            }}
            tintColor={palette.accent}
          />
        }
      >
        <View style={styles.heroCard}>
          <Text style={styles.heroEyebrow}>{modeLabel}</Text>
          <Text style={styles.heroTitle}>{headline}</Text>
          <Text style={styles.heroBody}>
            {contextQuery.data?.weather_note || BRAND.subtitle}
          </Text>
          <View style={styles.statsRow}>
            <StatPill label="Opcoes" value={String(items.length)} />
            <StatPill label="Cidade" value={city} />
            <StatPill label="Clima" value={contextQuery.data?.weather_label || "estavel"} />
          </View>
        </View>

        <View style={styles.nowCard}>
          <Text style={styles.heroEyebrow}>BESTTHINGSTODO NOW</Text>
          <Text style={styles.nowTitle}>O que fazer hoje?</Text>
          <Text style={styles.heroBody}>Três ideias do catálogo para decidir mais rápido. Confirme horários e disponibilidade antes de sair.</Text>
          <Pressable accessibilityRole="button" accessibilityState={{ expanded: showNow }} onPress={() => setShowNow(value => !value)} style={styles.nowButton}>
            <Text style={styles.nowButtonText}>{showNow ? "Ocultar ideias" : "Me dê três ideias"}</Text>
          </Pressable>
          {showNow ? <View style={styles.nowResults}>
            {nowSuggestions.length ? nowSuggestions.map(item => <RecommendationCard key={item.id} item={item} compact />) : <Text style={styles.heroBody}>Nenhuma sugestão disponível no catálogo neste momento.</Text>}
          </View> : null}
        </View>

        <View style={styles.quickGrid}>
          <ActionTile title="Mapa" subtitle="Ler a cidade por bairros e distancias." icon="map-outline" href="/map" />
          <ActionTile title="Favoritos" subtitle={`${savedItems.length} itens salvos no celular.`} icon="bookmark-outline" href="/saved" />
          <ActionTile title="Agenda" subtitle={`${agendaItems.length} planos consultaveis localmente.`} icon="calendar-outline" href="/agenda" />
          <ActionTile
            title="Onboarding"
            subtitle={onboardingDraft?.onboardingComplete ? "Preferencias ja capturadas." : "Completar setup compartilhado."}
            icon="sparkles-outline"
            href="/onboarding"
          />
        </View>

        {recommendationsQuery.isLoading && !items.length ? (
          <LoadingScreen title="Montando sua selecao" subtitle="Cruzo contexto, modo local e preferencias salvas para abrir a home ja mastigada." inline />
        ) : null}

        <View style={styles.section}>
          <SectionTitle
            eyebrow="Agora"
            title="Melhores apostas para sair do zero"
            subtitle="As cartas principais do momento, com menos ruido e mais clareza de decisao."
          />
          {!recommendationsQuery.isLoading && !spotlight.length ? (
            <EmptyStateCard
              icon="sparkles-outline"
              title="Ainda sem cartas fortes"
              body="Quando o feed estiver vazio, o app continua pronto para puxar curadoria local assim que voce atualizar."
            />
          ) : null}
          {spotlight.map((item) => (
            <RecommendationCard key={item.id} item={item} compact={false} />
          ))}
        </View>

        {atHome.length ? (
          <View style={styles.section}>
            <SectionTitle
              eyebrow="Em casa"
              title="Quando a noite pede sofa"
              subtitle="Delivery, filme e serie sem cara de improviso."
            />
            {atHome.map((item) => (
              <RecommendationCard key={item.id} item={item} compact />
            ))}
          </View>
        ) : null}

        {cultural.length ? (
          <View style={styles.section}>
            <SectionTitle
              eyebrow="Cultura"
              title="Programas que rendem conversa"
              subtitle="Exposicoes, cinemas e experiencias com mais repertorio."
            />
            {cultural.map((item) => (
              <RecommendationCard key={item.id} item={item} compact />
            ))}
          </View>
        ) : null}
      </ScrollView>
    </MobileShell>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: spacing.xxxl
  },
  scroll: {
    flex: 1
  },
  heroCard: {
    backgroundColor: palette.panel,
    borderRadius: 28,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    gap: spacing.sm
  },
  heroEyebrow: {
    color: palette.accent,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1.6
  },
  heroTitle: {
    color: palette.text,
    fontFamily: "serif",
    fontSize: 30,
    lineHeight: 34
  },
  heroBody: {
    color: palette.textMuted,
    fontSize: 14,
    lineHeight: 22
  },
  statsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.sm
  },
  section: {
    gap: spacing.md,
    marginTop: spacing.lg
  },
  nowCard: { backgroundColor: palette.panel, borderRadius: 24, padding: spacing.lg, borderWidth: 1, borderColor: "rgba(244,208,111,0.24)", marginTop: spacing.lg, gap: spacing.sm },
  nowTitle: { color: palette.text, fontFamily: "serif", fontSize: 26, lineHeight: 32 },
  nowButton: { backgroundColor: palette.primary, paddingVertical: 14, paddingHorizontal: 18, borderRadius: 16, alignItems: "center", marginTop: spacing.sm },
  nowButtonText: { color: "#ffffff", fontSize: 15, fontWeight: "700" },
  nowResults: { gap: spacing.md, marginTop: spacing.md },
  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.lg
  }
});
