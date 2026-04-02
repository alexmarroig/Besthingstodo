import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import { palette, spacing } from "../theme";

export function EmptyStateCard({
  icon,
  title,
  body
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.iconWrap}>
        <Ionicons name={icon} color={palette.accent} size={22} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.panel,
    borderRadius: 24,
    padding: spacing.lg,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: palette.border
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(244,208,111,0.12)",
    alignItems: "center",
    justifyContent: "center"
  },
  title: {
    color: palette.text,
    fontFamily: "serif",
    fontSize: 26
  },
  body: {
    color: palette.textMuted,
    lineHeight: 22
  }
});
