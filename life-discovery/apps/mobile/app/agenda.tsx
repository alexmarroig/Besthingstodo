import { useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import { EmptyStateCard } from "../src/components/empty-state-card";
import { ExperiencePoster } from "../src/components/experience-poster";
import { MobileShell } from "../src/components/shell";
import { useAgendaItems, useLocalActions } from "../src/local-data";
import { openRecommendationTarget } from "../src/recommendation-actions";
import { palette, spacing } from "../src/theme";

export default function AgendaScreen() {
  const { data: items = [] } = useAgendaItems();
  const actions = useLocalActions();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const byDate = items.reduce<Record<string, typeof items>>((acc, item) => {
    const key = item.date || "Sem data";
    acc[key] = acc[key] || [];
    acc[key].push(item);
    return acc;
  }, {});

  return (
    <MobileShell
      title="Agenda"
      eyebrow="Local planning"
      subtitle="Os itens agendados viram uma linha do tempo simples para o casal consultar e limpar no celular."
    >
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {Object.keys(byDate).length === 0 ? (
          <EmptyStateCard
            icon="calendar-outline"
            title="Agenda vazia"
            body="Use o botao Agenda nas recomendacoes para transformar boas ideias em plano consultavel."
          />
        ) : null}

        {Object.entries(byDate).map(([date, list]) => (
          <View key={date} style={styles.dateCard}>
            <Text style={styles.dateTitle}>{date}</Text>
            {list.map((item) => (
              <View key={item.id} style={styles.itemCard}>
                <ExperiencePoster item={item} compact height={136} />
                <Text style={styles.itemTitle}>{item.title}</Text>
                <Text style={styles.itemMeta}>{item.location || item.city}</Text>
                {editingId === item.id ? (
                  <View style={styles.noteWrap}>
                    <TextInput
                      value={note}
                      onChangeText={setNote}
                      placeholder="Adicionar observacao"
                      placeholderTextColor={palette.textSoft}
                      style={styles.input}
                    />
                    <TouchableOpacity
                      onPress={async () => {
                        await actions.setAgendaNote(item.id, note);
                        setEditingId(null);
                        setNote("");
                      }}
                      style={styles.secondaryButton}
                    >
                      <Text style={styles.secondaryText}>Salvar nota</Text>
                    </TouchableOpacity>
                  </View>
                ) : item.note ? (
                  <Text style={styles.noteText}>{item.note}</Text>
                ) : null}
                <View style={styles.buttonRow}>
                  <TouchableOpacity onPress={() => openRecommendationTarget(item)} style={styles.primaryButton}>
                    <Text style={styles.primaryText}>Abrir</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      setEditingId(item.id);
                      setNote(item.note || "");
                    }}
                    style={styles.secondaryButton}
                  >
                    <Text style={styles.secondaryText}>Nota</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => actions.removeAgenda(item.id)} style={styles.ghostButton}>
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
  dateCard: {
    backgroundColor: palette.panel,
    borderRadius: 24,
    padding: spacing.lg,
    gap: spacing.md
  },
  dateTitle: {
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
  itemTitle: {
    color: palette.text,
    fontSize: 16
  },
  itemMeta: {
    color: palette.textSoft,
    fontSize: 12
  },
  noteText: {
    color: palette.textMuted,
    lineHeight: 20
  },
  noteWrap: {
    gap: spacing.sm
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 16,
    color: palette.text,
    paddingHorizontal: 14,
    paddingVertical: 12
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
