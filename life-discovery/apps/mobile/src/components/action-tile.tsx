import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { palette, spacing } from "../theme";

export function ActionTile({
  title,
  subtitle,
  icon,
  href
}: {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  href: string;
}) {
  const router = useRouter();

  return (
    <TouchableOpacity onPress={() => router.push(href as any)} style={styles.tile}>
      <View style={styles.iconWrap}>
        <Ionicons name={icon} color={palette.accent} size={20} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    minWidth: 145,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 22,
    padding: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)"
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(244,208,111,0.1)",
    alignItems: "center",
    justifyContent: "center"
  },
  title: {
    color: palette.text,
    fontFamily: "serif",
    fontSize: 20
  },
  subtitle: {
    color: palette.textMuted,
    lineHeight: 20
  }
});
