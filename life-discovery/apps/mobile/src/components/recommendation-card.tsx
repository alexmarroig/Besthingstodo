import { useMemo, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Recommendation } from "@life/shared-types";

import { sendFeedback } from "../api";
import { ExperiencePoster } from "./experience-poster";
import { useAgendaItems, useLocalActions, useSavedItems } from "../local-data";
import { useSession } from "../providers";
import { openRecommendationTarget } from "../recommendation-actions";
import { palette, spacing } from "../theme";

function formatPrice(value?: number | null) {
  if (value == null) return "faixa a confirmar";
  if (value === 0) return "gratis";
  return `R$ ${value}`;
}

function formatMoment(value?: string | null) {
  if (!value) return "quando fizer sentido";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

export function RecommendationCard({ item, compact = false }: { item: Recommendation; compact?: boolean }) {
  const router = useRouter();
  const session = useSession();
  const { data: savedItems = [] } = useSavedItems();
  const { data: agendaItems = [] } = useAgendaItems();
  const localActions = useLocalActions();
  const [status, setStatus] = useState<string>("");

  const isSaved = useMemo(() => savedItems.some((entry) => entry.id === item.id), [item.id, savedItems]);
  const isInAgenda = useMemo(() => agendaItems.some((entry) => entry.id === item.id), [agendaItems, item.id]);

  async function onSave() {
    await localActions.saveItem(item);
    setStatus("Salvo nos favoritos");
    await sendFeedback(session.token, {
      userId: session.userId,
      experienceId: item.id,
      feedbackType: "save",
      decision: "saved",
      reasonTags: ["mobile_saved"]
    });
  }

  async function onAgenda() {
    await localActions.addToAgenda(item);
    setStatus("Entrou na agenda");
    await sendFeedback(session.token, {
      userId: session.userId,
      experienceId: item.id,
      feedbackType: "save",
      decision: "saved",
      reasonTags: ["mobile_agenda"]
    });
  }

  async function onLike() {
    setStatus("Entrou nas melhores apostas");
    await sendFeedback(session.token, {
      userId: session.userId,
      experienceId: item.id,
      feedbackType: "like",
      decision: "accepted",
      reasonTags: ["mobile_like"],
      context: {
        distance_label: item.distance_label,
        weather_fit: item.weather_fit
      }
    });
  }

  async function onSkip() {
    setStatus("Saiu do radar por agora");
    await sendFeedback(session.token, {
      userId: session.userId,
      experienceId: item.id,
      feedbackType: "dislike",
      decision: "rejected",
      reasonTags: ["mobile_skip"]
    });
  }

  return (
    <LinearGradient colors={["rgba(16,31,51,0.98)", "rgba(8,17,30,0.98)"]} style={[styles.card, compact && styles.compactCard]}>
      <ExperiencePoster item={item} compact={compact} />

      <View style={styles.metaRow}>
        <Text style={styles.metaText}>{item.neighborhood || item.location || item.city}</Text>
        <Text style={styles.metaDot}>|</Text>
        <Text style={styles.metaText}>{formatMoment(item.start_time)}</Text>
      </View>

      <View style={styles.headlineBlock}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.description}>{item.description || item.reason}</Text>
      </View>

      <View style={styles.reasonCard}>
        <Text style={styles.reasonLabel}>Por que combina</Text>
        <Text style={styles.reasonText}>{item.couple_fit_reason || item.reason || "Boa aposta para hoje."}</Text>
        {item.weather_fit ? <Text style={styles.weatherText}>{item.weather_fit}</Text> : null}
      </View>

      <View style={styles.tagRow}>
        {(item.tags || []).slice(0, compact ? 3 : 4).map((tag) => (
          <View key={tag} style={styles.tag}>
            <Text style={styles.tagText}>{tag}</Text>
          </View>
        ))}
      </View>

      <View style={styles.footer}>
        <View>
          <Text style={styles.sourceText}>{item.editorial_source || item.source}</Text>
          <Text style={styles.priceText}>{formatPrice(item.price)}</Text>
        </View>
        {item.personalization_label ? <Text style={styles.personalizationText}>{item.personalization_label}</Text> : null}
      </View>

      {status ? <Text style={styles.statusText}>{status}</Text> : null}

      <View style={styles.primaryActionsRow}>
        <TouchableOpacity onPress={() => openRecommendationTarget(item)} style={styles.actionPrimary}>
          <Ionicons name="open-outline" size={18} color="#fff8f1" />
          <Text style={styles.actionPrimaryText}>{item.booking_url ? "Reservar" : "Abrir"}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onSave} style={[styles.actionSecondary, isSaved && styles.iconActionActive]}>
          <Ionicons name={isSaved ? "bookmark" : "bookmark-outline"} size={18} color={isSaved ? palette.accent : palette.text} />
          <Text style={[styles.actionSecondaryText, isSaved && styles.iconActionTextActive]}>Salvar</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onAgenda} style={[styles.actionSecondary, isInAgenda && styles.iconActionActive]}>
          <Ionicons name={isInAgenda ? "calendar" : "calendar-outline"} size={18} color={isInAgenda ? palette.accent : palette.text} />
          <Text style={[styles.actionSecondaryText, isInAgenda && styles.iconActionTextActive]}>Agenda</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.actionsRow}>
        <TouchableOpacity onPress={onLike} style={styles.iconAction}>
          <Ionicons name="heart-outline" size={18} color={palette.text} />
          <Text style={styles.iconActionText}>Curti</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push({ pathname: "/map", params: { focus: item.title } })} style={styles.iconAction}>
          <Ionicons name="map-outline" size={18} color={palette.text} />
          <Text style={styles.iconActionText}>Mapa</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onSkip} style={styles.iconAction}>
          <Ionicons name="close-outline" size={18} color={palette.text} />
          <Text style={styles.iconActionText}>Nao</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    gap: spacing.md
  },
  compactCard: {
    padding: spacing.md
  },
  headlineBlock: {
    gap: spacing.xs
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap"
  },
  metaText: {
    color: palette.textSoft,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1.1
  },
  metaDot: {
    color: palette.textSoft
  },
  title: {
    color: palette.text,
    fontFamily: "serif",
    fontSize: 25,
    lineHeight: 29
  },
  description: {
    color: palette.textMuted,
    lineHeight: 22
  },
  reasonCard: {
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.05)",
    padding: spacing.md,
    gap: spacing.sm
  },
  reasonLabel: {
    color: palette.accent,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1.3
  },
  reasonText: {
    color: palette.text,
    lineHeight: 22
  },
  weatherText: {
    color: palette.textMuted,
    lineHeight: 20
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  tag: {
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999
  },
  tagText: {
    color: palette.textMuted,
    fontSize: 12
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: spacing.md
  },
  sourceText: {
    color: palette.textSoft,
    textTransform: "capitalize"
  },
  priceText: {
    color: palette.text,
    marginTop: 4
  },
  personalizationText: {
    color: palette.accent,
    fontSize: 12,
    textAlign: "right",
    maxWidth: 120
  },
  statusText: {
    color: palette.accent,
    fontSize: 12
  },
  primaryActionsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    flexWrap: "wrap"
  },
  actionPrimary: {
    flex: 1,
    minWidth: 130,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: palette.primary,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 14
  },
  actionPrimaryText: {
    color: "#fff8f1",
    fontWeight: "600"
  },
  actionSecondary: {
    minWidth: 104,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 14
  },
  actionSecondaryText: {
    color: palette.textMuted,
    fontSize: 12,
    fontWeight: "600"
  },
  actionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  iconAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.05)"
  },
  iconActionActive: {
    backgroundColor: "rgba(244,208,111,0.12)",
    borderWidth: 1,
    borderColor: "rgba(244,208,111,0.22)"
  },
  iconActionText: {
    color: palette.textMuted,
    fontSize: 12
  },
  iconActionTextActive: {
    color: palette.accent
  }
});
