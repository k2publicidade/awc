import React, { useState, useCallback } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { notificacoesApi } from "../services/api";
import { COLORS } from "../services/config";
import { EmptyState, ErrorBanner } from "../components/ui";
import { Notificacao } from "../types";

// Tons por tipo de alerta gerado pelo sistema (ETAPA_ATRASADA, DOCUMENTO_VENCENDO...)
function tipoColor(tipo: string) {
  if (/ATRASADA|ACIDENTE|CRITICA/.test(tipo)) return COLORS.danger;
  if (/VENCENDO|ESTOQUE|ORCAMENTO/.test(tipo)) return COLORS.warning;
  return COLORS.info;
}

export function NotificacaoScreen() {
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const fetchNotificacoes = useCallback(async () => {
    setError("");
    try {
      const res = await notificacoesApi.list();
      setNotificacoes(res.data?.notificacoes || []);
    } catch {
      setError("Sem conexão — não foi possível carregar as notificações");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchNotificacoes(); }, [fetchNotificacoes]));

  const markRead = async (n: Notificacao) => {
    if (n.lida) return;
    setNotificacoes((prev) => prev.map((x) => (x.id === n.id ? { ...x, lida: true } : x)));
    try {
      await notificacoesApi.markRead(n.id);
    } catch {
      setNotificacoes((prev) => prev.map((x) => (x.id === n.id ? { ...x, lida: false } : x)));
    }
  };

  const markAll = async () => {
    const pendentes = notificacoes.filter((n) => !n.lida);
    setNotificacoes((prev) => prev.map((x) => ({ ...x, lida: true })));
    await Promise.all(pendentes.map((n) => notificacoesApi.markRead(n.id).catch(() => {})));
    fetchNotificacoes();
  };

  const naoLidas = notificacoes.filter((n) => !n.lida).length;

  const renderItem = ({ item }: { item: Notificacao }) => (
    <TouchableOpacity style={[styles.card, !item.lida && styles.cardUnread]} onPress={() => markRead(item)} activeOpacity={item.lida ? 1 : 0.6}>
      <View style={styles.cardHeader}>
        <View style={[styles.tipoDot, { backgroundColor: tipoColor(item.tipo) }]} />
        <Text style={[styles.cardTitle, item.lida && styles.cardTitleRead]}>{item.titulo}</Text>
        {!item.lida && <View style={styles.unreadDot} />}
      </View>
      <Text style={styles.cardMsg}>{item.mensagem}</Text>
      <Text style={styles.cardDate}>
        {new Date(item.createdAt).toLocaleDateString("pt-BR")} {new Date(item.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notificações</Text>
        {naoLidas > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{naoLidas}</Text></View>}
        {naoLidas > 0 && (
          <TouchableOpacity style={styles.markAllBtn} onPress={markAll}>
            <Text style={styles.markAllText}>Marcar todas</Text>
          </TouchableOpacity>
        )}
      </View>
      <ErrorBanner message={error} />
      {loading ? (
        <ActivityIndicator size="large" color={COLORS.orange} style={{ marginTop: 40 }} />
      ) : (
        <FlatList data={notificacoes} keyExtractor={(n) => n.id} renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchNotificacoes(); }} colors={[COLORS.orange]} />}
          contentContainerStyle={styles.list} ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          ListEmptyComponent={<EmptyState icon="🔔" title="Nenhuma notificação" subtitle="Os alertas automáticos do sistema aparecerão aqui." />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.light },
  header: { flexDirection: "row", alignItems: "center", padding: 16, backgroundColor: COLORS.white, gap: 8 },
  headerTitle: { fontSize: 20, fontWeight: "700", color: COLORS.dark },
  badge: { backgroundColor: COLORS.danger, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  markAllBtn: { marginLeft: "auto", borderWidth: 1, borderColor: COLORS.orange, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  markAllText: { color: COLORS.orange, fontSize: 12, fontWeight: "700" },
  list: { padding: 16, flexGrow: 1 },
  card: { backgroundColor: COLORS.white, borderRadius: 10, padding: 14 },
  cardUnread: { borderLeftWidth: 3, borderLeftColor: COLORS.orange },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  tipoDot: { width: 8, height: 8, borderRadius: 4 },
  cardTitle: { fontSize: 14, fontWeight: "600", color: COLORS.dark, flex: 1 },
  cardTitleRead: { color: COLORS.gray },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.orange },
  cardMsg: { fontSize: 13, color: COLORS.gray, lineHeight: 18 },
  cardDate: { fontSize: 11, color: COLORS.gray, marginTop: 8 },
});
