import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { BRAND } from "../curation";
import { palette, spacing } from "../theme";

export function AppSplashScreen({ ready }: { ready: boolean }) {
  const [pulse, setPulse] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setPulse((current) => (current + 1) % 3);
    }, 360);

    return () => clearInterval(timer);
  }, []);

  return (
    <LinearGradient colors={["#050d17", "#091827", "#12253a"]} style={styles.root}>
      <View style={styles.auraOne} />
      <View style={styles.auraTwo} />
      <View style={styles.content}>
        <Text style={styles.eyebrow}>Mobile edition</Text>
        <Text style={styles.title}>{BRAND.name}</Text>
        <Text style={styles.subtitle}>Curadoria, preferencias e decisao rapida com cara de produto premium.</Text>
        <View style={styles.pulseRow}>
          {[0, 1, 2].map((index) => (
            <View key={index} style={[styles.pulseDot, pulse === index && styles.pulseDotActive]} />
          ))}
        </View>
        <Text style={styles.status}>{ready ? "Abrindo sua sessao e biblioteca local" : "Carregando preferencias e estado do app"}</Text>
      </View>
    </LinearGradient>
  );
}

export function LoadingScreen({
  title,
  subtitle,
  inline = false
}: {
  title: string;
  subtitle: string;
  inline?: boolean;
}) {
  return (
    <View style={[styles.loaderCard, inline && styles.loaderCardInline]}>
      <ActivityIndicator color={palette.accent} />
      <Text style={styles.loaderTitle}>{title}</Text>
      <Text style={styles.loaderSubtitle}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.bg,
    justifyContent: "center",
    padding: spacing.xl
  },
  auraOne: {
    position: "absolute",
    width: 240,
    height: 240,
    borderRadius: 999,
    backgroundColor: "rgba(249,115,82,0.2)",
    top: 80,
    right: -60
  },
  auraTwo: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 999,
    backgroundColor: "rgba(111,211,255,0.14)",
    bottom: 110,
    left: -70
  },
  content: {
    gap: spacing.md
  },
  eyebrow: {
    color: palette.accent,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 2
  },
  title: {
    color: palette.text,
    fontFamily: "serif",
    fontSize: 44,
    lineHeight: 48
  },
  subtitle: {
    color: palette.textMuted,
    lineHeight: 24,
    maxWidth: 340
  },
  pulseRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.sm
  },
  pulseDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.2)"
  },
  pulseDotActive: {
    backgroundColor: palette.accent,
    transform: [{ scale: 1.15 }]
  },
  status: {
    color: palette.textSoft,
    fontSize: 13
  },
  loaderCard: {
    borderRadius: 24,
    padding: spacing.lg,
    gap: spacing.sm,
    alignItems: "center",
    backgroundColor: palette.panel,
    borderWidth: 1,
    borderColor: palette.border
  },
  loaderCardInline: {
    marginTop: spacing.sm
  },
  loaderTitle: {
    color: palette.text,
    fontFamily: "serif",
    fontSize: 24
  },
  loaderSubtitle: {
    color: palette.textMuted,
    textAlign: "center",
    lineHeight: 22
  }
});
