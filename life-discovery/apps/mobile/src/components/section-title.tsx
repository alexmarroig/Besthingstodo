import { StyleSheet, Text, View } from "react-native";

import { palette, spacing } from "../theme";

export function SectionTitle({
  eyebrow,
  title,
  subtitle
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <View style={styles.root}>
      <Text style={styles.eyebrow}>{eyebrow}</Text>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: spacing.xs
  },
  eyebrow: {
    color: palette.accent,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1.5
  },
  title: {
    color: palette.text,
    fontFamily: "serif",
    fontSize: 27,
    lineHeight: 31
  },
  subtitle: {
    color: palette.textMuted,
    lineHeight: 22
  }
});
