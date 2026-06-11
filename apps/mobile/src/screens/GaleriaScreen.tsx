import React, { useState, useCallback } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image, ActivityIndicator, Alert, Modal, RefreshControl } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import { galeriaApi } from "../services/api";
import { saveFotoOffline } from "../services/database";
import { checkConnectivity, getPendingCount } from "../services/sync";
import { useObraStore } from "../store/obraStore";
import { useSyncStore } from "../store/syncStore";
import { COLORS } from "../services/config";
import { ObraBanner, EmptyState, ErrorBanner } from "../components/ui";
import { Foto } from "../types";
import { genId } from "../lib/id";

export function GaleriaScreen() {
  const obra = useObraStore((s) => s.obra);
  const setPending = useSyncStore((s) => s.setPending);
  const [fotos, setFotos] = useState<Foto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [lightbox, setLightbox] = useState<Foto | null>(null);

  const fetchFotos = useCallback(async () => {
    if (!obra) { setLoading(false); return; }
    setError("");
    try {
      const res = await galeriaApi.list(obra.id);
      setFotos(Array.isArray(res.data) ? res.data : []);
    } catch {
      setError("Sem conexão — não foi possível carregar as fotos");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [obra?.id]);

  useFocusEffect(useCallback(() => { fetchFotos(); }, [fetchFotos]));

  const enviarFoto = async (result: ImagePicker.ImagePickerResult) => {
    if (!obra || result.canceled) return;
    const assets = result.assets.filter((a) => a.base64);
    if (assets.length === 0) return;
    setUploading(true);
    try {
      const isConnected = await checkConnectivity();
      let offline = 0;
      for (const a of assets) {
        const dataUrl = `data:image/jpeg;base64,${a.base64}`;
        if (isConnected) {
          await galeriaApi.upload({ obraId: obra.id, url: dataUrl, legenda: "" });
        } else {
          await saveFotoOffline(genId(), obra.id, dataUrl, "");
          offline++;
        }
      }
      if (offline > 0) {
        setPending(await getPendingCount());
        Alert.alert("Salvo offline", `${offline} foto(s) serão enviadas quando houver conexão.`);
      }
      await fetchFotos();
    } catch (e: any) {
      Alert.alert("Erro", e.response?.data?.error || "Não foi possível enviar a foto");
    } finally {
      setUploading(false);
    }
  };

  const tirarFoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) { Alert.alert("Permissão", "Autorize o uso da câmera nas configurações."); return; }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.5, base64: true });
    await enviarFoto(result);
  };

  const escolherDaGaleria = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.5, base64: true, allowsMultipleSelection: true, selectionLimit: 5 });
    await enviarFoto(result);
  };

  return (
    <View style={styles.container}>
      <ObraBanner obra={obra} />
      <ErrorBanner message={error} />

      <View style={styles.actions}>
        <TouchableOpacity style={[styles.actionBtn, (!obra || uploading) && styles.actionBtnDisabled]} onPress={tirarFoto} disabled={!obra || uploading}>
          {uploading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.actionBtnText}>📷 Câmera</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, styles.actionBtnOutline, (!obra || uploading) && styles.actionBtnDisabled]} onPress={escolherDaGaleria} disabled={!obra || uploading}>
          <Text style={[styles.actionBtnText, styles.actionBtnOutlineText]}>🖼️ Galeria</Text>
        </TouchableOpacity>
      </View>

      {!obra ? (
        <EmptyState icon="🏗️" title="Nenhuma obra selecionada" subtitle="Escolha uma obra na aba Obras para ver e enviar fotos." />
      ) : loading ? (
        <ActivityIndicator size="large" color={COLORS.orange} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={fotos}
          keyExtractor={(f) => f.id}
          numColumns={3}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchFotos(); }} colors={[COLORS.orange]} />}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.fotoCard} onPress={() => setLightbox(item)}>
              <Image source={{ uri: item.url }} style={styles.fotoImg} resizeMode="cover" />
              {item.legenda ? <Text style={styles.fotoLegenda} numberOfLines={1}>{item.legenda}</Text> : null}
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.grid}
          ListEmptyComponent={<EmptyState icon="📷" title="Nenhuma foto nesta obra" subtitle="Use a câmera ou a galeria para registrar a evolução da obra." />}
        />
      )}

      <Modal visible={!!lightbox} transparent animationType="fade" onRequestClose={() => setLightbox(null)}>
        <TouchableOpacity style={styles.lightbox} activeOpacity={1} onPress={() => setLightbox(null)}>
          {lightbox && (
            <View style={styles.lightboxContent}>
              <Image source={{ uri: lightbox.url }} style={styles.lightboxImg} resizeMode="contain" />
              <Text style={styles.lightboxLegenda}>{lightbox.legenda || "Sem legenda"}</Text>
              <Text style={styles.lightboxData}>
                {new Date(lightbox.data).toLocaleDateString("pt-BR")}{lightbox.etapa ? ` · ${lightbox.etapa.nome}` : ""}
              </Text>
              <TouchableOpacity style={styles.lightboxClose} onPress={() => setLightbox(null)}>
                <Text style={styles.lightboxCloseText}>Fechar</Text>
              </TouchableOpacity>
            </View>
          )}
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.light },
  actions: { flexDirection: "row", gap: 10, padding: 16, paddingBottom: 8 },
  actionBtn: { flex: 1, backgroundColor: COLORS.orange, borderRadius: 10, padding: 13, alignItems: "center" },
  actionBtnOutline: { backgroundColor: COLORS.white, borderWidth: 1, borderColor: "#E5E7EB" },
  actionBtnDisabled: { opacity: 0.5 },
  actionBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  actionBtnOutlineText: { color: COLORS.dark },
  grid: { padding: 14, paddingTop: 8, flexGrow: 1 },
  fotoCard: { width: "33.33%", aspectRatio: 1, padding: 2 },
  fotoImg: { flex: 1, borderRadius: 6, backgroundColor: "#E5E7EB" },
  fotoLegenda: { fontSize: 9, color: COLORS.gray, textAlign: "center", padding: 2 },
  lightbox: { flex: 1, backgroundColor: "rgba(0,0,0,0.9)", justifyContent: "center", padding: 16 },
  lightboxContent: { alignItems: "center" },
  lightboxImg: { width: "100%", height: 380, borderRadius: 8 },
  lightboxLegenda: { color: "#fff", fontSize: 15, fontWeight: "700", marginTop: 12, textAlign: "center" },
  lightboxData: { color: "#ffffff99", fontSize: 12, marginTop: 4 },
  lightboxClose: { marginTop: 16, backgroundColor: COLORS.orange, borderRadius: 8, paddingHorizontal: 24, paddingVertical: 10 },
  lightboxCloseText: { color: "#fff", fontWeight: "700" },
});
