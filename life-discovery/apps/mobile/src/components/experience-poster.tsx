import { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { ImageBackground, StyleSheet, Text, View } from "react-native";
import { Recommendation } from "@life/shared-types";

import { palette, spacing } from "../theme";

type PosterPreset = {
  colors: [string, string, string];
  accent: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
};

function getPreset(item: Recommendation): PosterPreset {
  if (item.domain === "dining_out") {
    return {
      colors: ["#5d1f17", "#a43f2a", "#f4b26f"],
      accent: "#ffe1b6",
      icon: "restaurant-outline",
      label: "Gastronomia"
    };
  }

  if (item.domain === "movies_series") {
    return {
      colors: ["#0c2347", "#184d8f", "#69aef7"],
      accent: "#d8ecff",
      icon: "film-outline",
      label: "Watch"
    };
  }

  if (item.domain === "delivery") {
    return {
      colors: ["#21301e", "#3d6640", "#8ac087"],
      accent: "#e8ffe1",
      icon: "bag-handle-outline",
      label: "Em casa"
    };
  }

  return {
    colors: ["#1a2236", "#31476b", "#9ebcd7"],
    accent: "#eef6ff",
    icon: "sparkles-outline",
    label: "Curadoria"
  };
}

function formatCategory(item: Recommendation) {
  return (item.category || item.domain || "evento").replace(/_/g, " ");
}

export function ExperiencePoster({
  item,
  compact = false,
  height
}: {
  item: Recommendation;
  compact?: boolean;
  height?: number;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const preset = getPreset(item);
  const posterHeight = height || (compact ? 158 : 214);
  const title = item.neighborhood || item.location || item.city;
  const strapline = item.personalization_label || item.editorial_source || item.source || preset.label;

  useEffect(() => {
    setImageFailed(false);
  }, [item.image_url]);

  const content = (
    <LinearGradient colors={["rgba(7,17,29,0.08)", "rgba(7,17,29,0.72)", "rgba(7,17,29,0.96)"]} style={styles.overlay}>
      <View style={styles.topRow}>
        <View style={[styles.labelPill, { backgroundColor: `${preset.accent}22` }]}>
          <Ionicons name={preset.icon} size={13} color={preset.accent} />
          <Text style={[styles.labelPillText, { color: preset.accent }]}>{preset.label}</Text>
        </View>
        {item.quality_score ? (
          <View style={styles.scorePill}>
            <Text style={styles.scoreText}>{Math.round(item.quality_score)}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.bottomBlock}>
        <Text style={styles.posterEyebrow}>{strapline}</Text>
        <Text style={styles.posterTitle}>{title}</Text>
        <Text style={styles.posterMeta}>{formatCategory(item)}</Text>
      </View>
    </LinearGradient>
  );

  if (item.image_url && !imageFailed) {
    return (
      <ImageBackground
        source={{ uri: item.image_url }}
        style={[styles.root, { height: posterHeight }]}
        imageStyle={styles.image}
        onError={() => setImageFailed(true)}
      >
        {content}
      </ImageBackground>
    );
  }

  return (
    <LinearGradient colors={preset.colors} style={[styles.root, { height: posterHeight }]}>
      <View style={[styles.orb, styles.orbOne, { backgroundColor: `${preset.accent}2a` }]} />
      <View style={[styles.orb, styles.orbTwo, { backgroundColor: "rgba(255,255,255,0.14)" }]} />
      <View style={styles.gridLines} />
      {content}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: {
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)"
  },
  image: {
    borderRadius: 24
  },
  overlay: {
    flex: 1,
    justifyContent: "space-between",
    padding: spacing.md
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing.sm
  },
  labelPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7
  },
  labelPillText: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1.1
  },
  scorePill: {
    minWidth: 40,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: "rgba(245,239,228,0.16)",
    alignItems: "center"
  },
  scoreText: {
    color: palette.text,
    fontSize: 12,
    fontWeight: "700"
  },
  bottomBlock: {
    gap: 4
  },
  posterEyebrow: {
    color: "rgba(245,239,228,0.74)",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1.4
  },
  posterTitle: {
    color: "#fffaf2",
    fontFamily: "serif",
    fontSize: 28,
    lineHeight: 31,
    maxWidth: "88%"
  },
  posterMeta: {
    color: "rgba(245,239,228,0.8)",
    fontSize: 13
  },
  orb: {
    position: "absolute",
    borderRadius: 999
  },
  orbOne: {
    width: 170,
    height: 170,
    top: -35,
    right: -20
  },
  orbTwo: {
    width: 130,
    height: 130,
    bottom: -18,
    left: -28
  },
  gridLines: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)"
  }
});
