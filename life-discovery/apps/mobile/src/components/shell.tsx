import { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";

import { palette, spacing } from "../theme";

export function MobileShell({
  eyebrow,
  title,
  subtitle,
  children
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <LinearGradient colors={["#07111d", "#091827", "#06111d"]} style={styles.root}>
      <View style={styles.meshOne} />
      <View style={styles.meshTwo} />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <View style={styles.hero}>
            <Text style={styles.eyebrow}>{eyebrow}</Text>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>
          {children}
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.bg
  },
  safeArea: {
    flex: 1
  },
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxxl,
    gap: spacing.lg
  },
  hero: {
    paddingTop: spacing.md,
    gap: spacing.sm
  },
  eyebrow: {
    color: palette.accent,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1.7
  },
  title: {
    color: palette.text,
    fontFamily: "serif",
    fontSize: 38,
    lineHeight: 42
  },
  subtitle: {
    color: palette.textMuted,
    fontSize: 15,
    lineHeight: 24,
    maxWidth: 500
  },
  meshOne: {
    position: "absolute",
    top: 50,
    left: -30,
    width: 180,
    height: 180,
    borderRadius: 999,
    backgroundColor: "rgba(249,115,82,0.14)"
  },
  meshTwo: {
    position: "absolute",
    top: 140,
    right: -40,
    width: 200,
    height: 200,
    borderRadius: 999,
    backgroundColor: "rgba(244,208,111,0.1)"
  }
});
