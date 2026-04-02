import { StyleSheet, Text, View } from "react-native";
import { DateNightPlan } from "@life/shared-types";

import { palette, spacing } from "../theme";

function Step({
  label,
  title,
  reason
}: {
  label: string;
  title: string;
  reason: string;
}) {
  return (
    <View style={styles.stepCard}>
      <Text style={styles.stepLabel}>{label}</Text>
      <Text style={styles.stepTitle}>{title}</Text>
      <Text style={styles.stepBody}>{reason}</Text>
    </View>
  );
}

export function DatePlanCard({ plan }: { plan: DateNightPlan }) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Plano sugerido</Text>
      <Text style={styles.body}>{plan.reasoning}</Text>

      <Step label="Comeco" title={plan.activity_1.title} reason={plan.activity_1.reason} />
      <Step label="Meio" title={plan.activity_2.title} reason={plan.activity_2.reason} />
      <Step label="Fechamento" title={plan.activity_3.title} reason={plan.activity_3.reason} />

      {plan.weather_note ? <Text style={styles.note}>Clima: {plan.weather_note}</Text> : null}
      {plan.couple_note ? <Text style={styles.note}>Casal: {plan.couple_note}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.panel,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    padding: spacing.lg,
    gap: spacing.md
  },
  title: {
    color: palette.text,
    fontFamily: "serif",
    fontSize: 28
  },
  body: {
    color: palette.textMuted,
    lineHeight: 22
  },
  stepCard: {
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.05)",
    padding: spacing.md,
    gap: spacing.xs
  },
  stepLabel: {
    color: palette.accent,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1.4
  },
  stepTitle: {
    color: palette.text,
    fontFamily: "serif",
    fontSize: 22
  },
  stepBody: {
    color: palette.textMuted,
    lineHeight: 21
  },
  note: {
    color: palette.textSoft,
    lineHeight: 20
  }
});
