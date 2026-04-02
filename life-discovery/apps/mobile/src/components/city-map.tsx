import { useMemo, useState } from "react";
import { Linking, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Recommendation } from "@life/shared-types";

import { palette, spacing } from "../theme";

type FilterKey = "covered" | "nearby" | "romantic" | "free";

function normalizeText(value: string) {
  return value.toLowerCase();
}

function matchesRomantic(item: Recommendation) {
  return normalizeText(item.couple_fit_reason || "").includes("encontro") || normalizeText(item.title).includes("date");
}

function withFallbackCoordinates(items: Recommendation[]) {
  return items.map((item, index) => ({
    ...item,
    latitude: item.latitude ?? -23.5489 + (index % 5) * 0.012,
    longitude: item.longitude ?? -46.6388 + Math.floor(index / 5) * 0.016
  }));
}

async function openRoute(item: Recommendation) {
  const query = encodeURIComponent(`${item.location || item.title}, ${item.city}`);
  await Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`);
}

export function CityMap({
  items,
  focusTitle
}: {
  items: Recommendation[];
  focusTitle?: string;
}) {
  const [activeFilters, setActiveFilters] = useState<FilterKey[]>([]);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (activeFilters.includes("covered") && item.indoor_outdoor === "outdoor") return false;
      if (activeFilters.includes("nearby") && item.distance_label === "vale a travessia") return false;
      if (activeFilters.includes("romantic") && !matchesRomantic(item)) return false;
      if (activeFilters.includes("free") && (item.price || 0) > 0) return false;
      return true;
    });
  }, [activeFilters, items]);

  const normalized = useMemo(() => withFallbackCoordinates(filtered), [filtered]);

  const points = useMemo(() => {
    if (!normalized.length) return [];
    const lats = normalized.map((item) => item.latitude || -23.5489);
    const lons = normalized.map((item) => item.longitude || -46.6388);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLon = Math.min(...lons);
    const maxLon = Math.max(...lons);

    return normalized.map((item) => {
      const lat = item.latitude || -23.5489;
      const lon = item.longitude || -46.6388;
      const x = ((lon - minLon) / Math.max(0.0001, maxLon - minLon)) * 78 + 8;
      const y = (1 - (lat - minLat) / Math.max(0.0001, maxLat - minLat)) * 64 + 10;
      return { item, x, y };
    });
  }, [normalized]);

  const initialSelected = useMemo(() => {
    if (focusTitle) {
      return normalized.find((item) => item.title.toLowerCase() === focusTitle.toLowerCase()) || normalized[0] || null;
    }
    return normalized[0] || null;
  }, [focusTitle, normalized]);

  const [selectedId, setSelectedId] = useState<string | null>(initialSelected?.id || null);
  const selected = normalized.find((item) => item.id === selectedId) || initialSelected;

  const grouped = useMemo(() => {
    return normalized.reduce<Record<string, Recommendation[]>>((acc, item) => {
      const key = item.neighborhood || item.location || item.city;
      acc[key] = acc[key] || [];
      acc[key].push(item);
      return acc;
    }, {});
  }, [normalized]);

  const toggleFilter = (value: FilterKey) => {
    setActiveFilters((prev) => (prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]));
  };

  return (
    <View style={styles.root}>
      <View style={styles.filterRow}>
        {[
          { key: "covered" as const, label: "mais coberto" },
          { key: "nearby" as const, label: "mais perto" },
          { key: "romantic" as const, label: "mais date" },
          { key: "free" as const, label: "baixo custo" }
        ].map((filter) => (
          <TouchableOpacity
            key={filter.key}
            onPress={() => toggleFilter(filter.key)}
            style={[styles.filterChip, activeFilters.includes(filter.key) && styles.filterChipActive]}
          >
            <Text style={[styles.filterText, activeFilters.includes(filter.key) && styles.filterTextActive]}>{filter.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.canvas}>
        <View style={styles.gridLineHorizontalTop} />
        <View style={styles.gridLineHorizontalBottom} />
        <View style={styles.gridLineVerticalLeft} />
        <View style={styles.gridLineVerticalRight} />

        {points.map(({ item, x, y }) => {
          const active = selected?.id === item.id;
          return (
            <TouchableOpacity
              key={item.id}
              onPress={() => setSelectedId(item.id)}
              style={[
                styles.marker,
                {
                  left: `${x}%`,
                  top: `${y}%`
                },
                active && styles.markerActive
              ]}
            >
              <Text style={styles.markerLabel}>{item.neighborhood || "SP"}</Text>
            </TouchableOpacity>
          );
        })}

        <View style={styles.mapLegend}>
          <Text style={styles.mapLegendTitle}>Leitura espacial</Text>
          <Text style={styles.mapLegendBody}>Bairros, distancias e densidade de opcoes num canvas mobile mais leve que um mapa tradicional.</Text>
        </View>
      </View>

      {selected ? (
        <View style={styles.selectedCard}>
          <Text style={styles.selectedEyebrow}>{selected.neighborhood || selected.location}</Text>
          <Text style={styles.selectedTitle}>{selected.title}</Text>
          <Text style={styles.selectedBody}>{selected.couple_fit_reason || selected.description}</Text>
          <View style={styles.selectedRow}>
            <Text style={styles.selectedMeta}>{selected.distance_label || "boa logistica"}</Text>
            <Text style={styles.selectedMeta}>{selected.price === 0 ? "gratis" : selected.price ? `R$ ${selected.price}` : "faixa livre"}</Text>
          </View>
          <TouchableOpacity onPress={() => openRoute(selected)} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Abrir rota</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={styles.groupList}>
        {Object.entries(grouped).map(([name, list]) => (
          <View key={name} style={styles.groupCard}>
            <Text style={styles.groupTitle}>{name}</Text>
            <Text style={styles.groupSubtitle}>{list.length} boas apostas por aqui</Text>
            {list.slice(0, 3).map((item) => (
              <TouchableOpacity key={item.id} onPress={() => setSelectedId(item.id)} style={styles.groupItem}>
                <View style={styles.groupItemBody}>
                  <Text style={styles.groupItemTitle}>{item.title}</Text>
                  <Text style={styles.groupItemMeta}>{item.distance_label || "deslocamento simples"}</Text>
                </View>
                <Text style={styles.groupItemPrice}>{item.price === 0 ? "gratis" : item.price ? `R$ ${item.price}` : "..."}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: spacing.md
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  filterChip: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "rgba(255,255,255,0.05)"
  },
  filterChipActive: {
    backgroundColor: palette.primary
  },
  filterText: {
    color: palette.textMuted,
    fontSize: 12
  },
  filterTextActive: {
    color: "#fff8f1"
  },
  canvas: {
    height: 280,
    borderRadius: 28,
    overflow: "hidden",
    backgroundColor: "rgba(13,24,39,0.95)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)"
  },
  gridLineHorizontalTop: {
    position: "absolute",
    left: 0,
    right: 0,
    top: "34%",
    height: 1,
    backgroundColor: "rgba(255,255,255,0.06)"
  },
  gridLineHorizontalBottom: {
    position: "absolute",
    left: 0,
    right: 0,
    top: "68%",
    height: 1,
    backgroundColor: "rgba(255,255,255,0.06)"
  },
  gridLineVerticalLeft: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: "33%",
    width: 1,
    backgroundColor: "rgba(255,255,255,0.06)"
  },
  gridLineVerticalRight: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: "66%",
    width: 1,
    backgroundColor: "rgba(255,255,255,0.06)"
  },
  marker: {
    position: "absolute",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "rgba(244,208,111,0.18)",
    borderWidth: 1,
    borderColor: "rgba(244,208,111,0.22)",
    transform: [{ translateX: -28 }, { translateY: -18 }]
  },
  markerActive: {
    backgroundColor: palette.primary,
    borderColor: "rgba(255,255,255,0.2)"
  },
  markerLabel: {
    color: palette.text,
    fontSize: 11
  },
  mapLegend: {
    position: "absolute",
    left: 18,
    right: 18,
    bottom: 18,
    padding: spacing.md,
    borderRadius: 20,
    backgroundColor: "rgba(6,17,29,0.84)"
  },
  mapLegendTitle: {
    color: palette.accent,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1.4
  },
  mapLegendBody: {
    color: palette.textMuted,
    marginTop: 6,
    lineHeight: 20
  },
  selectedCard: {
    backgroundColor: palette.panel,
    borderRadius: 24,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    gap: spacing.sm
  },
  selectedEyebrow: {
    color: palette.accent,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1.5
  },
  selectedTitle: {
    color: palette.text,
    fontFamily: "serif",
    fontSize: 26
  },
  selectedBody: {
    color: palette.textMuted,
    lineHeight: 22
  },
  selectedRow: {
    flexDirection: "row",
    justifyContent: "space-between"
  },
  selectedMeta: {
    color: palette.textSoft
  },
  primaryButton: {
    marginTop: spacing.sm,
    backgroundColor: palette.primary,
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center"
  },
  primaryButtonText: {
    color: "#fff8f1",
    fontWeight: "600"
  },
  groupList: {
    gap: spacing.md
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
  groupSubtitle: {
    color: palette.textMuted
  },
  groupItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.06)"
  },
  groupItemBody: {
    flex: 1,
    paddingRight: 12
  },
  groupItemTitle: {
    color: palette.text,
    fontSize: 15
  },
  groupItemMeta: {
    color: palette.textSoft,
    marginTop: 4,
    fontSize: 12
  },
  groupItemPrice: {
    color: palette.accent
  }
});
