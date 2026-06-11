import React, { useState, useCallback } from "react";
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, RefreshControl } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { materiaisApi } from "../services/api";
import { saveRequisicaoOffline } from "../services/database";
import { checkConnectivity, getPendingCount } from "../services/sync";
import { useObraStore } from "../store/obraStore";
import { useSyncStore } from "../store/syncStore";
import { COLORS } from "../services/config";
import { ObraBanner, EmptyState, ErrorBanner } from "../components/ui";
import { Material } from "../types";
import { genId } from "../lib/id";

export function RequisicaoScreen() {
  const obra = useObraStore((s) => s.obra);
  const setPending = useSyncStore((s) => s.setPending);
  const [materiais, setMateriais] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Material | null>(null);
  const [quantidade, setQuantidade] = useState("");
  const [justificativa, setJustificativa] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchMateriais = useCallback(async () => {
    setError("");
    try {
      const res = await materiaisApi.list();
      setMateriais(Array.isArray(res.data) ? res.data : []);
    } catch {
      setError("Sem conexão — não foi possível carregar os materiais");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchMateriais(); }, [fetchMateriais]));

  const filtered = materiais.filter((m) =>
    m.descricao.toLowerCase().includes(search.toLowerCase()) || m.codigo.toLowerCase().includes(search.toLowerCase())
  );

  const handleSubmit = async () => {
    if (!obra) { Alert.alert("Atenção", "Selecione uma obra na aba Obras."); return; }
    if (!selected) { Alert.alert("Atenção", "Selecione um material na lista."); return; }
    const qtd = parseFloat(quantidade.replace(",", "."));
    if (!qtd || qtd <= 0) { Alert.alert("Atenção", "Informe uma quantidade válida."); return; }
    setSubmitting(true);
    try {
      const isConnected = await checkConnectivity();
      if (isConnected) {
        await materiaisApi.requisitar({ obraId: obra.id, materialId: selected.id, quantidade: qtd, justificativa: justificativa.trim() || undefined });
        Alert.alert("Sucesso", `Requisição de ${qtd} ${selected.unidade} de "${selected.descricao}" enviada para aprovação.`);
      } else {
        await saveRequisicaoOffline(genId(), obra.id, selected.id, qtd, justificativa.trim() || undefined);
        setPending(await getPendingCount());
        Alert.alert("Salvo offline", "A requisição será sincronizada quando houver conexão.");
      }
      setSelected(null); setQuantidade(""); setJustificativa("");
    } catch (e: any) {
      Alert.alert("Erro", e.response?.data?.error || "Falha ao enviar a requisição");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <ObraBanner obra={obra} />
      <ErrorBanner message={error} />

      <TextInput style={styles.search} placeholder="Buscar material por nome ou código..." value={search}
        onChangeText={setSearch} placeholderTextColor={COLORS.gray} />

      {selected && (
        <View style={styles.selectedCard}>
          <View style={styles.selectedHeader}>
            <Text style={styles.selectedNome}>{selected.descricao}</Text>
            <TouchableOpacity onPress={() => setSelected(null)}><Text style={styles.selectedClose}>✕</Text></TouchableOpacity>
          </View>
          <Text style={styles.selectedEstoque}>Estoque atual: {selected.estoqueAtual ?? 0} {selected.unidade}</Text>
          <TextInput style={styles.input} placeholder={`Quantidade (${selected.unidade})`} keyboardType="numeric"
            value={quantidade} onChangeText={setQuantidade} placeholderTextColor={COLORS.gray} />
          <TextInput style={styles.input} placeholder="Justificativa (opcional)" value={justificativa}
            onChangeText={setJustificativa} placeholderTextColor={COLORS.gray} />
          <TouchableOpacity style={[styles.submitBtn, (!obra || submitting) && { opacity: 0.5 }]} onPress={handleSubmit} disabled={!obra || submitting}>
            {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Enviar Requisição</Text>}
          </TouchableOpacity>
        </View>
      )}

      {loading ? (
        <ActivityIndicator size="large" color={COLORS.orange} style={{ marginTop: 20 }} />
      ) : (
        <FlatList data={filtered} keyExtractor={(m) => m.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchMateriais(); }} colors={[COLORS.orange]} />}
          renderItem={({ item }) => (
            <TouchableOpacity style={[styles.materialCard, selected?.id === item.id && styles.materialCardSelected]}
              onPress={() => setSelected(item)}>
              <Text style={styles.materialNome}>{item.descricao}</Text>
              <View style={styles.materialRow}>
                <Text style={styles.materialCodigo}>{item.codigo}</Text>
                <Text style={[styles.materialEstoque, item.alerta && { color: COLORS.danger }]}>
                  {item.alerta ? "⚠️ " : ""}{item.estoqueAtual ?? 0} {item.unidade}
                </Text>
              </View>
            </TouchableOpacity>
          )} contentContainerStyle={styles.list} ItemSeparatorComponent={() => <View style={{ height: 6 }} />}
          ListEmptyComponent={
            search
              ? <EmptyState icon="🔍" title={`Nenhum material para "${search}"`} subtitle="Tente outro termo ou limpe a busca." />
              : <EmptyState icon="📦" title="Nenhum material cadastrado" subtitle="O catálogo de materiais é mantido no sistema web." />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.light },
  search: { margin: 16, marginBottom: 8, borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 8, padding: 10, backgroundColor: COLORS.white, fontSize: 14, color: COLORS.dark },
  selectedCard: { marginHorizontal: 16, marginBottom: 8, backgroundColor: COLORS.white, borderRadius: 10, padding: 14, borderWidth: 1, borderColor: COLORS.orange },
  selectedHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  selectedNome: { fontSize: 15, fontWeight: "700", color: COLORS.dark, flex: 1 },
  selectedClose: { color: COLORS.gray, fontSize: 16, fontWeight: "700", paddingLeft: 8 },
  selectedEstoque: { fontSize: 12, color: COLORS.gray, marginTop: 4, marginBottom: 12 },
  input: { borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 8, padding: 10, fontSize: 14, marginBottom: 8, color: COLORS.dark },
  submitBtn: { backgroundColor: COLORS.orange, borderRadius: 8, padding: 12, alignItems: "center", marginTop: 4 },
  submitBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  list: { padding: 16, paddingTop: 8, flexGrow: 1 },
  materialCard: { backgroundColor: COLORS.white, borderRadius: 8, padding: 12, borderWidth: 1, borderColor: "#E5E7EB" },
  materialCardSelected: { borderColor: COLORS.orange, backgroundColor: COLORS.orange + "08" },
  materialNome: { fontSize: 14, fontWeight: "500", color: COLORS.dark },
  materialRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 4 },
  materialCodigo: { fontSize: 11, color: COLORS.gray },
  materialEstoque: { fontSize: 12, fontWeight: "600", color: COLORS.success },
});
