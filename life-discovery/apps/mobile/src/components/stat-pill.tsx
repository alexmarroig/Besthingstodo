import { StyleSheet, Text, View } from "react-native";

import { palette } from "../theme";

export function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.root}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 94
  },
  label: {
    color: palette.textSoft,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1.2
  },
  value: {
    color: palette.text,
    fontSize: 14,
    marginTop: 4
  }
});
