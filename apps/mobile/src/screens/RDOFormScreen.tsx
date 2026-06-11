import React, { useState } from "react";
import { View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, Image } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { rdoApi, galeriaApi } from "../services/api";
import { saveRDOOffline, saveFotoOffline } from "../services/database";
import { checkConnectivity, getPendingCount } from "../services/sync";
import { useObraStore } from "../store/obraStore";
import { useSyncStore } from "../store/syncStore";
import { COLORS } from "../services/config";
import { genId } from "../lib/id";

const climaOptions = ["ENSOLARADO", "NUBLADO", "CHUVOSO", "PARCIALMENTE_NUBLADO"];
const climaLabels: Record<string, string> = {
  ENSOLARADO: "☀️ Ensolarado", NUBLADO: "☁️ Nublado",
  CHUVOSO: "🌧️ Chuvoso", PARCIALMENTE_NUBLADO: "⛅ Parc. Nublado",
};

interface FotoLocal { dataUrl: string; legenda: string }

export function RDOFormScreen({ navigation }: any) {
  const obra = useObraStore((s) => s.obra);
  const setPending = useSyncStore((s) => s.setPending);

  const [data, setData] = useState(new Date().toISOString().split("T")[0]);
  const [climaManha, setClimaManha] = useState("ENSOLARADO");
  const [climaTarde, setClimaTarde] = useState("ENSOLARADO");
  const [tempManha, setTempManha] = useState("");
  const [tempTarde, setTempTarde] = useState("");
  const [efetivo, setEfetivo] = useState([{ funcao: "", presente: "0", ausente: "0", justificado: "0" }]);
  const [atividades, setAtividades] = useState([{ descricao: "", percentual: "0" }]);
  const [ocorrenciaTexto, setOcorrenciaTexto] = useState("");
  const [equipamentos, setEquipamentos] = useState([{ nome: "", horas: "0" }]);
  const [fotos, setFotos] = useState<FotoLocal[]>([]);
  const [responsavelNome, setResponsavelNome] = useState("");
  const [responsavelCrea, setResponsavelCrea] = useState("");
  const [saving, setSaving] = useState(false);

  const addFotoFromResult = (result: ImagePicker.ImagePickerResult) => {
    if (result.canceled) return;
    const novas = result.assets
      .filter((a) => a.base64)
      .map((a) => ({ dataUrl: `data:image/jpeg;base64,${a.base64}`, legenda: "" }));
    setFotos((prev) => [...prev, ...novas]);
  };

  const pickImage = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) { Alert.alert("Permissão", "Autorize o uso da câmera nas configurações."); return; }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.5, base64: true });
    addFotoFromResult(result);
  };

  const pickFromGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.5, base64: true, allowsMultipleSelection: true, selectionLimit: 5 });
    addFotoFromResult(result);
  };

  const handleSave = async () => {
    if (!obra) { Alert.alert("Atenção", "Selecione uma obra na aba Obras antes de criar o RDO."); return; }
    if (!responsavelNome) { Alert.alert("Atenção", "Preencha o nome do responsável"); return; }

    setSaving(true);

    // Payload no formato canônico do POST /api/rdo
    const payload = {
      obraId: obra.id,
      data,
      climaManha, climaTarde,
      temperaturaManha: tempManha ? parseFloat(tempManha) : null,
      temperaturaTarde: tempTarde ? parseFloat(tempTarde) : null,
      assinaturaNome: responsavelNome,
      assinaturaCrea: responsavelCrea || null,
      observacoes: `RDO registrado pelo app mobile em ${new Date().toLocaleString("pt-BR")}`,
      efetivos: efetivo.filter((e) => e.funcao).map((e) => ({
        funcao: e.funcao,
        quantidadePresente: parseInt(e.presente) || 0,
        quantidadeAusente: parseInt(e.ausente) || 0,
        quantidadeFaltaJustificada: parseInt(e.justificado) || 0,
      })),
      atividades: atividades.filter((a) => a.descricao).map((a) => ({
        descricao: a.descricao,
        percentualExecutado: parseFloat(a.percentual) || 0,
      })),
      ocorrencias: ocorrenciaTexto
        ? [{ tipo: "PROBLEMA", descricao: ocorrenciaTexto }]
        : [],
      equipamentos: equipamentos.filter((e) => e.nome).map((e) => ({
        equipamento: e.nome,
        horasTrabalhadas: parseFloat(e.horas) || 0,
      })),
    };

    try {
      const isConnected = await checkConnectivity();
      if (isConnected) {
        const res = await rdoApi.create(payload);
        const rdoId = res.data?.id as string | undefined;
        for (const f of fotos) {
          try {
            await galeriaApi.upload({ obraId: obra.id, url: f.dataUrl, legenda: f.legenda, rdoId: rdoId || null });
          } catch { /* foto individual falhou; segue */ }
        }
        Alert.alert("Sucesso", "RDO enviado!", [{ text: "OK", onPress: () => navigation?.goBack() }]);
      } else {
        await saveRDOOffline(genId(), obra.id, payload);
        for (const f of fotos) {
          await saveFotoOffline(genId(), obra.id, f.dataUrl, f.legenda);
        }
        setPending(await getPendingCount());
        Alert.alert("Salvo Offline", "O RDO será sincronizado quando houver conexão.", [{ text: "OK", onPress: () => navigation?.goBack() }]);
      }
    } catch (e: any) {
      Alert.alert("Erro", e.response?.data?.error || "Não foi possível salvar o RDO");
    } finally { setSaving(false); }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.obraBanner}>
          <Text style={styles.obraBannerText}>{obra ? `🏗️ ${obra.codigo} — ${obra.nome}` : "⚠️ Nenhuma obra selecionada"}</Text>
        </View>

        <Text style={styles.sectionTitle}>📅 Data</Text>
        <TextInput style={styles.input} value={data} onChangeText={setData} placeholder="YYYY-MM-DD" />

        <Text style={styles.sectionTitle}>🌤️ Clima Manhã</Text>
        <View style={styles.climaRow}>{climaOptions.map((c) => (
          <TouchableOpacity key={c} style={[styles.climaBtn, climaManha === c && styles.climaBtnActive]} onPress={() => setClimaManha(c)}>
            <Text style={[styles.climaBtnText, climaManha === c && styles.climaBtnTextActive]}>{climaLabels[c]}</Text>
          </TouchableOpacity>
        ))}</View>
        <TextInput style={styles.input} value={tempManha} onChangeText={setTempManha} placeholder="Temperatura manhã (°C)" keyboardType="numeric" />

        <Text style={styles.sectionTitle}>🌤️ Clima Tarde</Text>
        <View style={styles.climaRow}>{climaOptions.map((c) => (
          <TouchableOpacity key={c} style={[styles.climaBtn, climaTarde === c && styles.climaBtnActive]} onPress={() => setClimaTarde(c)}>
            <Text style={[styles.climaBtnText, climaTarde === c && styles.climaBtnTextActive]}>{climaLabels[c]}</Text>
          </TouchableOpacity>
        ))}</View>
        <TextInput style={styles.input} value={tempTarde} onChangeText={setTempTarde} placeholder="Temperatura tarde (°C)" keyboardType="numeric" />

        <Text style={styles.sectionTitle}>👷 Efetivo</Text>
        {efetivo.map((e, i) => (
          <View key={i} style={styles.itemRow}>
            <TextInput style={[styles.input, { flex: 2 }]} placeholder="Função" value={e.funcao}
              onChangeText={(v) => { const n = [...efetivo]; n[i].funcao = v; setEfetivo(n); }} />
            <TextInput style={[styles.input, styles.smallInput]} placeholder="Pres." keyboardType="numeric" value={e.presente}
              onChangeText={(v) => { const n = [...efetivo]; n[i].presente = v; setEfetivo(n); }} />
            <TextInput style={[styles.input, styles.smallInput]} placeholder="Aus." keyboardType="numeric" value={e.ausente}
              onChangeText={(v) => { const n = [...efetivo]; n[i].ausente = v; setEfetivo(n); }} />
          </View>
        ))}
        <TouchableOpacity onPress={() => setEfetivo([...efetivo, { funcao: "", presente: "0", ausente: "0", justificado: "0" }])}>
          <Text style={styles.addBtn}>+ Adicionar função</Text>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>🔨 Atividades</Text>
        {atividades.map((a, i) => (
          <View key={i} style={styles.itemRow}>
            <TextInput style={[styles.input, { flex: 3 }]} placeholder="Descrição da atividade" value={a.descricao}
              onChangeText={(v) => { const n = [...atividades]; n[i].descricao = v; setAtividades(n); }} />
            <TextInput style={[styles.input, styles.smallInput]} placeholder="%" keyboardType="numeric" value={a.percentual}
              onChangeText={(v) => { const n = [...atividades]; n[i].percentual = v; setAtividades(n); }} />
          </View>
        ))}
        <TouchableOpacity onPress={() => setAtividades([...atividades, { descricao: "", percentual: "0" }])}>
          <Text style={styles.addBtn}>+ Adicionar atividade</Text>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>⚠️ Ocorrências</Text>
        <TextInput style={[styles.input, { height: 80 }]} multiline value={ocorrenciaTexto} onChangeText={setOcorrenciaTexto} placeholder="Descreva ocorrências do dia (opcional)..." />

        <Text style={styles.sectionTitle}>🚜 Equipamentos</Text>
        {equipamentos.map((e, i) => (
          <View key={i} style={styles.itemRow}>
            <TextInput style={[styles.input, { flex: 3 }]} placeholder="Equipamento" value={e.nome}
              onChangeText={(v) => { const n = [...equipamentos]; n[i].nome = v; setEquipamentos(n); }} />
            <TextInput style={[styles.input, styles.smallInput]} placeholder="Horas" keyboardType="numeric" value={e.horas}
              onChangeText={(v) => { const n = [...equipamentos]; n[i].horas = v; setEquipamentos(n); }} />
          </View>
        ))}
        <TouchableOpacity onPress={() => setEquipamentos([...equipamentos, { nome: "", horas: "0" }])}>
          <Text style={styles.addBtn}>+ Adicionar equipamento</Text>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>📷 Fotos do Dia ({fotos.length})</Text>
        <View style={styles.fotoButtons}>
          <TouchableOpacity style={styles.fotoBtn} onPress={pickImage}><Text style={styles.fotoBtnText}>📷 Câmera</Text></TouchableOpacity>
          <TouchableOpacity style={styles.fotoBtn} onPress={pickFromGallery}><Text style={styles.fotoBtnText}>🖼️ Galeria</Text></TouchableOpacity>
        </View>
        {fotos.map((f, i) => (
          <View key={i} style={styles.fotoItem}>
            <Image source={{ uri: f.dataUrl }} style={styles.fotoThumb} />
            <TextInput style={[styles.input, { flex: 1, marginBottom: 0 }]} placeholder="Legenda" value={f.legenda}
              onChangeText={(v) => { const n = [...fotos]; n[i].legenda = v; setFotos(n); }} />
            <TouchableOpacity onPress={() => setFotos(fotos.filter((_, j) => j !== i))}>
              <Text style={styles.fotoRemove}>✕</Text>
            </TouchableOpacity>
          </View>
        ))}

        <Text style={styles.sectionTitle}>✍️ Responsável</Text>
        <TextInput style={styles.input} placeholder="Nome do responsável" value={responsavelNome} onChangeText={setResponsavelNome} />
        <TextInput style={styles.input} placeholder="CREA (opcional)" value={responsavelCrea} onChangeText={setResponsavelCrea} />

        <TouchableOpacity style={[styles.saveButton, !obra && styles.saveButtonDisabled]} onPress={handleSave} disabled={saving || !obra}>
          <Text style={styles.saveButtonText}>{saving ? "Salvando..." : "Salvar RDO"}</Text>
        </TouchableOpacity>
        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.light, padding: 16 },
  obraBanner: { backgroundColor: COLORS.dark, borderRadius: 8, padding: 12 },
  obraBannerText: { color: COLORS.white, fontSize: 13, fontWeight: "600" },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: COLORS.dark, marginTop: 16, marginBottom: 8 },
  input: { borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 8, padding: 10, fontSize: 14, backgroundColor: COLORS.white, marginBottom: 8, color: COLORS.dark },
  smallInput: { flex: 1, marginLeft: 6, maxWidth: 70 },
  climaRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
  climaBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: "#E5E7EB", backgroundColor: COLORS.white },
  climaBtnActive: { borderColor: COLORS.orange, backgroundColor: COLORS.orange + "10" },
  climaBtnText: { fontSize: 12, color: COLORS.gray },
  climaBtnTextActive: { color: COLORS.orange, fontWeight: "700" },
  itemRow: { flexDirection: "row", gap: 4, marginBottom: 4 },
  addBtn: { color: COLORS.orange, fontSize: 13, fontWeight: "600", marginBottom: 8 },
  fotoButtons: { flexDirection: "row", gap: 12, marginBottom: 12 },
  fotoBtn: { flex: 1, backgroundColor: COLORS.white, borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 8, padding: 12, alignItems: "center" },
  fotoBtnText: { fontSize: 14, color: COLORS.dark },
  fotoItem: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: COLORS.white, borderRadius: 8, padding: 8, marginBottom: 8 },
  fotoThumb: { width: 48, height: 48, borderRadius: 6, backgroundColor: "#E5E7EB" },
  fotoRemove: { color: COLORS.danger, fontSize: 18, fontWeight: "700", padding: 6 },
  saveButton: { backgroundColor: COLORS.orange, borderRadius: 10, padding: 16, alignItems: "center", marginTop: 24 },
  saveButtonDisabled: { backgroundColor: COLORS.gray },
  saveButtonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
