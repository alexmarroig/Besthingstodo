import { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { patchCoupleProfile, submitOnboardingAnswers } from "../src/api";
import { MobileShell } from "../src/components/shell";
import { buildCouplePatchFromDraft, buildOnboardingAnswers, defaultOnboardingDraft, OnboardingDraft } from "../src/onboarding";
import { useLocalActions, useOnboardingDraft } from "../src/local-data";
import { useSession } from "../src/providers";
import { palette, spacing } from "../src/theme";

const STEPS = [
  {
    key: "base",
    label: "Base",
    title: "Onde e como voces circulam",
    subtitle: "Contexto geografico e logistico para o app parar de sugerir o que nao encaixa."
  },
  {
    key: "rhythm",
    label: "Ritmo",
    title: "Qual e a energia do casal",
    subtitle: "Tom da noite, frequencia, objetivo e nivel de planejamento esperado."
  },
  {
    key: "limits",
    label: "Limites",
    title: "O que precisa ser respeitado",
    subtitle: "Barulho, lotacao, comida, acessibilidade e outros limites reais da experiencia."
  },
  {
    key: "people",
    label: "Pessoas",
    title: "Quem sao voces no detalhe",
    subtitle: "Interesses, aversoes e sinais mais humanos que costumam fugir do cadastro basico."
  },
  {
    key: "repertoire",
    label: "Repertorio",
    title: "Referencias e memoria afetiva",
    subtitle: "Filmes, lugares, restaurantes e desejos que viram atalho para recomendacao boa."
  },
  {
    key: "finish",
    label: "Fechar",
    title: "Revisao final",
    subtitle: "Resumo das preferencias antes de salvar localmente ou sincronizar com a conta."
  }
] as const;

function InputBlock({
  label,
  value,
  onChange,
  placeholder,
  multiline = false,
  keyboardType
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  multiline?: boolean;
  keyboardType?: "default" | "numeric";
}) {
  return (
    <View style={styles.fieldBlock}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={palette.textSoft}
        multiline={multiline}
        keyboardType={keyboardType}
        style={[styles.input, multiline && styles.inputMultiline]}
      />
    </View>
  );
}

function ChoiceRow({
  label,
  value,
  onChange,
  options
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
}) {
  return (
    <View style={styles.fieldBlock}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.choiceRow}>
        {options.map((option) => (
          <TouchableOpacity
            key={option.value}
            onPress={() => onChange(option.value)}
            style={[styles.choiceChip, value === option.value && styles.choiceChipActive]}
          >
            <Text style={[styles.choiceText, value === option.value && styles.choiceTextActive]}>{option.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function ToggleRow({
  label,
  value,
  onChange
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.switchRow}>
      <Text style={styles.switchText}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        thumbColor={value ? palette.accent : "#d3d3d3"}
        trackColor={{ true: "rgba(244,208,111,0.35)", false: "rgba(255,255,255,0.14)" }}
      />
    </View>
  );
}

function SummaryPill({ value }: { value: string }) {
  return (
    <View style={styles.summaryPill}>
      <Text style={styles.summaryPillText}>{value}</Text>
    </View>
  );
}

export default function OnboardingScreen() {
  const session = useSession();
  const queryClient = useQueryClient();
  const { data } = useOnboardingDraft();
  const actions = useLocalActions();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<OnboardingDraft>(defaultOnboardingDraft);
  const [status, setStatus] = useState("Preencha o onboarding para deixar o app realmente alinhado com o gosto, os limites e o ritmo de voces.");

  useEffect(() => {
    if (data) {
      setDraft({ ...defaultOnboardingDraft, ...data });
    }
  }, [data]);

  const syncMutation = useMutation({
    mutationFn: async () => {
      const nextDraft = { ...draft, onboardingComplete: true };
      await actions.saveOnboardingDraft(nextDraft);

      if (!session.token) return nextDraft;

      await submitOnboardingAnswers(session.token, buildOnboardingAnswers(nextDraft));
      await patchCoupleProfile(session.token, buildCouplePatchFromDraft(nextDraft) as unknown as Record<string, unknown>);
      return nextDraft;
    },
    onSuccess: async (nextDraft) => {
      setDraft(nextDraft);
      setStatus(
        session.token
          ? "Onboarding sincronizado com a conta. O feed agora pode cruzar API, contexto e preferencias do casal."
          : "Rascunho salvo no aparelho. Assim que voces entrarem, da para sincronizar tudo sem refazer as respostas."
      );
      await queryClient.invalidateQueries();
    },
    onError: (error: Error) =>
      setStatus(error?.message || "Nao consegui sincronizar agora. O rascunho local continua salvo com seguranca.")
  });

  const updateDraft = <K extends keyof OnboardingDraft>(key: K, value: OnboardingDraft[K]) => {
    const next = { ...draft, [key]: value };
    setDraft(next);
    actions.saveOnboardingDraft(next);
  };

  const isLastStep = step === STEPS.length - 1;
  const completion = useMemo(() => {
    const importantFields = [
      draft.accountName,
      draft.city,
      draft.neighborhood,
      draft.member1Name,
      draft.member2Name,
      draft.favoriteRestaurants,
      draft.favoriteMovies,
      draft.wishlist,
      draft.foodRestrictions,
      draft.preferredNeighborhoods
    ];

    const filled = importantFields.filter((item) => item.trim().length > 0).length + (draft.onboardingComplete ? 1 : 0);
    return Math.round((filled / (importantFields.length + 1)) * 100);
  }, [draft]);

  const summary = useMemo(
    () =>
      [
        draft.city,
        draft.neighborhood,
        draft.dateGoal,
        draft.mood,
        draft.budget,
        draft.quietVsSocial,
        draft.preferredNeighborhoods
      ].filter(Boolean),
    [draft]
  );

  const currentStep = STEPS[step];

  return (
    <MobileShell
      title="Onboarding"
      eyebrow="Couple anamnesis"
      subtitle="Um fluxo mobile mais inteligente para capturar contexto, limites, repertorio e estilo antes de pedir confianca da IA."
    >
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.overviewCard}>
          <Text style={styles.overviewEyebrow}>Progresso</Text>
          <Text style={styles.overviewTitle}>{completion}% mapeado</Text>
          <Text style={styles.overviewBody}>{currentStep.title}</Text>
          <Text style={styles.overviewSubtext}>{currentStep.subtitle}</Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressBar, { width: `${((step + 1) / STEPS.length) * 100}%` }]} />
          </View>
          <View style={styles.summaryRow}>
            {summary.slice(0, 4).map((item) => (
              <SummaryPill key={item} value={item} />
            ))}
          </View>
        </View>

        <View style={styles.stepCard}>
          <Text style={styles.stepEyebrow}>Etapas</Text>
          <View style={styles.stepRow}>
            {STEPS.map((item, index) => (
              <TouchableOpacity key={item.key} onPress={() => setStep(index)} style={[styles.stepChip, step === index && styles.stepChipActive]}>
                <Text style={[styles.stepChipText, step === index && styles.stepChipTextActive]}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {step === 0 ? (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Base do casal</Text>
            <InputBlock label="Nome da conta" value={draft.accountName} onChange={(value) => updateDraft("accountName", value)} placeholder="Ex: Alex & Camila" />
            <InputBlock label="Cidade" value={draft.city} onChange={(value) => updateDraft("city", value)} placeholder="Ex: Sao Paulo" />
            <InputBlock label="Bairro principal" value={draft.neighborhood} onChange={(value) => updateDraft("neighborhood", value)} placeholder="Ex: Campo Belo" />
            <InputBlock
              label="Bairros queridos"
              value={draft.preferredNeighborhoods}
              onChange={(value) => updateDraft("preferredNeighborhoods", value)}
              placeholder="Ex: Pinheiros, Paulista, Moema"
            />
            <InputBlock label="Transporte principal" value={draft.transport} onChange={(value) => updateDraft("transport", value)} placeholder="Ex: carro, uber, metro" />
            <InputBlock
              label="Raio ideal de busca"
              value={String(draft.searchRadiusKm)}
              onChange={(value) => updateDraft("searchRadiusKm", Number(value) || 0)}
              placeholder="Ex: 10"
              keyboardType="numeric"
            />
            <InputBlock
              label="Maximo de minutos no deslocamento"
              value={String(draft.maxDriveMinutes)}
              onChange={(value) => updateDraft("maxDriveMinutes", Number(value) || 0)}
              placeholder="Ex: 40"
              keyboardType="numeric"
            />
            <InputBlock
              label="Horario de acordar no fim de semana"
              value={draft.weekendWakeTime}
              onChange={(value) => updateDraft("weekendWakeTime", value)}
              placeholder="Ex: 10:00"
            />
          </View>
        ) : null}

        {step === 1 ? (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Ritmo e objetivo</Text>
            <ChoiceRow
              label="Quando voces costumam aproveitar melhor"
              value={draft.preferredDaypart}
              onChange={(value) => updateDraft("preferredDaypart", value as OnboardingDraft["preferredDaypart"])}
              options={[
                { label: "Dia", value: "day" },
                { label: "Noite", value: "night" },
                { label: "Flexivel", value: "flexible" }
              ]}
            />
            <ChoiceRow
              label="Cadencia"
              value={draft.dateCadence}
              onChange={(value) => updateDraft("dateCadence", value as OnboardingDraft["dateCadence"])}
              options={[
                { label: "Espontaneo", value: "spontaneous" },
                { label: "Toda semana", value: "weekly" },
                { label: "Planejado", value: "planned" }
              ]}
            />
            <ChoiceRow
              label="Objetivo mais comum"
              value={draft.dateGoal}
              onChange={(value) => updateDraft("dateGoal", value as OnboardingDraft["dateGoal"])}
              options={[
                { label: "Relaxar", value: "relax" },
                { label: "Celebrar", value: "celebrate" },
                { label: "Descobrir", value: "discover" },
                { label: "Conversar", value: "talk" }
              ]}
            />
            <ChoiceRow
              label="Tom principal"
              value={draft.mood}
              onChange={(value) => updateDraft("mood", value as OnboardingDraft["mood"])}
              options={[
                { label: "Romantico", value: "romantic" },
                { label: "Cultural", value: "cultural" },
                { label: "Calmo", value: "calm" },
                { label: "Misturado", value: "mixed" }
              ]}
            />
            <ChoiceRow
              label="Orcamento"
              value={draft.budget}
              onChange={(value) => updateDraft("budget", value as OnboardingDraft["budget"])}
              options={[
                { label: "Baixo", value: "low" },
                { label: "Medio", value: "medium" },
                { label: "Alto", value: "high" }
              ]}
            />
            <ChoiceRow
              label="Ambiente"
              value={draft.quietVsSocial}
              onChange={(value) => updateDraft("quietVsSocial", value as OnboardingDraft["quietVsSocial"])}
              options={[
                { label: "Silencioso", value: "quiet" },
                { label: "Equilibrado", value: "balanced" },
                { label: "Social", value: "social" }
              ]}
            />
            <ChoiceRow
              label="Indoor ou outdoor"
              value={draft.indoorVsOutdoor}
              onChange={(value) => updateDraft("indoorVsOutdoor", value as OnboardingDraft["indoorVsOutdoor"])}
              options={[
                { label: "Indoor", value: "indoor" },
                { label: "Misturado", value: "mixed" },
                { label: "Outdoor", value: "outdoor" }
              ]}
            />
            <ChoiceRow
              label="Romance ou grupo"
              value={draft.romanticVsGroup}
              onChange={(value) => updateDraft("romanticVsGroup", value as OnboardingDraft["romanticVsGroup"])}
              options={[
                { label: "A dois", value: "romantic" },
                { label: "Equilibrado", value: "balanced" },
                { label: "Com grupo", value: "group" }
              ]}
            />
            <ChoiceRow
              label="Nivel de planejamento"
              value={draft.planningStyle}
              onChange={(value) => updateDraft("planningStyle", value as OnboardingDraft["planningStyle"])}
              options={[
                { label: "Decidir rapido", value: "fast" },
                { label: "Meio termo", value: "balanced" },
                { label: "Detalhado", value: "detailed" }
              ]}
            />
            <ToggleRow label="Evitar sair quando estiver chovendo" value={draft.avoidRain} onChange={(value) => updateDraft("avoidRain", value)} />
          </View>
        ) : null}

        {step === 2 ? (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Limites e conforto</Text>
            <ChoiceRow
              label="Tolerancia a lotacao"
              value={draft.crowdTolerance}
              onChange={(value) => updateDraft("crowdTolerance", value as OnboardingDraft["crowdTolerance"])}
              options={[
                { label: "Evitar", value: "avoid" },
                { label: "Depende", value: "balanced" },
                { label: "Tudo bem", value: "like" }
              ]}
            />
            <ChoiceRow
              label="Barulho"
              value={draft.noiseTolerance}
              onChange={(value) => updateDraft("noiseTolerance", value as OnboardingDraft["noiseTolerance"])}
              options={[
                { label: "Baixo", value: "low" },
                { label: "Medio", value: "medium" },
                { label: "Alto", value: "high" }
              ]}
            />
            <ChoiceRow
              label="Bebidas alcoolicas"
              value={draft.alcoholPreference}
              onChange={(value) => updateDraft("alcoholPreference", value as OnboardingDraft["alcoholPreference"])}
              options={[
                { label: "Evitar", value: "avoid" },
                { label: "Social", value: "social" },
                { label: "Gosta", value: "like" }
              ]}
            />
            <InputBlock
              label="Restricoes alimentares"
              value={draft.foodRestrictions}
              onChange={(value) => updateDraft("foodRestrictions", value)}
              placeholder="Ex: vegetariano, sem lactose, sem frutos do mar"
              multiline
            />
            <InputBlock
              label="Acessibilidade"
              value={draft.accessibilityNeeds}
              onChange={(value) => updateDraft("accessibilityNeeds", value)}
              placeholder="Ex: evitar escadas, precisar de estacionamento facil, assento confortavel"
              multiline
            />
            <InputBlock
              label="Limites sensoriais"
              value={draft.sensoryLimits}
              onChange={(value) => updateDraft("sensoryLimits", value)}
              placeholder="Ex: nao funciona lugar muito apertado, musica muito alta, fila longa"
              multiline
            />
          </View>
        ) : null}

        {step === 3 ? (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Pessoas reais</Text>
            <InputBlock label="Pessoa 1" value={draft.member1Name} onChange={(value) => updateDraft("member1Name", value)} placeholder="Nome da pessoa 1" />
            <ToggleRow label="Pessoa 1 bebe alcool" value={draft.member1DrinksAlcohol} onChange={(value) => updateDraft("member1DrinksAlcohol", value)} />
            <ToggleRow label="Pessoa 1 fuma" value={draft.member1Smokes} onChange={(value) => updateDraft("member1Smokes", value)} />
            <InputBlock
              label="Interesses da pessoa 1"
              value={draft.member1Interests}
              onChange={(value) => updateDraft("member1Interests", value)}
              placeholder="Ex: ciencia, psicologia, jazz, gastronomia"
              multiline
            />
            <InputBlock
              label="O que evitar para a pessoa 1"
              value={draft.member1Dislikes}
              onChange={(value) => updateDraft("member1Dislikes", value)}
              placeholder="Ex: balada, lugar apertado, fila longa"
              multiline
            />

            <View style={styles.divider} />

            <InputBlock label="Pessoa 2" value={draft.member2Name} onChange={(value) => updateDraft("member2Name", value)} placeholder="Nome da pessoa 2" />
            <ToggleRow label="Pessoa 2 bebe alcool" value={draft.member2DrinksAlcohol} onChange={(value) => updateDraft("member2DrinksAlcohol", value)} />
            <ToggleRow label="Pessoa 2 fuma" value={draft.member2Smokes} onChange={(value) => updateDraft("member2Smokes", value)} />
            <InputBlock
              label="Interesses da pessoa 2"
              value={draft.member2Interests}
              onChange={(value) => updateDraft("member2Interests", value)}
              placeholder="Ex: cinema, astrologia, museus, livros"
              multiline
            />
            <InputBlock
              label="O que evitar para a pessoa 2"
              value={draft.member2Dislikes}
              onChange={(value) => updateDraft("member2Dislikes", value)}
              placeholder="Ex: lotacao, improviso demais, restaurante barulhento"
              multiline
            />
          </View>
        ) : null}

        {step === 4 ? (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Repertorio e memoria</Text>
            <ChoiceRow
              label="Momento da relacao"
              value={draft.relationshipStage}
              onChange={(value) => updateDraft("relationshipStage", value as OnboardingDraft["relationshipStage"])}
              options={[
                { label: "Recente", value: "new" },
                { label: "Estavel", value: "steady" },
                { label: "Longo prazo", value: "long_term" }
              ]}
            />
            <InputBlock
              label="Restaurantes favoritos"
              value={draft.favoriteRestaurants}
              onChange={(value) => updateDraft("favoriteRestaurants", value)}
              placeholder="Ex: Libertango, Aizome, Cora"
              multiline
            />
            <InputBlock
              label="Filmes favoritos"
              value={draft.favoriteMovies}
              onChange={(value) => updateDraft("favoriteMovies", value)}
              placeholder="Ex: Interstellar, Before Sunset"
              multiline
            />
            <InputBlock
              label="Series favoritas"
              value={draft.favoriteSeries}
              onChange={(value) => updateDraft("favoriteSeries", value)}
              placeholder="Ex: The Bear, Succession"
              multiline
            />
            <InputBlock
              label="Lugares que voces adoram"
              value={draft.favoritePlaces}
              onChange={(value) => updateDraft("favoritePlaces", value)}
              placeholder="Ex: MASP, Livraria da Travessa, Ibirapuera"
              multiline
            />
            <InputBlock
              label="Wishlist"
              value={draft.wishlist}
              onChange={(value) => updateDraft("wishlist", value)}
              placeholder="Ex: concertos, exposicoes, hoteis, planetario"
              multiline
            />
            <InputBlock
              label="Datas e celebracoes"
              value={draft.celebrationDates}
              onChange={(value) => updateDraft("celebrationDates", value)}
              placeholder="Ex: aniversario de namoro, aniversarios, datas espontaneas que gostam de comemorar"
              multiline
            />
          </View>
        ) : null}

        {step === 5 ? (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Resumo antes de salvar</Text>
            <View style={styles.reviewCard}>
              <Text style={styles.reviewTitle}>{draft.accountName || "Conta compartilhada"}</Text>
              <Text style={styles.reviewBody}>
                {draft.city} - {draft.neighborhood}. Preferencia por {draft.mood}, ritmo {draft.dateCadence}, objetivo principal {draft.dateGoal}.
              </Text>
              <Text style={styles.reviewBody}>
                Evitar lotacao: {draft.crowdTolerance === "avoid" ? "sim" : "depende"} | Ruido: {draft.noiseTolerance} | Alcool: {draft.alcoholPreference}
              </Text>
              <Text style={styles.reviewBody}>
                Repertorio forte: {draft.favoriteRestaurants || "nao informado"} / {draft.favoriteMovies || "nao informado"}
              </Text>
            </View>

            <View style={styles.summaryRow}>
              {summary.map((item) => (
                <SummaryPill key={item} value={item} />
              ))}
            </View>

            <Text style={styles.statusText}>{status}</Text>
          </View>
        ) : null}

        <View style={styles.footerCard}>
          <Text style={styles.footerEyebrow}>Acao</Text>
          <Text style={styles.statusText}>{status}</Text>
          <View style={styles.navRow}>
            <TouchableOpacity disabled={step === 0} onPress={() => setStep((prev) => Math.max(0, prev - 1))} style={[styles.secondaryButton, step === 0 && styles.disabledButton]}>
              <Text style={styles.secondaryButtonText}>Voltar</Text>
            </TouchableOpacity>
            {!isLastStep ? (
              <TouchableOpacity onPress={() => setStep((prev) => Math.min(STEPS.length - 1, prev + 1))} style={styles.primaryButton}>
                <Text style={styles.primaryButtonText}>Proximo bloco</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={() => syncMutation.mutate()} style={styles.primaryButton}>
                <Text style={styles.primaryButtonText}>{session.token ? "Sincronizar conta" : "Salvar no aparelho"}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
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
  overviewCard: {
    backgroundColor: palette.panel,
    borderRadius: 28,
    padding: spacing.lg,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: palette.border
  },
  overviewEyebrow: {
    color: palette.accent,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1.4
  },
  overviewTitle: {
    color: palette.text,
    fontFamily: "serif",
    fontSize: 32
  },
  overviewBody: {
    color: palette.text,
    fontSize: 15,
    lineHeight: 22
  },
  overviewSubtext: {
    color: palette.textMuted,
    lineHeight: 22
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.08)",
    overflow: "hidden",
    marginTop: spacing.sm
  },
  progressBar: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: palette.primary
  },
  summaryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.sm
  },
  summaryPill: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "rgba(244,208,111,0.12)",
    borderWidth: 1,
    borderColor: "rgba(244,208,111,0.18)"
  },
  summaryPillText: {
    color: palette.accent,
    fontSize: 12
  },
  stepCard: {
    backgroundColor: palette.panel,
    borderRadius: 24,
    padding: spacing.lg,
    gap: spacing.sm
  },
  stepEyebrow: {
    color: palette.accent,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1.4
  },
  stepRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  stepChip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "rgba(255,255,255,0.05)"
  },
  stepChipActive: {
    backgroundColor: palette.primary
  },
  stepChipText: {
    color: palette.textMuted,
    fontSize: 12
  },
  stepChipTextActive: {
    color: "#fff8f1"
  },
  panel: {
    backgroundColor: palette.panel,
    borderRadius: 24,
    padding: spacing.lg,
    gap: spacing.md
  },
  panelTitle: {
    color: palette.text,
    fontFamily: "serif",
    fontSize: 28
  },
  fieldBlock: {
    gap: spacing.sm
  },
  fieldLabel: {
    color: palette.text,
    fontSize: 14
  },
  choiceRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  choiceChip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "rgba(255,255,255,0.05)"
  },
  choiceChipActive: {
    backgroundColor: "rgba(244,208,111,0.14)"
  },
  choiceText: {
    color: palette.textMuted
  },
  choiceTextActive: {
    color: palette.accent
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 18,
    color: palette.text,
    paddingHorizontal: 16,
    paddingVertical: 14
  },
  inputMultiline: {
    minHeight: 96,
    textAlignVertical: "top"
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.md
  },
  switchText: {
    color: palette.textMuted,
    flex: 1,
    lineHeight: 22
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    marginVertical: spacing.sm
  },
  reviewCard: {
    borderRadius: 22,
    padding: spacing.md,
    backgroundColor: "rgba(255,255,255,0.05)",
    gap: spacing.sm
  },
  reviewTitle: {
    color: palette.text,
    fontFamily: "serif",
    fontSize: 24
  },
  reviewBody: {
    color: palette.textMuted,
    lineHeight: 22
  },
  footerCard: {
    backgroundColor: palette.panel,
    borderRadius: 24,
    padding: spacing.lg,
    gap: spacing.md
  },
  footerEyebrow: {
    color: palette.accent,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1.4
  },
  statusText: {
    color: palette.textMuted,
    lineHeight: 22
  },
  navRow: {
    flexDirection: "row",
    gap: spacing.sm
  },
  primaryButton: {
    flex: 1,
    backgroundColor: palette.primary,
    borderRadius: 999,
    alignItems: "center",
    paddingVertical: 14
  },
  primaryButtonText: {
    color: "#fff8f1",
    fontWeight: "600"
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: "rgba(244,208,111,0.12)",
    borderRadius: 999,
    alignItems: "center",
    paddingVertical: 14
  },
  secondaryButtonText: {
    color: palette.accent,
    fontWeight: "600"
  },
  disabledButton: {
    opacity: 0.45
  }
});
