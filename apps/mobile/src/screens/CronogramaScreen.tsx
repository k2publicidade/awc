import React, { useState, useCallback } from "react";
import { View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { cronogramaApi } from "../services/api";
import { useObraStore } from "../store/obraStore";
import { COLORS } from "../services/config";
import { ObraBanner, EmptyState, ErrorBanner } from "../components/ui";
import { Etapa } from "../types";

const statusColors: Record<string, string> = {
  CONCLUIDA: COLORS.success, EM_ANDAMENTO: COLORS.info, NAO_INICIADA: COLORS.gray, ATRASADA: COLORS.danger,
};

function statusDe(e: Etapa): keyof typeof statusColors {
  const pct = e.percentualRealizado || 0;
  if (pct >= 100) return "CONCLUIDA";
  if (e.dataFim && new Date(e.dataFim) < new Date()) return "ATRASADA";
  if (pct > 0) return "EM_ANDAMENTO";
  return "NAO_INICIADA";
}

const fmtData = (d?: string | null) => (d ? new Date(d).toLocaleDateString("pt-BR") : "—");

export function CronogramaScreen() {
  const obra = useObraStore((s) => s.obra);
  const [etapas, setEtapas] = useState<Etapa[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const fetchEtapas = useCallback(async () => {
    if (!obra) { setLoading(false); return; }
    setError("");
    try {
      const res = await cronogramaApi.get(obra.id);
      setEtapas(res.data?.etapas || []);
    } catch {
      setError("Sem conexão — não foi possível carregar o cronograma");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [obra?.id]);

  useFocusEffect(useCallback(() => { fetchEtapas(); }, [fetchEtapas]));

  const avancoMedio = etapas.length ? etapas.reduce((s, e) => s + (e.percentualRealizado || 0), 0) / etapas.length : 0;
  const atrasadas = etapas.filter((e) => statusDe(e) === "ATRASADA").length;

  const renderItem = ({ item }: { item: Etapa }) => {
    const pct = item.percentualRealizado || 0;
    const status = statusDe(item);
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.statusDot, { backgroundColor: statusColors[status] }]} />
          <Text style={styles.etapaNome}>{item.nome}</Text>
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${Math.min(pct, 100)}%`, backgroundColor: statusColors[status] }]} />
        </View>
        <View style={styles.cardFooter}>
          <Text style={styles.pctText}>{pct.toFixed(0)}% <Text style={styles.pctPrevisto}>(prev. {(item.percentualPrevisto || 0).toFixed(0)}%)</Text></Text>
          <Text style={styles.dateText}>{fmtData(item.dataInicio)} — {fmtData(item.dataFim)}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ObraBanner obra={obra} />
      <ErrorBanner message={error} />

      {!obra ? (
        <EmptyState icon="📊" title="Nenhuma obra selecionada" subtitle="Escolha uma obra na aba Obras para ver o cronograma." />
      ) : loading ? (
        <ActivityIndicator size="large" color={COLORS.orange} style={{ marginTop: 40 }} />
      ) : (
        <>
          {etapas.length > 0 && (
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}><Text style={styles.summaryValue}>{etapas.length}</Text><Text style={styles.summaryLabel}>Etapas</Text></View>
              <View style={styles.summaryItem}><Text style={styles.summaryValue}>{avancoMedio.toFixed(0)}%</Text><Text style={styles.summaryLabel}>Avanço médio</Text></View>
              <View style={styles.summaryItem}><Text style={[styles.summaryValue, atrasadas > 0 && { color: COLORS.danger }]}>{atrasadas}</Text><Text style={styles.summaryLabel}>Atrasadas</Text></View>
            </View>
          )}
          <FlatList data={etapas} keyExtractor={(e) => e.id} renderItem={renderItem}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchEtapas(); }} colors={[COLORS.orange]} />}
            contentContainerStyle={styles.list} ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
            ListEmptyComponent={<EmptyState icon="📅" title="Nenhuma etapa cadastrada" subtitle="O cronograma desta obra é montado no sistema web." />}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.light },
  summaryRow: { flexDirection: "row", backgroundColor: COLORS.white, paddingVertical: 12 },
  summaryItem: { flex: 1, alignItems: "center" },
  summaryValue: { fontSize: 18, fontWeight: "800", color: COLORS.orange },
  summaryLabel: { fontSize: 11, color: COLORS.gray, marginTop: 2 },
  list: { padding: 16, flexGrow: 1 },
  card: { backgroundColor: COLORS.white, borderRadius: 10, padding: 14, elevation: 1 },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  etapaNome: { fontSize: 14, fontWeight: "600", color: COLORS.dark, flex: 1 },
  progressBar: { height: 6, backgroundColor: "#E5E7EB", borderRadius: 3, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 3 },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", marginTop: 8, alignItems: "center" },
  pctText: { fontSize: 14, fontWeight: "700", color: COLORS.orange },
  pctPrevisto: { fontSize: 11, fontWeight: "400", color: COLORS.gray },
  dateText: { fontSize: 11, color: COLORS.gray },
});
