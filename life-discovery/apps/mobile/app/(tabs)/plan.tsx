import { useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useMutation, useQuery } from "@tanstack/react-query";

import { fetchContext, fetchRecommendationsFeed, generateDateNightPlan } from "../../src/api";
import { DatePlanCard } from "../../src/components/date-plan-card";
import { EmptyStateCard } from "../../src/components/empty-state-card";
import { LoadingScreen } from "../../src/components/loading-screen";
import { MobileShell } from "../../src/components/shell";
import { DEFAULT_CITY } from "../../src/curation";
import { useSession } from "../../src/providers";
import { palette, spacing } from "../../src/theme";

export default function PlanScreen() {
  const session = useSession();
  const [lastGeneratedAt, setLastGeneratedAt] = useState<string | null>(null);

  const contextQuery = useQuery({
    queryKey: ["mobile-plan-context", session.token, DEFAULT_CITY],
    queryFn: () => fetchContext(session.token, DEFAULT_CITY),
    enabled: session.ready
  });

  const recommendationsQuery = useQuery({
    queryKey: ["mobile-plan-recos", session.token, session.userId, contextQuery.data?.weather],
    queryFn: () =>
      fetchRecommendationsFeed({
        token: session.token,
        userId: session.userId,
        city: DEFAULT_CITY,
        weather: contextQuery.data?.weather
      }),
    enabled: session.ready
  });

  const planMutation = useMutation({
    mutationFn: () =>
      generateDateNightPlan({
        token: session.token,
        userId: session.userId,
        city: DEFAULT_CITY,
        recommendations: recommendationsQuery.data?.items || [],
        context: contextQuery.data
      }),
    onSuccess: () => setLastGeneratedAt(new Date().toISOString())
  });

  return (
    <MobileShell
      title="Noite a Dois"
      eyebrow="Planner"
      subtitle="A tela mobile monta um roteiro com cara de fluxo real: aquecimento, momento principal e fechamento."
    >
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>Montar plano da noite</Text>
          <Text style={styles.heroBody}>
            Usa recomendacoes atuais, contexto de hoje e fallback local quando a API nao responde.
          </Text>
          <TouchableOpacity onPress={() => planMutation.mutate()} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Gerar agora</Text>
          </TouchableOpacity>
          {lastGeneratedAt ? <Text style={styles.metaText}>Ultima geracao: {new Date(lastGeneratedAt).toLocaleTimeString("pt-BR")}</Text> : null}
        </View>

        {planMutation.isPending ? (
          <LoadingScreen title="Costurando a noite" subtitle="Montando uma sequencia coerente com contexto, curadoria e preferencia do casal." inline />
        ) : null}

        {planMutation.data ? (
          <DatePlanCard plan={planMutation.data} />
        ) : (
          <EmptyStateCard
            icon="heart-circle-outline"
            title="Ainda sem plano pronto"
            body="Quando voce tocar em gerar, o app monta a noite com base no que faz sentido agora, sem inventar lugares do nada."
          />
        )}
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
  heroCard: {
    backgroundColor: palette.panel,
    borderRadius: 24,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    gap: spacing.md
  },
  heroTitle: {
    color: palette.text,
    fontFamily: "serif",
    fontSize: 28
  },
  heroBody: {
    color: palette.textMuted,
    lineHeight: 22
  },
  primaryButton: {
    backgroundColor: palette.primary,
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center"
  },
  primaryButtonText: {
    color: "#fff8f1",
    fontWeight: "600"
  },
  metaText: {
    color: palette.textSoft,
    fontSize: 12
  },
});
