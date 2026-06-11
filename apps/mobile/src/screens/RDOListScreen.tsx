import React, { useState, useCallback } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { rdoApi } from "../services/api";
import { useObraStore } from "../store/obraStore";
import { useSyncStore } from "../store/syncStore";
import { COLORS } from "../services/config";
import { RDOResumo } from "../types";

export function RDOListScreen({ navigation }: any) {
  const obra = useObraStore((s) => s.obra);
  const [rdos, setRdos] = useState<RDOResumo[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const pendingCount = useSyncStore((s) => s.pendingCount);

  const fetchRDOs = useCallback(async () => {
    setError("");
    try {
      const res = await rdoApi.list(obra?.id);
      setRdos(Array.isArray(res.data) ? res.data : []);
    } catch {
      setError("Sem conexão — não foi possível carregar os RDOs");
    } finally { setRefreshing(false); }
  }, [obra?.id]);

  useFocusEffect(useCallback(() => { fetchRDOs(); }, [fetchRDOs]));

  return (
    <View style={styles.container}>
      {pendingCount > 0 && (
        <View style={styles.syncBanner}>
          <Text style={styles.syncText}>📡 {pendingCount} registro(s) pendente(s) de sincronização</Text>
        </View>
      )}
      <View style={styles.obraBanner}>
        <Text style={styles.obraBannerText}>{obra ? `🏗️ ${obra.nome}` : "Selecione uma obra na aba Obras"}</Text>
      </View>
      <TouchableOpacity style={[styles.newButton, !obra && styles.newButtonDisabled]} disabled={!obra}
        onPress={() => navigation?.navigate("RDOForm")}>
        <Text style={styles.newButtonText}>+ Novo RDO</Text>
      </TouchableOpacity>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FlatList data={rdos} keyExtractor={(r) => r.id} renderItem={({ item }) => (
        <View style={styles.card}>
          <View style={styles.cardTop}>
            <Text style={styles.cardDate}>RDO Nº {item.numero} — {new Date(item.data).toLocaleDateString("pt-BR")}</Text>
            <Text style={[styles.statusBadge, item.status === "APROVADO" ? styles.aprovado : styles.rascunho]}>{item.status}</Text>
          </View>
          <Text style={styles.cardClima}>☀️ {item.climaManha || "—"} / {item.climaTarde || "—"}</Text>
          <Text style={styles.cardResp}>👷 {item.responsavel?.name || item.assinaturaNome || "—"}{!obra && item.obra ? ` · ${item.obra.nome}` : ""}</Text>
        </View>
      )} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchRDOs(); }} colors={[COLORS.orange]} />}
        contentContainerStyle={styles.list} ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListEmptyComponent={<Text style={styles.empty}>Nenhum RDO registrado{obra ? " nesta obra" : ""}.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.light },
  syncBanner: { backgroundColor: COLORS.warning, padding: 8 },
  syncText: { color: COLORS.dark, fontSize: 12, textAlign: "center", fontWeight: "600" },
  obraBanner: { backgroundColor: COLORS.dark, padding: 10, paddingHorizontal: 16 },
  obraBannerText: { color: COLORS.white, fontSize: 13, fontWeight: "600" },
  newButton: { backgroundColor: COLORS.orange, margin: 16, borderRadius: 10, padding: 14, alignItems: "center" },
  newButtonDisabled: { backgroundColor: COLORS.gray },
  newButtonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  error: { color: COLORS.danger, fontSize: 12, textAlign: "center", marginBottom: 8 },
  list: { padding: 16, paddingTop: 0 },
  empty: { textAlign: "center", color: COLORS.gray, marginTop: 30, fontSize: 13 },
  card: { backgroundColor: COLORS.white, borderRadius: 10, padding: 16, elevation: 1 },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardDate: { fontSize: 15, fontWeight: "700", color: COLORS.dark, flex: 1 },
  statusBadge: { fontSize: 10, fontWeight: "800", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, overflow: "hidden" },
  aprovado: { backgroundColor: "#DCFCE7", color: "#15803D" },
  rascunho: { backgroundColor: "#FEF3C7", color: "#B45309" },
  cardClima: { fontSize: 12, color: COLORS.gray, marginTop: 6 },
  cardResp: { fontSize: 12, color: COLORS.gray, marginTop: 2 },
});
