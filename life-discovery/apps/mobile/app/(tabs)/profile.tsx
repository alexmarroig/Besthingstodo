import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";

import { fetchCoupleMe, login, patchCoupleProfile, registerCoupleDefault } from "../../src/api";
import { ActionTile } from "../../src/components/action-tile";
import { MobileShell } from "../../src/components/shell";
import { DEMO_SESSION } from "../../src/curation";
import { useAgendaItems, useOnboardingDraft, useSavedItems } from "../../src/local-data";
import { useSession } from "../../src/providers";
import { palette, spacing } from "../../src/theme";

type AuthMode = "login" | "register";

export default function ProfileScreen() {
  const session = useSession();
  const queryClient = useQueryClient();
  const router = useRouter();

  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState(DEMO_SESSION.email);
  const [password, setPassword] = useState(DEMO_SESSION.password);
  const [status, setStatus] = useState("Entre para sincronizar preferencias, feedback e contexto real do casal entre aparelho e backend.");
  const [city, setCity] = useState("Sao Paulo");
  const [neighborhood, setNeighborhood] = useState("Campo Belo");
  const [transport, setTransport] = useState("car");
  const [avoidRain, setAvoidRain] = useState(true);
  const { data: savedItems = [] } = useSavedItems();
  const { data: agendaItems = [] } = useAgendaItems();
  const { data: onboardingDraft } = useOnboardingDraft();

  const coupleQuery = useQuery({
    queryKey: ["mobile-profile-couple", session.token],
    queryFn: () => fetchCoupleMe(session.token),
    enabled: session.ready && !!session.token
  });

  useEffect(() => {
    if (coupleQuery.data) {
      setCity(coupleQuery.data.city || "Sao Paulo");
      setNeighborhood(coupleQuery.data.neighborhood || "Campo Belo");
      setTransport(coupleQuery.data.transport || "car");
      setAvoidRain(coupleQuery.data.avoid_going_out_when_rain ?? true);
      return;
    }

    if (onboardingDraft) {
      setCity(onboardingDraft.city || "Sao Paulo");
      setNeighborhood(onboardingDraft.neighborhood || "Campo Belo");
      setTransport(onboardingDraft.transport || "car");
      setAvoidRain(onboardingDraft.avoidRain ?? true);
    }
  }, [coupleQuery.data, onboardingDraft]);

  const loginMutation = useMutation({
    mutationFn: () => login(email, password),
    onSuccess: async (payload) => {
      await session.setSession(payload.userId, payload.token);
      setStatus("Login concluido. A conta do casal agora pode usar preferencias, feedback e recomendacoes autenticadas.");
      queryClient.invalidateQueries();
    },
    onError: (error: Error) =>
      setStatus(error?.message || "Nao consegui entrar agora. Confira email, senha e se a stack backend esta acessivel.")
  });

  const registerMutation = useMutation({
    mutationFn: () => registerCoupleDefault(email, password),
    onSuccess: async (payload) => {
      await session.setSession(payload.userId, payload.token);
      setStatus("Conta criada. O proximo passo ideal e sincronizar o onboarding para personalizar o feed desde o primeiro uso.");
      queryClient.invalidateQueries();
    },
    onError: (error: Error) =>
      setStatus(error?.message || "Falha ao criar a conta compartilhada. Tente novamente quando a API estiver disponivel.")
  });

  const saveMutation = useMutation({
    mutationFn: () =>
      patchCoupleProfile(session.token, {
        city,
        neighborhood,
        transport,
        avoid_going_out_when_rain: avoidRain
      }),
    onSuccess: () => {
      setStatus("Contexto base salvo. As recomendacoes do app ja podem refletir cidade, bairro e chuva.");
      queryClient.invalidateQueries();
    },
    onError: (error: Error) => setStatus(error?.message || "Nao consegui salvar o contexto base agora.")
  });

  const authBusy = loginMutation.isPending || registerMutation.isPending;
  const onboardingStatus = onboardingDraft?.onboardingComplete ? "completo" : "pendente";
  const authHeadline = useMemo(
    () => (session.token ? "Conta conectada ao casal" : authMode === "login" ? "Entrar para sincronizar" : "Criar conta compartilhada"),
    [authMode, session.token]
  );

  return (
    <MobileShell
      title="Conta"
      eyebrow="Access and preferences"
      subtitle="Tudo o que organiza a experiencia: autenticar, recuperar acesso, revisar contexto base e confirmar o quanto o app ja conhece voces."
    >
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.dashboardCard}>
          <Text style={styles.dashboardEyebrow}>Biblioteca viva</Text>
          <Text style={styles.dashboardTitle}>{authHeadline}</Text>
          <Text style={styles.dashboardBody}>
            {session.token
              ? "Voce ja pode salvar feedback real, editar o profile do casal e levar onboarding e favoritos para a conta."
              : "Sem login o app continua util: onboarding, favoritos e agenda ficam no aparelho ate a sincronizacao."}
          </Text>
          <View style={styles.metricsRow}>
            <View style={styles.metric}>
              <Text style={styles.metricValue}>{savedItems.length}</Text>
              <Text style={styles.metricLabel}>Favoritos</Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricValue}>{agendaItems.length}</Text>
              <Text style={styles.metricLabel}>Agenda</Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricValue}>{onboardingStatus}</Text>
              <Text style={styles.metricLabel}>Onboarding</Text>
            </View>
          </View>
        </View>

        <View style={styles.quickGrid}>
          <ActionTile title="Onboarding" subtitle="Anamnese completa e persistida." icon="sparkles-outline" href="/onboarding" />
          <ActionTile title="Favoritos" subtitle="Colecoes com memoria local." icon="bookmark-outline" href="/saved" />
          <ActionTile title="Agenda" subtitle="Planos ja agendados no aparelho." icon="calendar-outline" href="/agenda" />
          <ActionTile title="Recuperar" subtitle="Fluxo de acesso com feedback honesto." icon="key-outline" href="/recover-account" />
        </View>

        <View style={styles.card}>
          <View style={styles.segmentRow}>
            <TouchableOpacity onPress={() => setAuthMode("login")} style={[styles.segment, authMode === "login" && styles.segmentActive]}>
              <Text style={[styles.segmentText, authMode === "login" && styles.segmentTextActive]}>Entrar</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setAuthMode("register")} style={[styles.segment, authMode === "register" && styles.segmentActive]}>
              <Text style={[styles.segmentText, authMode === "register" && styles.segmentTextActive]}>Criar conta</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.cardTitle}>{session.token ? "Sessao ativa" : authMode === "login" ? "Acesso da conta" : "Nova conta do casal"}</Text>
          <Text style={styles.helperText}>
            {session.token
              ? "Se quiser trocar de conta, saia da sessao e entre com outro email."
              : authMode === "login"
                ? "Entre para sincronizar tudo o que ja foi salvo no celular."
                : "Crie a conta primeiro e depois sincronize onboarding e contexto base."}
          </Text>

          {!session.token ? (
            <>
              <TextInput
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder="Email"
                placeholderTextColor={palette.textSoft}
                style={styles.input}
              />
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholder="Senha"
                placeholderTextColor={palette.textSoft}
                style={styles.input}
              />

              <TouchableOpacity
                disabled={authBusy}
                onPress={() => (authMode === "login" ? loginMutation.mutate() : registerMutation.mutate())}
                style={[styles.primaryButton, authBusy && styles.disabledButton]}
              >
                <Text style={styles.primaryButtonText}>
                  {authBusy ? "Processando..." : authMode === "login" ? "Entrar agora" : "Criar conta"}
                </Text>
              </TouchableOpacity>
            </>
          ) : null}

          <Text style={styles.statusText}>{status}</Text>

          <View style={styles.inlineActions}>
            {session.token ? (
              <TouchableOpacity onPress={session.clearSession} style={styles.ghostButton}>
                <Text style={styles.ghostText}>Sair da sessao</Text>
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity onPress={() => router.push("/recover-account")} style={styles.ghostButton}>
                  <Text style={styles.ghostText}>Recuperar conta</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.push("/onboarding")} style={styles.secondaryButton}>
                  <Text style={styles.secondaryButtonText}>Fazer onboarding antes</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Contexto base</Text>
          <Text style={styles.helperText}>Esses ajustes ajudam a home, o mapa e a selecao da noite a ficarem mais uteis no primeiro toque.</Text>
          {coupleQuery.isLoading && session.token ? <ActivityIndicator color={palette.accent} /> : null}

          <TextInput value={city} onChangeText={setCity} placeholder="Cidade" placeholderTextColor={palette.textSoft} style={styles.input} />
          <TextInput value={neighborhood} onChangeText={setNeighborhood} placeholder="Bairro" placeholderTextColor={palette.textSoft} style={styles.input} />
          <TextInput value={transport} onChangeText={setTransport} placeholder="Transporte" placeholderTextColor={palette.textSoft} style={styles.input} />

          <View style={styles.switchRow}>
            <Text style={styles.switchText}>Preferir lugares cobertos quando chover</Text>
            <Switch
              value={avoidRain}
              onValueChange={setAvoidRain}
              thumbColor={avoidRain ? palette.accent : "#d3d3d3"}
              trackColor={{ true: "rgba(244,208,111,0.35)", false: "rgba(255,255,255,0.16)" }}
            />
          </View>

          <TouchableOpacity
            disabled={!session.token || saveMutation.isPending}
            onPress={() => saveMutation.mutate()}
            style={[styles.primaryButton, !session.token && styles.disabledButton]}
          >
            <Text style={styles.primaryButtonText}>{saveMutation.isPending ? "Salvando..." : "Salvar ajustes"}</Text>
          </TouchableOpacity>
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
  card: {
    backgroundColor: palette.panel,
    borderRadius: 24,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)"
  },
  dashboardCard: {
    backgroundColor: palette.panel,
    borderRadius: 28,
    padding: spacing.lg,
    gap: spacing.sm
  },
  dashboardEyebrow: {
    color: palette.accent,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1.4
  },
  dashboardTitle: {
    color: palette.text,
    fontFamily: "serif",
    fontSize: 30,
    lineHeight: 34
  },
  dashboardBody: {
    color: palette.textMuted,
    lineHeight: 22
  },
  metricsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.sm
  },
  metric: {
    flex: 1,
    borderRadius: 18,
    padding: spacing.md,
    backgroundColor: "rgba(255,255,255,0.05)"
  },
  metricValue: {
    color: palette.text,
    fontFamily: "serif",
    fontSize: 24
  },
  metricLabel: {
    color: palette.textSoft,
    marginTop: 4,
    fontSize: 12
  },
  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  segmentRow: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.04)",
    padding: 4,
    borderRadius: 999,
    gap: 4
  },
  segment: {
    flex: 1,
    borderRadius: 999,
    alignItems: "center",
    paddingVertical: 10
  },
  segmentActive: {
    backgroundColor: palette.primary
  },
  segmentText: {
    color: palette.textMuted,
    fontSize: 13,
    fontWeight: "600"
  },
  segmentTextActive: {
    color: "#fff8f1"
  },
  cardTitle: {
    color: palette.text,
    fontFamily: "serif",
    fontSize: 26
  },
  helperText: {
    color: palette.textMuted,
    lineHeight: 22
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 18,
    color: palette.text,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15
  },
  inlineActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  primaryButton: {
    backgroundColor: palette.primary,
    borderRadius: 999,
    alignItems: "center",
    paddingVertical: 14
  },
  secondaryButton: {
    backgroundColor: "rgba(244,208,111,0.14)",
    borderRadius: 999,
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "rgba(244,208,111,0.2)"
  },
  ghostButton: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 999,
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  primaryButtonText: {
    color: "#fff8f1",
    fontWeight: "600"
  },
  secondaryButtonText: {
    color: palette.accent,
    fontWeight: "600"
  },
  ghostText: {
    color: palette.textMuted,
    fontWeight: "600"
  },
  statusText: {
    color: palette.textMuted,
    lineHeight: 22
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md
  },
  switchText: {
    color: palette.textMuted,
    flex: 1,
    lineHeight: 22
  },
  disabledButton: {
    opacity: 0.45
  }
});
