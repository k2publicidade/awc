import React, { useState, useEffect, useCallback } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, Alert } from "react-native";
import { useAuthStore } from "../store/authStore";
import { useObraStore } from "../store/obraStore";
import { useSyncStore } from "../store/syncStore";
import { obrasApi } from "../services/api";
import { COLORS } from "../services/config";
import { Obra } from "../types";

const statusColors: Record<string, string> = {
  EM_ANDAMENTO: COLORS.info, CONCLUIDO: COLORS.success, PAUSADO: COLORS.warning,
  PLANEJAMENTO: COLORS.gray, CANCELADO: COLORS.danger,
};

const statusLabels: Record<string, string> = {
  EM_ANDAMENTO: "Em andamento", CONCLUIDO: "Concluído", PAUSADO: "Pausado",
  PLANEJAMENTO: "Planejamento", CANCELADO: "Cancelado",
};

export function DashboardScreen({ navigation }: any) {
  const [obras, setObras] = useState<Obra[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { obra: obraAtiva, setObra } = useObraStore();
  const pendingCount = useSyncStore((s) => s.pendingCount);

  const fetchObras = useCallback(async () => {
    setError("");
    try {
      const res = await obrasApi.list();
      setObras(Array.isArray(res.data) ? res.data : []);
    } catch (e: any) {
      setError(e.response?.data?.error || "Sem conexão — exibindo dados locais");
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchObras(); }, [fetchObras]);

  const selecionarObra = async (item: Obra) => {
    await setObra({ id: item.id, nome: item.nome, codigo: item.codigo });
    navigation?.navigate("RDO");
  };

  const confirmLogout = () => {
    Alert.alert("Sair", "Deseja encerrar a sessão?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Sair", style: "destructive", onPress: () => logout() },
    ]);
  };

  const renderItem = ({ item }: { item: Obra }) => {
    const ativa = obraAtiva?.id === item.id;
    const pct = item.avancoRealizado || 0;
    return (
      <TouchableOpacity style={[styles.card, ativa && styles.cardAtiva]} onPress={() => selecionarObra(item)}>
        <View style={[styles.statusBar, { backgroundColor: statusColors[item.status] || COLORS.gray }]} />
        <View style={styles.cardContent}>
          <View style={styles.cardTop}>
            <Text style={styles.obraNome}>{item.nome}</Text>
            {ativa && <Text style={styles.ativaBadge}>ATIVA</Text>}
          </View>
          <Text style={styles.obraCodigo}>{item.codigo}{item.cidade ? ` · ${item.cidade}` : ""}</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${Math.min(pct, 100)}%` }, item.semaforo === "vermelho" && { backgroundColor: COLORS.danger }]} />
          </View>
          <View style={styles.cardFooter}>
            <Text style={styles.percentText}>{pct.toFixed(0)}%</Text>
            <Text style={styles.obraStatus}>{statusLabels[item.status] || item.status}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.greeting}>Olá, {user?.name?.split(" ")[0] || "Encarregado"}</Text>
          <Text style={styles.obrasCount}>
            {obraAtiva ? `Obra ativa: ${obraAtiva.nome}` : "Toque em uma obra para ativá-la"}
          </Text>
        </View>
        <TouchableOpacity onPress={confirmLogout}><Text style={styles.logout}>Sair</Text></TouchableOpacity>
      </View>

      {pendingCount > 0 && (
        <View style={styles.syncBanner}>
          <Text style={styles.syncText}>📡 {pendingCount} registro(s) aguardando sincronização</Text>
        </View>
      )}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FlatList data={obras} keyExtractor={(o) => o.id} renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchObras(); }} colors={[COLORS.orange]} />}
        contentContainerStyle={styles.list} ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        ListEmptyComponent={<Text style={styles.empty}>Nenhuma obra encontrada. Arraste para atualizar.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.light },
  header: { backgroundColor: COLORS.dark, padding: 20, paddingTop: 12, flexDirection: "row", alignItems: "center" },
  greeting: { color: COLORS.white, fontSize: 20, fontWeight: "700" },
  obrasCount: { color: COLORS.orange, fontSize: 12, marginTop: 4 },
  logout: { color: "#ffffff99", fontSize: 13, fontWeight: "600", padding: 8 },
  syncBanner: { backgroundColor: COLORS.warning, padding: 8 },
  syncText: { color: COLORS.dark, fontSize: 12, textAlign: "center", fontWeight: "600" },
  error: { color: COLORS.danger, fontSize: 12, textAlign: "center", padding: 8 },
  list: { padding: 16 },
  empty: { textAlign: "center", color: COLORS.gray, marginTop: 40, fontSize: 14 },
  card: { backgroundColor: COLORS.white, borderRadius: 12, overflow: "hidden", elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3 },
  cardAtiva: { borderWidth: 2, borderColor: COLORS.orange },
  statusBar: { height: 4 },
  cardContent: { padding: 16 },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  obraNome: { fontSize: 16, fontWeight: "700", color: COLORS.dark, flex: 1 },
  ativaBadge: { color: COLORS.orange, fontSize: 10, fontWeight: "800", borderWidth: 1, borderColor: COLORS.orange, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  obraCodigo: { fontSize: 12, color: COLORS.gray, marginTop: 2 },
  progressBar: { height: 6, backgroundColor: "#E5E7EB", borderRadius: 3, marginTop: 12, overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: COLORS.orange, borderRadius: 3 },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  percentText: { fontSize: 14, fontWeight: "700", color: COLORS.orange },
  obraStatus: { fontSize: 11, color: COLORS.gray, backgroundColor: COLORS.light, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, overflow: "hidden" },
});
