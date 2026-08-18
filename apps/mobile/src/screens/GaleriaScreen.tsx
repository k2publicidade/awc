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
import { useAuthStore } from "../store/authStore";
import { FieldPhotoComposer, ComposedFieldPhoto } from "../components/FieldPhotoComposer";
import { persistOfflinePhoto } from "../services/photos";
import { resolveApiAssetUrl } from "../services/config";

export function GaleriaScreen() {
  const obra = useObraStore((s) => s.obra);
  const setPending = useSyncStore((s) => s.setPending);
  const user = useAuthStore((s) => s.user);
  const [fotos, setFotos] = useState<Foto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [lightbox, setLightbox] = useState<Foto | null>(null);
  const [photoQueue, setPhotoQueue] = useState<ImagePicker.ImagePickerAsset[]>([]);

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

  const queueResult = (result: ImagePicker.ImagePickerResult) => {
    if (!obra || result.canceled) return;
    setPhotoQueue((current) => [...current, ...result.assets]);
  };

  const enviarFoto = async (photo: ComposedFieldPhoto) => {
    if (!obra) return;
    setUploading(true);
    try {
      const isConnected = await checkConnectivity();
      if (isConnected) {
        await galeriaApi.uploadPhoto(photo.uri, { obraId: obra.id, legenda: photo.legenda });
      } else {
        const durableUri = await persistOfflinePhoto(photo.uri);
        await saveFotoOffline(genId(), obra.id, durableUri, photo.legenda);
        setPending(await getPendingCount());
        Alert.alert("Foto protegida", "O arquivo ficou salvo neste aparelho e será enviado quando a conexão voltar.");
      }
      setPhotoQueue((current) => current.slice(1));
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
    const result = await ImagePicker.launchCameraAsync({ quality: 0.82 });
    queueResult(result);
  };

  const escolherDaGaleria = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.82, allowsMultipleSelection: true, selectionLimit: 5 });
    queueResult(result);
  };

  return (
    <View style={styles.container}>
      <ObraBanner obra={obra} />
      <ErrorBanner message={error} />

      <View style={styles.intro}>
        <Text style={styles.kicker}>DIÁRIO VISUAL</Text>
        <Text style={styles.heading}>Evolução em campo</Text>
        <Text style={styles.subheading}>Fotos identificadas com obra, responsável, horário e localização.</Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={[styles.actionBtn, (!obra || uploading) && styles.actionBtnDisabled]} onPress={tirarFoto} disabled={!obra || uploading}>
          {uploading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.actionBtnText}>＋ Registrar agora</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, styles.actionBtnOutline, (!obra || uploading) && styles.actionBtnDisabled]} onPress={escolherDaGaleria} disabled={!obra || uploading}>
          <Text style={[styles.actionBtnText, styles.actionBtnOutlineText]}>Escolher arquivo</Text>
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
              <Image source={{ uri: resolveApiAssetUrl(item.url) }} style={styles.fotoImg} resizeMode="cover" />
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
              <Image source={{ uri: resolveApiAssetUrl(lightbox.url) }} style={styles.lightboxImg} resizeMode="contain" />
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
      <FieldPhotoComposer
        asset={photoQueue[0] || null}
        obra={obra}
        responsavel={user?.name || "Responsável de campo"}
        onCancel={() => setPhotoQueue((current) => current.slice(1))}
        onReady={enviarFoto}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.light },
  intro: { paddingHorizontal: 18, paddingTop: 18 },
  kicker: { color: COLORS.orange, fontSize: 10, fontWeight: "900", letterSpacing: 1.8 },
  heading: { color: COLORS.dark, fontSize: 25, lineHeight: 30, fontWeight: "900", marginTop: 3 },
  subheading: { color: COLORS.gray, fontSize: 12, lineHeight: 17, marginTop: 3 },
  actions: { flexDirection: "row", gap: 10, padding: 18, paddingTop: 14, paddingBottom: 8 },
  actionBtn: { flex: 1.25, backgroundColor: COLORS.orange, borderRadius: 4, minHeight: 48, justifyContent: "center", alignItems: "center" },
  actionBtnOutline: { flex: 1, backgroundColor: COLORS.white, borderWidth: 1, borderColor: "#CDD4DA" },
  actionBtnDisabled: { opacity: 0.5 },
  actionBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  actionBtnOutlineText: { color: COLORS.dark },
  grid: { padding: 16, paddingTop: 8, flexGrow: 1 },
  fotoCard: { width: "33.33%", aspectRatio: 0.86, padding: 3 },
  fotoImg: { flex: 1, borderRadius: 3, backgroundColor: "#E5E7EB" },
  fotoLegenda: { fontSize: 9, color: COLORS.gray, textAlign: "center", padding: 2 },
  lightbox: { flex: 1, backgroundColor: "rgba(0,0,0,0.9)", justifyContent: "center", padding: 16 },
  lightboxContent: { alignItems: "center" },
  lightboxImg: { width: "100%", height: 380, borderRadius: 8 },
  lightboxLegenda: { color: "#fff", fontSize: 15, fontWeight: "700", marginTop: 12, textAlign: "center" },
  lightboxData: { color: "#ffffff99", fontSize: 12, marginTop: 4 },
  lightboxClose: { marginTop: 16, backgroundColor: COLORS.orange, borderRadius: 8, paddingHorizontal: 24, paddingVertical: 10 },
  lightboxCloseText: { color: "#fff", fontWeight: "700" },
});
