import { useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import { EmptyStateCard } from "../src/components/empty-state-card";
import { ExperiencePoster } from "../src/components/experience-poster";
import { MobileShell } from "../src/components/shell";
import { useLocalActions, useSavedItems } from "../src/local-data";
import { openRecommendationTarget } from "../src/recommendation-actions";
import { palette, spacing } from "../src/theme";

export default function SavedScreen() {
  const { data: items = [] } = useSavedItems();
  const actions = useLocalActions();
  const [collection, setCollection] = useState("Favoritos");

  const grouped = items.reduce<Record<string, typeof items>>((acc, item) => {
    const key = item.collection || "Favoritos";
    acc[key] = acc[key] || [];
    acc[key].push(item);
    return acc;
  }, {});

  return (
    <MobileShell
      title="Favoritos"
      eyebrow="Local collections"
      subtitle="Tudo o que voce salvou no celular, com organizacao em colecoes para revisitar depois."
    >
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.inputCard}>
          <Text style={styles.inputLabel}>Colecao ativa</Text>
          <TextInput value={collection} onChangeText={setCollection} style={styles.input} placeholder="Nome da colecao" placeholderTextColor={palette.textSoft} />
        </View>

        {Object.keys(grouped).length === 0 ? (
          <EmptyStateCard
            icon="bookmark-outline"
            title="Nada salvo ainda"
            body="Quando voce salvar recomendacoes no feed, elas vao aparecer aqui para compor a biblioteca do casal."
          />
        ) : null}

        {Object.entries(grouped).map(([name, list]) => (
          <View key={name} style={styles.groupCard}>
            <Text style={styles.groupTitle}>{name}</Text>
            {list.map((item) => (
              <View key={item.id} style={styles.itemCard}>
                <ExperiencePoster item={item} compact height={132} />
                <View style={styles.itemBody}>
                  <Text style={styles.itemTitle}>{item.title}</Text>
                  <Text style={styles.itemMeta}>
                    {item.category} - {item.neighborhood || item.location}
                  </Text>
                </View>
                <View style={styles.buttonRow}>
                  <TouchableOpacity onPress={() => openRecommendationTarget(item)} style={styles.primaryButton}>
                    <Text style={styles.primaryText}>Abrir</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => actions.moveSaved(item.id, collection)} style={styles.secondaryButton}>
                    <Text style={styles.secondaryText}>Mover</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => actions.removeSaved(item.id)} style={styles.ghostButton}>
                    <Text style={styles.ghostText}>Remover</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        ))}
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
  inputCard: {
    backgroundColor: palette.panel,
    borderRadius: 24,
    padding: spacing.lg,
    gap: spacing.sm
  },
  inputLabel: {
    color: palette.accent,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1.4
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 18,
    color: palette.text,
    paddingHorizontal: 16,
    paddingVertical: 14
  },
  groupCard: {
    backgroundColor: palette.panel,
    borderRadius: 24,
    padding: spacing.lg,
    gap: spacing.sm
  },
  groupTitle: {
    color: palette.text,
    fontFamily: "serif",
    fontSize: 24
  },
  itemCard: {
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.06)",
    paddingTop: spacing.md,
    gap: spacing.sm
  },
  itemBody: {
    gap: 4
  },
  itemTitle: {
    color: palette.text,
    fontSize: 16
  },
  itemMeta: {
    color: palette.textSoft,
    fontSize: 12
  },
  buttonRow: {
    flexDirection: "row",
    gap: spacing.sm
  },
  primaryButton: {
    backgroundColor: palette.primary,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  primaryText: {
    color: "#fff8f1",
    fontWeight: "600"
  },
  secondaryButton: {
    backgroundColor: "rgba(244,208,111,0.12)",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  secondaryText: {
    color: palette.accent
  },
  ghostButton: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  ghostText: {
    color: palette.textMuted
  }
});
