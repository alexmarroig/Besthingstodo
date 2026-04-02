import { StyleSheet, Text, View } from "react-native";
import { ConciergeOption } from "@life/shared-types";

import { palette, spacing } from "../theme";

export function MessageCard({ option }: { option: ConciergeOption }) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{option.title}</Text>
      <Text style={styles.summary}>{option.summary}</Text>
      <Text style={styles.body}>{option.why_it_fits}</Text>

      {option.constraints_applied.length ? (
        <View style={styles.constraintsRow}>
          {option.constraints_applied.map((item) => (
            <View key={item} style={styles.constraintChip}>
              <Text style={styles.constraintText}>{item}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.steps}>
        {option.steps.map((step, index) => (
          <Text key={`${step}-${index}`} style={styles.step}>
            {index + 1}. {step}
          </Text>
        ))}
      </View>
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
    fontSize: 24
  },
  summary: {
    color: palette.accent,
    fontSize: 13
  },
  body: {
    color: palette.textMuted,
    lineHeight: 22
  },
  constraintsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  constraintChip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: "rgba(244,208,111,0.12)"
  },
  constraintText: {
    color: palette.accent,
    fontSize: 12
  },
  steps: {
    gap: spacing.xs
  },
  step: {
    color: palette.text,
    lineHeight: 21
  }
});
