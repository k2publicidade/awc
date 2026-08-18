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
import { useAuthStore } from "../store/authStore";
import { FieldPhotoComposer, ComposedFieldPhoto } from "../components/FieldPhotoComposer";
import { persistOfflinePhoto } from "../services/photos";
import { VoiceTranscription } from "../components/VoiceTranscription";

const climaOptions = ["ENSOLARADO", "NUBLADO", "CHUVOSO", "PARCIALMENTE_NUBLADO"];
const climaLabels: Record<string, string> = {
  ENSOLARADO: "☀️ Ensolarado", NUBLADO: "☁️ Nublado",
  CHUVOSO: "🌧️ Chuvoso", PARCIALMENTE_NUBLADO: "⛅ Parc. Nublado",
};

interface FotoLocal { uri: string; legenda: string }

export function RDOFormScreen({ navigation }: any) {
  const obra = useObraStore((s) => s.obra);
  const setPending = useSyncStore((s) => s.setPending);
  const user = useAuthStore((s) => s.user);

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
  const [responsavelNome, setResponsavelNome] = useState(user?.name || "");
  const [responsavelCrea, setResponsavelCrea] = useState("");
  const [saving, setSaving] = useState(false);
  const [photoQueue, setPhotoQueue] = useState<ImagePicker.ImagePickerAsset[]>([]);

  const addFotoFromResult = (result: ImagePicker.ImagePickerResult) => {
    if (result.canceled) return;
    setPhotoQueue((current) => [...current, ...result.assets]);
  };

  const addComposedPhoto = (photo: ComposedFieldPhoto) => {
    setFotos((current) => [...current, { uri: photo.uri, legenda: photo.legenda }]);
    setPhotoQueue((current) => current.slice(1));
  };

  const pickImage = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) { Alert.alert("Permissão", "Autorize o uso da câmera nas configurações."); return; }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.82 });
    addFotoFromResult(result);
  };

  const pickFromGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.82, allowsMultipleSelection: true, selectionLimit: 5 });
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
        let queuedPhotos = 0;
        for (const f of fotos) {
          try {
            await galeriaApi.uploadPhoto(f.uri, { obraId: obra.id, legenda: f.legenda, rdoId: rdoId || null });
          } catch {
            // O RDO não deve ser perdido se a conexão cair durante os arquivos.
            const durableUri = await persistOfflinePhoto(f.uri);
            await saveFotoOffline(genId(), obra.id, durableUri, f.legenda, null, rdoId || null);
            queuedPhotos++;
          }
        }
        if (queuedPhotos) setPending(await getPendingCount());
        Alert.alert(
          "RDO registrado",
          queuedPhotos
            ? `${queuedPhotos} foto(s) ficaram protegidas no aparelho e serão sincronizadas depois.`
            : "Relatório e fotos enviados com sucesso.",
          [{ text: "OK", onPress: () => navigation?.goBack() }]
        );
      } else {
        const localRdoId = genId();
        await saveRDOOffline(localRdoId, obra.id, payload);
        for (const f of fotos) {
          const durableUri = await persistOfflinePhoto(f.uri);
          await saveFotoOffline(genId(), obra.id, durableUri, f.legenda, null, null, localRdoId);
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
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.obraBanner}>
          <Text style={styles.bannerEyebrow}>RELATÓRIO DIÁRIO · CAMPO</Text>
          <Text style={styles.obraBannerText}>{obra ? `${obra.codigo} — ${obra.nome}` : "Nenhuma obra selecionada"}</Text>
          <Text style={styles.bannerHint}>Registre o turno em blocos. Você pode salvar offline.</Text>
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
        <VoiceTranscription onInsert={(text) => setOcorrenciaTexto((current) => current.trim() ? `${current.trim()}\n${text}` : text)} />
        <TextInput style={[styles.input, { height: 96, textAlignVertical: "top" }]} multiline value={ocorrenciaTexto} onChangeText={setOcorrenciaTexto} placeholder="Descreva ocorrências do dia (opcional)..." />

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
            <Image source={{ uri: f.uri }} style={styles.fotoThumb} />
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
      <FieldPhotoComposer
        asset={photoQueue[0] || null}
        obra={obra}
        responsavel={responsavelNome || user?.name || "Responsável de campo"}
        onCancel={() => setPhotoQueue((current) => current.slice(1))}
        onReady={addComposedPhoto}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#EEF1F3" },
  content: { padding: 16 },
  obraBanner: { backgroundColor: COLORS.dark, borderRadius: 4, padding: 18, borderLeftWidth: 5, borderLeftColor: COLORS.orange },
  bannerEyebrow: { color: "#FF9B54", fontSize: 9, fontWeight: "900", letterSpacing: 1.6 },
  obraBannerText: { color: COLORS.white, fontSize: 18, lineHeight: 23, fontWeight: "900", marginTop: 4 },
  bannerHint: { color: "#AEB9C1", fontSize: 11, marginTop: 5 },
  sectionTitle: { fontSize: 14, letterSpacing: 0.2, fontWeight: "900", color: COLORS.dark, marginTop: 22, marginBottom: 9 },
  input: { borderWidth: 1, borderColor: "#D5DBE0", borderRadius: 4, minHeight: 46, padding: 12, fontSize: 14, backgroundColor: COLORS.white, marginBottom: 8, color: COLORS.dark },
  smallInput: { flex: 1, marginLeft: 6, maxWidth: 70 },
  climaRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
  climaBtn: { minHeight: 42, justifyContent: "center", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 4, borderWidth: 1, borderColor: "#D5DBE0", backgroundColor: COLORS.white },
  climaBtnActive: { borderColor: COLORS.orange, backgroundColor: COLORS.orange + "10" },
  climaBtnText: { fontSize: 12, color: COLORS.gray },
  climaBtnTextActive: { color: COLORS.orange, fontWeight: "700" },
  itemRow: { flexDirection: "row", gap: 4, marginBottom: 4 },
  addBtn: { color: "#C84E00", fontSize: 13, fontWeight: "800", paddingVertical: 8, marginBottom: 4 },
  fotoButtons: { flexDirection: "row", gap: 12, marginBottom: 12 },
  fotoBtn: { flex: 1, minHeight: 48, justifyContent: "center", backgroundColor: COLORS.white, borderWidth: 1, borderColor: "#CDD4DA", borderRadius: 4, padding: 12, alignItems: "center" },
  fotoBtnText: { fontSize: 14, color: COLORS.dark },
  fotoItem: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: COLORS.white, borderRadius: 4, padding: 8, marginBottom: 8, borderWidth: 1, borderColor: "#E0E4E7" },
  fotoThumb: { width: 62, height: 62, borderRadius: 2, backgroundColor: "#E5E7EB" },
  fotoRemove: { color: COLORS.danger, fontSize: 18, fontWeight: "700", padding: 6 },
  saveButton: { backgroundColor: COLORS.orange, borderRadius: 4, minHeight: 56, justifyContent: "center", padding: 16, alignItems: "center", marginTop: 26 },
  saveButtonDisabled: { backgroundColor: COLORS.gray },
  saveButtonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
