import React, { useState, useCallback } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { qualidadeApi, cronogramaApi } from "../services/api";
import { checkConnectivity } from "../services/sync";
import { useObraStore } from "../store/obraStore";
import { COLORS } from "../services/config";
import { ObraBanner, EmptyState, ErrorBanner } from "../components/ui";
import { ChecklistItem, Etapa } from "../types";

const defaultChecklist: ChecklistItem[] = [
  { id: "1", nome: "Fundações executadas conforme projeto", conformidade: null },
  { id: "2", nome: "Pilares pré-moldados alinhados e prumados", conformidade: null },
  { id: "3", nome: "Vigas apoiam corretamente nos pilares", conformidade: null },
  { id: "4", nome: "Lajes pré-moldadas com espaçamento correto", conformidade: null },
  { id: "5", nome: "Chumbadores com torque adequado", conformidade: null },
  { id: "6", nome: "Armaduras em posição conforme projeto", conformidade: null },
  { id: "7", nome: "Concreto com aspecto superficial adequado", conformidade: null },
  { id: "8", nome: "Juntas de dilatação conforme projeto", conformidade: null },
  { id: "9", nome: "EPIs sendo utilizados pela equipe", conformidade: null },
  { id: "10", nome: "Área de trabalho limpa e organizada", conformidade: null },
];

// Mapeia a resposta do app para o enum ItemResultado do banco
const itemResultado: Record<string, string> = { OK: "CONFORME", NC: "NAO_CONFORME", NA: "N_A" };

export function ChecklistScreen() {
  const obra = useObraStore((s) => s.obra);
  const [items, setItems] = useState<ChecklistItem[]>(defaultChecklist);
  const [etapas, setEtapas] = useState<Etapa[]>([]);
  const [etapaId, setEtapaId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchEtapas = useCallback(async () => {
    if (!obra) { setLoading(false); return; }
    setError("");
    try {
      const res = await cronogramaApi.get(obra.id);
      const list: Etapa[] = res.data?.etapas || [];
      setEtapas(list);
      setEtapaId((prev) => prev && list.some((e) => e.id === prev) ? prev : list[0]?.id || null);
    } catch {
      setError("Sem conexão — não foi possível carregar as etapas da obra");
    } finally {
      setLoading(false);
    }
  }, [obra?.id]);

  useFocusEffect(useCallback(() => { fetchEtapas(); }, [fetchEtapas]));

  const setConformidade = (id: string, value: "OK" | "NC" | "NA") => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, conformidade: value } : i)));
  };

  const conformes = items.filter((i) => i.conformidade === "OK").length;
  const ncs = items.filter((i) => i.conformidade === "NC").length;
  const nas = items.filter((i) => i.conformidade === "NA").length;
  const respondidos = conformes + ncs + nas;
  const completo = respondidos === items.length;

  const handleSave = async () => {
    if (!obra || !etapaId) return;
    if (!completo) {
      Alert.alert("Atenção", `Responda todos os itens antes de salvar (${respondidos}/${items.length}).`);
      return;
    }
    const isConnected = await checkConnectivity();
    if (!isConnected) {
      Alert.alert("Sem conexão", "A inspeção precisa de internet para ser enviada. Tente novamente quando houver sinal.");
      return;
    }
    setSaving(true);
    try {
      await qualidadeApi.criarInspecao({
        obraId: obra.id,
        etapaId,
        tipo: "MONTAGEM_PRE_MOLDADO",
        resultado: ncs > 0 ? "NAO_CONFORME" : "CONFORME",
        itens: items.map((i) => ({ descricao: i.nome, resultado: itemResultado[i.conformidade!] })),
      });
      Alert.alert("Sucesso", ncs > 0
        ? `Inspeção registrada com ${ncs} não conformidade(s).`
        : "Inspeção registrada — tudo conforme!");
      setItems(defaultChecklist.map((i) => ({ ...i, conformidade: null })));
    } catch (e: any) {
      Alert.alert("Erro", e.response?.data?.error || "Não foi possível salvar a inspeção");
    } finally {
      setSaving(false);
    }
  };

  const renderItem = ({ item }: { item: ChecklistItem }) => (
    <View style={styles.item}>
      <Text style={styles.itemNome}>{item.nome}</Text>
      <View style={styles.buttonRow}>
        {(["OK", "NC", "NA"] as const).map((v) => (
          <TouchableOpacity key={v} style={[styles.confBtn, item.conformidade === v && (v === "OK" ? styles.okBtn : v === "NC" ? styles.ncBtn : styles.naBtn)]}
            onPress={() => setConformidade(item.id, v)}>
            <Text style={[styles.confBtnText, item.conformidade === v && styles.confBtnTextActive]}>{v}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  if (!obra) {
    return (
      <View style={styles.container}>
        <ObraBanner obra={obra} />
        <EmptyState icon="✅" title="Nenhuma obra selecionada" subtitle="Escolha uma obra na aba Obras para fazer a inspeção." />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ObraBanner obra={obra} />
      <ErrorBanner message={error} />

      {loading ? (
        <ActivityIndicator size="large" color={COLORS.orange} style={{ marginTop: 40 }} />
      ) : etapas.length === 0 ? (
        <EmptyState icon="📋" title="Obra sem etapas cadastradas" subtitle="A inspeção é vinculada a uma etapa do cronograma. Cadastre etapas no sistema web." />
      ) : (
        <>
          <View style={styles.etapaSection}>
            <Text style={styles.etapaLabel}>Etapa inspecionada</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.etapaRow}>
              {etapas.map((e) => (
                <TouchableOpacity key={e.id} style={[styles.etapaChip, etapaId === e.id && styles.etapaChipActive]} onPress={() => setEtapaId(e.id)}>
                  <Text style={[styles.etapaChipText, etapaId === e.id && styles.etapaChipTextActive]} numberOfLines={1}>{e.nome}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryText}>✅ {conformes} OK</Text>
            <Text style={[styles.summaryText, { color: COLORS.danger }]}>❌ {ncs} NC</Text>
            <Text style={styles.summaryText}>➖ {nas} N/A</Text>
            <Text style={[styles.summaryText, { color: completo ? COLORS.success : COLORS.gray }]}>{respondidos}/{items.length}</Text>
          </View>

          <FlatList data={items} keyExtractor={(i) => i.id} renderItem={renderItem}
            contentContainerStyle={styles.list} ItemSeparatorComponent={() => <View style={{ height: 8 }} />} />

          <TouchableOpacity style={[styles.saveBtn, (!completo || saving) && styles.saveBtnDisabled]} onPress={handleSave} disabled={!completo || saving}>
            {saving ? <ActivityIndicator color="#fff" /> : (
              <Text style={styles.saveBtnText}>{completo ? "Salvar Inspeção" : `Responda todos os itens (${respondidos}/${items.length})`}</Text>
            )}
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.light },
  etapaSection: { backgroundColor: COLORS.white, paddingVertical: 10 },
  etapaLabel: { fontSize: 11, fontWeight: "700", color: COLORS.gray, textTransform: "uppercase", paddingHorizontal: 16, marginBottom: 6 },
  etapaRow: { paddingHorizontal: 16, gap: 8 },
  etapaChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, borderWidth: 1, borderColor: "#E5E7EB", maxWidth: 200 },
  etapaChipActive: { borderColor: COLORS.orange, backgroundColor: COLORS.orange + "10" },
  etapaChipText: { fontSize: 12, color: COLORS.gray },
  etapaChipTextActive: { color: COLORS.orange, fontWeight: "700" },
  summaryRow: { flexDirection: "row", justifyContent: "space-around", backgroundColor: COLORS.white, padding: 12, borderTopWidth: 1, borderTopColor: "#F1F5F9" },
  summaryText: { fontSize: 13, fontWeight: "600", color: COLORS.dark },
  list: { padding: 16 },
  item: { backgroundColor: COLORS.white, borderRadius: 10, padding: 14 },
  itemNome: { fontSize: 13, color: COLORS.dark, fontWeight: "500", marginBottom: 8 },
  buttonRow: { flexDirection: "row", gap: 8 },
  confBtn: { flex: 1, paddingVertical: 8, borderRadius: 6, borderWidth: 1, borderColor: "#E5E7EB", alignItems: "center" },
  okBtn: { backgroundColor: COLORS.success + "15", borderColor: COLORS.success },
  ncBtn: { backgroundColor: COLORS.danger + "15", borderColor: COLORS.danger },
  naBtn: { backgroundColor: COLORS.gray + "15", borderColor: COLORS.gray },
  confBtnText: { fontSize: 12, color: COLORS.gray, fontWeight: "600" },
  confBtnTextActive: { color: COLORS.dark },
  saveBtn: { backgroundColor: COLORS.orange, margin: 16, borderRadius: 10, padding: 16, alignItems: "center" },
  saveBtnDisabled: { backgroundColor: COLORS.gray },
  saveBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
