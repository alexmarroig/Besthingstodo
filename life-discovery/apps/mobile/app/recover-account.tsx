import { useState } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "expo-router";

import { requestAccountRecovery } from "../src/api";
import { MobileShell } from "../src/components/shell";
import { palette, spacing } from "../src/theme";

export default function RecoverAccountScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("Digite o email da conta compartilhada para iniciar a recuperacao.");

  const recoveryMutation = useMutation({
    mutationFn: () => requestAccountRecovery(email),
    onSuccess: (result) => setStatus(result.message),
    onError: () => setStatus("Nao consegui iniciar a recuperacao agora. O ideal e tentar de novo com a API ligada.")
  });

  return (
    <MobileShell
      title="Recuperar conta"
      eyebrow="Access recovery"
      subtitle="Um fluxo curto para retomar a conta sem confundir o usuario entre login, onboarding e preferencias locais."
    >
      <View style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Receber orientacao de acesso</Text>
          <Text style={styles.bodyText}>
            Quando existir endpoint de recuperacao na stack, o app tenta disparar o processo automaticamente. Se ainda nao existir,
            ele informa isso claramente em vez de fingir que enviou um email.
          </Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="Email da conta"
            placeholderTextColor={palette.textSoft}
            style={styles.input}
          />
          <TouchableOpacity
            disabled={!email.trim() || recoveryMutation.isPending}
            onPress={() => recoveryMutation.mutate()}
            style={[styles.primaryButton, (!email.trim() || recoveryMutation.isPending) && styles.disabledButton]}
          >
            <Text style={styles.primaryButtonText}>{recoveryMutation.isPending ? "Verificando..." : "Iniciar recuperacao"}</Text>
          </TouchableOpacity>
          <Text style={styles.statusText}>{status}</Text>
        </View>

        <TouchableOpacity onPress={() => router.back()} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>Voltar para a conta</Text>
        </TouchableOpacity>
      </View>
    </MobileShell>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg
  },
  card: {
    backgroundColor: palette.panel,
    borderRadius: 24,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: palette.border
  },
  cardTitle: {
    color: palette.text,
    fontFamily: "serif",
    fontSize: 28
  },
  bodyText: {
    color: palette.textMuted,
    lineHeight: 22
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 18,
    color: palette.text,
    paddingHorizontal: 16,
    paddingVertical: 14
  },
  primaryButton: {
    backgroundColor: palette.primary,
    borderRadius: 999,
    alignItems: "center",
    paddingVertical: 14
  },
  primaryButtonText: {
    color: "#fff8f1",
    fontWeight: "600"
  },
  statusText: {
    color: palette.textMuted,
    lineHeight: 22
  },
  secondaryButton: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(244,208,111,0.12)",
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  secondaryButtonText: {
    color: palette.accent,
    fontWeight: "600"
  },
  disabledButton: {
    opacity: 0.5
  }
});
