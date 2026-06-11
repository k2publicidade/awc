import React, { useState, useCallback } from "react";
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, RefreshControl } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { ocorrenciasApi } from "../services/api";
import { saveOcorrenciaOffline } from "../services/database";
import { checkConnectivity, getPendingCount } from "../services/sync";
import { useObraStore } from "../store/obraStore";
import { useSyncStore } from "../store/syncStore";
import { COLORS } from "../services/config";
import { ObraBanner, EmptyState, ErrorBanner } from "../components/ui";
import { Ocorrencia } from "../types";
import { genId } from "../lib/id";

// Valores do enum OcorrenciaGeralTipo do banco
const tipos = [
  { value: "PROBLEMA_TECNICO", label: "🔧 Problema Técnico" },
  { value: "PARALISACAO", label: "🛑 Paralisação" },
  { value: "INTERFERENCIA", label: "⚠️ Interferência" },
  { value: "DECISAO_PROJETO", label: "📐 Decisão de Projeto" },
  { value: "INTEMPERIE", label: "🌧️ Intempérie" },
  { value: "ACIDENTE", label: "🚑 Acidente" },
  { value: "OUTRO", label: "📝 Outro" },
];

const statusLabel: Record<string, { label: string; color: string }> = {
  ABERTO: { label: "Aberto", color: COLORS.danger },
  EM_TRATAMENTO: { label: "Em tratamento", color: COLORS.warning },
  ENCERRADO: { label: "Encerrado", color: COLORS.success },
};

export function OcorrenciaScreen() {
  const obra = useObraStore((s) => s.obra);
  const setPending = useSyncStore((s) => s.setPending);
  const [ocorrencias, setOcorrencias] = useState<Ocorrencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [tipo, setTipo] = useState("PROBLEMA_TECNICO");
  const [descricao, setDescricao] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchOcorrencias = useCallback(async () => {
    if (!obra) { setLoading(false); return; }
    setError("");
    try {
      const res = await ocorrenciasApi.list(obra.id);
      setOcorrencias(Array.isArray(res.data) ? res.data : []);
    } catch {
      setError("Sem conexão — não foi possível carregar as ocorrências");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [obra?.id]);

  useFocusEffect(useCallback(() => { fetchOcorrencias(); }, [fetchOcorrencias]));

  const handleSave = async () => {
    if (!obra) return;
    if (!descricao.trim()) { Alert.alert("Atenção", "Descreva a ocorrência"); return; }
    setSaving(true);
    try {
      const isConnected = await checkConnectivity();
      if (isConnected) {
        await ocorrenciasApi.create({ obraId: obra.id, tipo, descricao: descricao.trim(), data: new Date().toISOString() });
        Alert.alert("Sucesso", "Ocorrência registrada!");
      } else {
        await saveOcorrenciaOffline(genId(), new Date().toISOString(), obra.id, tipo, descricao.trim());
        setPending(await getPendingCount());
        Alert.alert("Salvo offline", "A ocorrência será sincronizada quando houver conexão.");
      }
      setDescricao(""); setShowForm(false);
      await fetchOcorrencias();
    } catch (e: any) {
      Alert.alert("Erro", e.response?.data?.error || "Falha ao registrar a ocorrência");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <ObraBanner obra={obra} />
      <ErrorBanner message={error} />

      <TouchableOpacity style={[styles.newBtn, !obra && styles.newBtnDisabled]} disabled={!obra}
        onPress={() => setShowForm((v) => !v)}>
        <Text style={styles.newBtnText}>{showForm ? "✕ Fechar formulário" : "+ Registrar Ocorrência"}</Text>
      </TouchableOpacity>

      {showForm && obra && (
        <View style={styles.form}>
          <Text style={styles.formTitle}>Nova Ocorrência</Text>
          <View style={styles.tipoRow}>
            {tipos.map((t) => (
              <TouchableOpacity key={t.value} style={[styles.tipoBtn, tipo === t.value && styles.tipoBtnActive]}
                onPress={() => setTipo(t.value)}>
                <Text style={[styles.tipoText, tipo === t.value && styles.tipoTextActive]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput style={[styles.input, { height: 80, textAlignVertical: "top" }]} multiline placeholder="Descreva a ocorrência..."
            placeholderTextColor={COLORS.gray} value={descricao} onChangeText={setDescricao} />
          <View style={styles.formActions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => { setShowForm(false); setDescricao(""); }}>
              <Text style={styles.cancelBtnText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveBtnText}>Salvar</Text>}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {!obra ? (
        <EmptyState icon="⚠️" title="Nenhuma obra selecionada" subtitle="Escolha uma obra na aba Obras para registrar ocorrências." />
      ) : loading ? (
        <ActivityIndicator size="large" color={COLORS.orange} style={{ marginTop: 20 }} />
      ) : (
        <FlatList data={ocorrencias} keyExtractor={(o) => o.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchOcorrencias(); }} colors={[COLORS.orange]} />}
          renderItem={({ item }) => {
            const st = statusLabel[item.status] || { label: item.status, color: COLORS.gray };
            const tipoInfo = tipos.find((t) => t.value === item.tipo);
            return (
              <View style={styles.card}>
                <View style={styles.cardRow}>
                  <Text style={styles.cardTipo}>{tipoInfo?.label || item.tipo.replaceAll("_", " ")}</Text>
                  <Text style={styles.cardDate}>{new Date(item.dataAbertura).toLocaleDateString("pt-BR")}</Text>
                </View>
                <Text style={styles.cardDesc}>{item.descricao}</Text>
                <Text style={[styles.cardStatus, { color: st.color }]}>{st.label}</Text>
              </View>
            );
          }} contentContainerStyle={styles.list} ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          ListEmptyComponent={<EmptyState icon="✅" title="Nenhuma ocorrência nesta obra" subtitle="Registre problemas, paralisações e interferências por aqui." />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.light },
  newBtn: { backgroundColor: COLORS.danger, margin: 16, marginBottom: 8, borderRadius: 10, padding: 14, alignItems: "center" },
  newBtnDisabled: { backgroundColor: COLORS.gray },
  newBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  form: { marginHorizontal: 16, marginBottom: 8, backgroundColor: COLORS.white, borderRadius: 12, padding: 16 },
  formTitle: { fontSize: 16, fontWeight: "700", color: COLORS.dark, marginBottom: 12 },
  tipoRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 12 },
  tipoBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: "#E5E7EB" },
  tipoBtnActive: { borderColor: COLORS.orange, backgroundColor: COLORS.orange + "10" },
  tipoText: { fontSize: 11, color: COLORS.gray },
  tipoTextActive: { color: COLORS.orange, fontWeight: "700" },
  input: { borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 8, padding: 10, fontSize: 14, marginBottom: 10, color: COLORS.dark },
  formActions: { flexDirection: "row", gap: 8 },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 8, padding: 12, alignItems: "center" },
  cancelBtnText: { color: COLORS.gray, fontWeight: "600" },
  saveBtn: { flex: 1, backgroundColor: COLORS.orange, borderRadius: 8, padding: 12, alignItems: "center" },
  saveBtnText: { color: "#fff", fontWeight: "700" },
  list: { padding: 16, paddingTop: 8, flexGrow: 1 },
  card: { backgroundColor: COLORS.white, borderRadius: 8, padding: 12 },
  cardRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  cardTipo: { fontSize: 12, fontWeight: "600", color: COLORS.orange },
  cardDate: { fontSize: 11, color: COLORS.gray },
  cardDesc: { fontSize: 13, color: COLORS.dark },
  cardStatus: { fontSize: 11, fontWeight: "700", marginTop: 6 },
});
