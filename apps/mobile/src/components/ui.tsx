import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { COLORS } from "../services/config";
import { ObraAtiva } from "../store/obraStore";

/** Faixa escura com a obra ativa — contexto padrão no topo das telas. */
export function ObraBanner({ obra }: { obra: ObraAtiva | null }) {
  return (
    <View style={s.banner}>
      <Text style={s.bannerText} numberOfLines={1}>
        {obra ? `🏗️ ${obra.codigo} — ${obra.nome}` : "⚠️ Selecione uma obra na aba Obras"}
      </Text>
    </View>
  );
}

export function EmptyState({ icon, title, subtitle }: { icon: string; title: string; subtitle?: string }) {
  return (
    <View style={s.empty}>
      <Text style={s.emptyIcon}>{icon}</Text>
      <Text style={s.emptyTitle}>{title}</Text>
      {subtitle ? <Text style={s.emptySubtitle}>{subtitle}</Text> : null}
    </View>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  if (!message) return null;
  return (
    <View style={s.error}>
      <Text style={s.errorText}>{message}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  banner: { backgroundColor: COLORS.dark, padding: 10, paddingHorizontal: 16 },
  bannerText: { color: COLORS.white, fontSize: 13, fontWeight: "600" },
  empty: { alignItems: "center", marginTop: 48, paddingHorizontal: 32 },
  emptyIcon: { fontSize: 40 },
  emptyTitle: { fontSize: 15, fontWeight: "700", color: COLORS.dark, marginTop: 12, textAlign: "center" },
  emptySubtitle: { fontSize: 13, color: COLORS.gray, marginTop: 4, textAlign: "center", lineHeight: 18 },
  error: { backgroundColor: "#FEE2E2", padding: 8, paddingHorizontal: 16 },
  errorText: { color: COLORS.danger, fontSize: 12, textAlign: "center", fontWeight: "600" },
});
