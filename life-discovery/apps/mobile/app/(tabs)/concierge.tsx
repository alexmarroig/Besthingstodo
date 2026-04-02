import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useMutation, useQuery } from "@tanstack/react-query";

import { askConcierge, fetchContext, fetchRecommendationsFeed } from "../../src/api";
import { EmptyStateCard } from "../../src/components/empty-state-card";
import { LoadingScreen } from "../../src/components/loading-screen";
import { MessageCard } from "../../src/components/message-card";
import { MobileShell } from "../../src/components/shell";
import { SectionTitle } from "../../src/components/section-title";
import { DEFAULT_CITY } from "../../src/curation";
import { useSession } from "../../src/providers";
import { palette, spacing } from "../../src/theme";

export default function ConciergeScreen() {
  const session = useSession();
  const [message, setMessage] = useState("Quero algo romantico, sem lotacao e facil de decidir hoje.");

  const contextQuery = useQuery({
    queryKey: ["mobile-concierge-context", session.token, DEFAULT_CITY],
    queryFn: () => fetchContext(session.token, DEFAULT_CITY),
    enabled: session.ready
  });

  const recommendationsQuery = useQuery({
    queryKey: ["mobile-concierge-recos", session.token, session.userId, contextQuery.data?.weather],
    queryFn: () =>
      fetchRecommendationsFeed({
        token: session.token,
        userId: session.userId,
        city: DEFAULT_CITY,
        weather: contextQuery.data?.weather
      }),
    enabled: session.ready
  });

  const conciergeMutation = useMutation({
    mutationFn: () =>
      askConcierge({
        userId: session.userId,
        city: DEFAULT_CITY,
        message,
        recommendations: recommendationsQuery.data?.items || [],
        context: contextQuery.data
      })
  });

  const response = conciergeMutation.data;
  const canAsk = useMemo(() => message.trim().length > 8, [message]);

  return (
    <MobileShell
      title="Concierge"
      eyebrow="Structured AI"
      subtitle="No mobile, a IA entra como ajuda de decisao objetiva, nao como conversa infinita."
    >
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.promptCard}>
          <Text style={styles.promptLabel}>Pedido rapido</Text>
          <TextInput
            value={message}
            onChangeText={setMessage}
            multiline
            placeholder="Ex: quero algo leve, cultural e sem chuva"
            placeholderTextColor={palette.textSoft}
            style={styles.input}
          />
          <TouchableOpacity
            disabled={!canAsk || conciergeMutation.isPending}
            onPress={() => conciergeMutation.mutate()}
            style={[styles.primaryButton, (!canAsk || conciergeMutation.isPending) && styles.disabledButton]}
          >
            <Text style={styles.primaryButtonText}>Gerar resposta</Text>
          </TouchableOpacity>
        </View>

        {conciergeMutation.isPending ? (
          <LoadingScreen title="Pensando nas melhores opcoes" subtitle="A IA esta cruzando o pedido com itens reais e contexto atual." inline />
        ) : null}

        {!response && !conciergeMutation.isPending ? (
          <EmptyStateCard
            icon="chatbubble-ellipses-outline"
            title="Peca do seu jeito"
            body="Descreva o humor da noite, o que evitar e o nivel de energia. O app responde com opcoes mais explicaveis e acionaveis."
          />
        ) : null}

        {response ? (
          <View style={styles.section}>
            <SectionTitle
              eyebrow="Leitura"
              title={response.intro}
              subtitle="A resposta sempre parte de itens reais ou cai em fallback estruturado."
            />

            {response.memory.length ? (
              <View style={styles.memoryRow}>
                {response.memory.map((item) => (
                  <View key={item} style={styles.memoryChip}>
                    <Text style={styles.memoryText}>{item}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            {response.options.map((option, index) => (
              <MessageCard key={`${option.title}-${index}`} option={option} />
            ))}
          </View>
        ) : null}
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
  promptCard: {
    backgroundColor: palette.panel,
    borderRadius: 24,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    gap: spacing.md
  },
  promptLabel: {
    color: palette.accent,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1.5
  },
  input: {
    minHeight: 120,
    color: palette.text,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 18,
    padding: spacing.md,
    textAlignVertical: "top",
    fontSize: 15,
    lineHeight: 22
  },
  primaryButton: {
    backgroundColor: palette.primary,
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center"
  },
  disabledButton: {
    opacity: 0.5
  },
  primaryButtonText: {
    color: "#fff8f1",
    fontSize: 15,
    fontWeight: "600"
  },
  section: {
    gap: spacing.md
  },
  memoryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  memoryChip: {
    backgroundColor: "rgba(244,208,111,0.12)",
    borderWidth: 1,
    borderColor: "rgba(244,208,111,0.22)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  memoryText: {
    color: palette.accent,
    fontSize: 12
  }
});
