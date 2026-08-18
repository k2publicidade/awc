import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator, Alert, Image, Modal, StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { captureRef } from "react-native-view-shot";
import { ObraAtiva } from "../store/obraStore";
import { COLORS } from "../services/config";

export interface ComposedFieldPhoto {
  uri: string;
  legenda: string;
  capturedAt: string;
  latitude?: number;
  longitude?: number;
  locationLabel: string;
}

interface Props {
  asset: ImagePicker.ImagePickerAsset | null;
  obra: ObraAtiva | null;
  responsavel: string;
  onCancel: () => void;
  onReady: (photo: ComposedFieldPhoto) => void | Promise<void>;
}

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "medium" });

/**
 * Revisão antes do envio e composição da marca d'água no próprio JPEG.
 * O view-shot captura imagem e overlay juntos, sem depender de um serviço remoto.
 */
export function FieldPhotoComposer({ asset, obra, responsavel, onCancel, onReady }: Props) {
  const captureView = useRef<View>(null);
  const [capturedAt, setCapturedAt] = useState("");
  const [locationLabel, setLocationLabel] = useState("Obtendo localização…");
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [legenda, setLegenda] = useState("");
  const [imageLoaded, setImageLoaded] = useState(false);
  const [preparing, setPreparing] = useState(false);

  useEffect(() => {
    if (!asset) return;
    setCapturedAt(new Date().toISOString());
    setLegenda("");
    setImageLoaded(false);
    setCoords(null);
    setLocationLabel("Obtendo localização…");
    let active = true;
    void (async () => {
      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (!permission.granted) {
          if (active) setLocationLabel("Localização não autorizada");
          return;
        }
        const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (!active) return;
        const next = { latitude: position.coords.latitude, longitude: position.coords.longitude };
        setCoords(next);
        setLocationLabel(`${next.latitude.toFixed(6)}, ${next.longitude.toFixed(6)}`);
        try {
          const places = await Location.reverseGeocodeAsync(next);
          const place = places[0];
          const readable = [place?.street, place?.district, place?.city].filter(Boolean).join(" · ");
          if (active && readable) setLocationLabel(`${readable} | ${next.latitude.toFixed(5)}, ${next.longitude.toFixed(5)}`);
        } catch { /* coordenadas continuam disponíveis mesmo sem geocodificação */ }
      } catch {
        if (active) setLocationLabel("Localização indisponível");
      }
    })();
    return () => { active = false; };
  }, [asset?.uri]);

  const confirm = async () => {
    if (!imageLoaded || !asset || preparing) return;
    setPreparing(true);
    try {
      const uri = await captureRef(captureView, { format: "jpg", quality: 0.9, result: "tmpfile" });
      await onReady({
        uri, legenda: legenda.trim(), capturedAt,
        latitude: coords?.latitude, longitude: coords?.longitude, locationLabel,
      });
    } catch {
      Alert.alert("Não foi possível preparar a foto", "Tente capturar novamente antes de continuar.");
    } finally {
      setPreparing(false);
    }
  };

  return (
    <Modal visible={!!asset} animationType="slide" presentationStyle="fullScreen" onRequestClose={onCancel}>
      <View style={styles.page}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onCancel} accessibilityRole="button"><Text style={styles.cancel}>Cancelar</Text></TouchableOpacity>
          <View><Text style={styles.eyebrow}>REGISTRO DE CAMPO</Text><Text style={styles.title}>Revisar fotografia</Text></View>
          <View style={{ width: 58 }} />
        </View>

        {asset && (
          <View ref={captureView} collapsable={false} style={styles.capture}>
            <Image source={{ uri: asset.uri }} style={styles.photo} resizeMode="cover" onLoad={() => setImageLoaded(true)} />
            <View style={styles.watermark}>
              <View style={styles.markAccent} />
              <View style={styles.markBody}>
                <Text style={styles.markBrand}>RIGOR · REGISTRO AUTÊNTICO</Text>
                <Text style={styles.markWork} numberOfLines={1}>{obra ? `${obra.codigo} — ${obra.nome}` : "Obra não identificada"}</Text>
                <Text style={styles.markMeta}>{formatDateTime(capturedAt)} · {responsavel || "Responsável não informado"}</Text>
                <Text style={styles.markLocation} numberOfLines={2}>⌖ {locationLabel}</Text>
              </View>
            </View>
          </View>
        )}

        <View style={styles.form}>
          <Text style={styles.fieldLabel}>LEGENDA DA FOTO</Text>
          <TextInput
            style={styles.input}
            value={legenda}
            onChangeText={setLegenda}
            placeholder="Ex.: concretagem do bloco B concluída"
            placeholderTextColor="#83909B"
            maxLength={160}
            returnKeyType="done"
          />
          <Text style={styles.hint}>A marca d'água acima será gravada no arquivo. A localização pode ser recusada sem impedir o registro.</Text>
        </View>

        <TouchableOpacity style={[styles.confirm, (!imageLoaded || preparing) && styles.disabled]} onPress={confirm} disabled={!imageLoaded || preparing}>
          {preparing ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmText}>Usar foto com identificação</Text>}
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#111820", paddingTop: 20 },
  header: { minHeight: 70, paddingHorizontal: 18, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cancel: { color: "#FF9B54", fontSize: 14, fontWeight: "700", width: 58 },
  eyebrow: { color: "#FF8A38", fontSize: 9, fontWeight: "900", letterSpacing: 1.5, textAlign: "center" },
  title: { color: "#fff", fontSize: 18, fontWeight: "800", textAlign: "center", marginTop: 2 },
  capture: { marginHorizontal: 14, aspectRatio: 3 / 4, maxHeight: "66%", backgroundColor: "#050708", overflow: "hidden", borderRadius: 4 },
  photo: { width: "100%", height: "100%" },
  watermark: { position: "absolute", left: 12, right: 12, bottom: 12, flexDirection: "row", backgroundColor: "rgba(12,18,24,0.88)" },
  markAccent: { width: 5, backgroundColor: COLORS.orange },
  markBody: { flex: 1, paddingHorizontal: 10, paddingVertical: 8 },
  markBrand: { color: "#FF9B54", fontSize: 8, fontWeight: "900", letterSpacing: 1.1 },
  markWork: { color: "#fff", fontSize: 13, fontWeight: "900", marginTop: 2 },
  markMeta: { color: "#E4E9ED", fontSize: 10, fontWeight: "600", marginTop: 2 },
  markLocation: { color: "#B9C4CC", fontSize: 9, marginTop: 2 },
  form: { paddingHorizontal: 18, paddingTop: 16 },
  fieldLabel: { color: "#AEB9C1", fontSize: 10, fontWeight: "800", letterSpacing: 1.2, marginBottom: 7 },
  input: { height: 48, borderRadius: 4, backgroundColor: "#F5F7F8", paddingHorizontal: 14, color: COLORS.dark, fontSize: 14 },
  hint: { color: "#83909B", fontSize: 11, lineHeight: 16, marginTop: 8 },
  confirm: { margin: 18, marginTop: "auto", height: 54, borderRadius: 4, backgroundColor: COLORS.orange, justifyContent: "center", alignItems: "center" },
  disabled: { opacity: 0.5 },
  confirmText: { color: "#fff", fontSize: 15, fontWeight: "900" },
});
