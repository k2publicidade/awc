import React, { useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from "expo-speech-recognition";
import { COLORS } from "../services/config";

type VoiceState = "idle" | "listening" | "processing" | "review" | "error";

export function VoiceTranscription({ onInsert }: { onInsert: (text: string) => void }) {
  const [state, setState] = useState<VoiceState>("idle");
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState("");
  const transcriptRef = useRef("");
  const failedRef = useRef(false);

  const updateTranscript = (value: string) => {
    transcriptRef.current = value;
    setTranscript(value);
  };

  useSpeechRecognitionEvent("start", () => {
    failedRef.current = false;
    setState("listening");
  });
  useSpeechRecognitionEvent("result", (event) => {
    const text = event.results[0]?.transcript?.trim();
    if (text) updateTranscript(text);
  });
  useSpeechRecognitionEvent("error", (event) => {
    failedRef.current = true;
    setError(event.message || event.error || "Não foi possível reconhecer a fala.");
    setState("error");
  });
  useSpeechRecognitionEvent("end", () => {
    if (failedRef.current) return;
    setState(transcriptRef.current.trim() ? "review" : "idle");
  });

  const start = async () => {
    failedRef.current = false;
    setError("");
    updateTranscript("");
    setState("processing");
    try {
      const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!permission.granted) {
        setError("Permita o acesso ao microfone e ao reconhecimento de fala nas configurações do aparelho.");
        setState("error");
        return;
      }
      ExpoSpeechRecognitionModule.start({
        lang: "pt-BR",
        interimResults: true,
        continuous: false,
        maxAlternatives: 1,
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Reconhecimento de fala indisponível neste aparelho.");
      setState("error");
    }
  };

  const stop = () => {
    setState("processing");
    try {
      ExpoSpeechRecognitionModule.stop();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível concluir o reconhecimento.");
      setState("error");
    }
  };

  const cancel = () => {
    failedRef.current = true;
    try { ExpoSpeechRecognitionModule.abort(); } catch { /* a sessão pode já ter terminado */ }
    updateTranscript("");
    setError("");
    setState("idle");
  };

  const insert = () => {
    const reviewed = transcript.trim();
    if (!reviewed) return;
    onInsert(reviewed);
    updateTranscript("");
    setState("idle");
  };

  if (state === "idle") {
    return (
      <TouchableOpacity style={styles.start} onPress={start} accessibilityRole="button" accessibilityLabel="Iniciar transcrição por voz em português">
        <View style={styles.mic}><Text style={styles.micText}>●</Text></View>
        <View style={styles.startCopy}>
          <Text style={styles.startTitle}>Transcrever por voz</Text>
          <Text style={styles.startHint}>Português (Brasil) · toque para falar</Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>
    );
  }

  if (state === "listening" || state === "processing") {
    return (
      <View style={styles.active} accessibilityLiveRegion="polite">
        <View style={styles.statusRow}>
          {state === "processing" ? <ActivityIndicator color={COLORS.orange} size="small" /> : <View style={styles.pulse} />}
          <View style={{ flex: 1 }}>
            <Text style={styles.activeTitle}>{state === "listening" ? "Ouvindo…" : "Processando fala…"}</Text>
            <Text style={styles.activeHint}>{transcript || "Fale naturalmente e descreva a ocorrência."}</Text>
          </View>
        </View>
        <View style={styles.controls}>
          {state === "listening" && (
            <TouchableOpacity style={styles.stop} onPress={stop}><Text style={styles.stopText}>Concluir fala</Text></TouchableOpacity>
          )}
          <TouchableOpacity style={styles.cancel} onPress={cancel}><Text style={styles.cancelText}>Cancelar</Text></TouchableOpacity>
        </View>
      </View>
    );
  }

  if (state === "error") {
    return (
      <View style={styles.errorBox} accessibilityLiveRegion="assertive">
        <Text style={styles.errorTitle}>Transcrição indisponível</Text>
        <Text style={styles.errorText}>{error}</Text>
        <View style={styles.controls}>
          <TouchableOpacity style={styles.retry} onPress={start}><Text style={styles.retryText}>Tentar novamente</Text></TouchableOpacity>
          <TouchableOpacity style={styles.cancel} onPress={cancel}><Text style={styles.cancelText}>Fechar</Text></TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.review}>
      <Text style={styles.reviewLabel}>REVISE ANTES DE INSERIR</Text>
      <TextInput
        style={styles.reviewInput}
        value={transcript}
        onChangeText={updateTranscript}
        multiline
        textAlignVertical="top"
        accessibilityLabel="Texto transcrito para revisão"
      />
      <View style={styles.controls}>
        <TouchableOpacity style={styles.insert} onPress={insert}><Text style={styles.insertText}>Inserir na ocorrência</Text></TouchableOpacity>
        <TouchableOpacity style={styles.cancel} onPress={cancel}><Text style={styles.cancelText}>Descartar</Text></TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  start: { minHeight: 62, flexDirection: "row", alignItems: "center", backgroundColor: "#E5EDF2", borderRadius: 4, padding: 10, marginBottom: 8 },
  mic: { width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.orange, alignItems: "center", justifyContent: "center" },
  micText: { color: "#fff", fontSize: 14 },
  startCopy: { flex: 1, paddingHorizontal: 11 },
  startTitle: { color: COLORS.dark, fontSize: 13, fontWeight: "900" },
  startHint: { color: COLORS.gray, fontSize: 10, marginTop: 2 },
  chevron: { color: COLORS.orange, fontSize: 27, fontWeight: "500" },
  active: { backgroundColor: "#17222C", borderLeftWidth: 4, borderLeftColor: COLORS.orange, borderRadius: 4, padding: 13, marginBottom: 8 },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  pulse: { width: 12, height: 12, borderRadius: 6, backgroundColor: "#FF6B00", borderWidth: 3, borderColor: "#FFB47E" },
  activeTitle: { color: "#fff", fontSize: 13, fontWeight: "900" },
  activeHint: { color: "#B9C4CC", fontSize: 11, lineHeight: 16, marginTop: 3 },
  controls: { flexDirection: "row", gap: 8, marginTop: 12 },
  stop: { flex: 1, minHeight: 42, borderRadius: 4, backgroundColor: COLORS.orange, alignItems: "center", justifyContent: "center" },
  stopText: { color: "#fff", fontSize: 12, fontWeight: "900" },
  cancel: { minHeight: 42, paddingHorizontal: 15, borderRadius: 4, borderWidth: 1, borderColor: "#AAB4BC", alignItems: "center", justifyContent: "center" },
  cancelText: { color: "#53616C", fontSize: 12, fontWeight: "800" },
  review: { backgroundColor: "#fff", borderRadius: 4, borderWidth: 1, borderColor: "#CBD3D9", padding: 12, marginBottom: 8 },
  reviewLabel: { color: COLORS.orange, fontSize: 9, fontWeight: "900", letterSpacing: 1.2 },
  reviewInput: { minHeight: 86, color: COLORS.dark, fontSize: 14, lineHeight: 20, padding: 10, backgroundColor: "#F4F6F7", borderRadius: 3, marginTop: 7 },
  insert: { flex: 1, minHeight: 42, borderRadius: 4, backgroundColor: COLORS.orange, alignItems: "center", justifyContent: "center" },
  insertText: { color: "#fff", fontSize: 12, fontWeight: "900" },
  errorBox: { backgroundColor: "#FFF1F0", borderLeftWidth: 4, borderLeftColor: COLORS.danger, borderRadius: 4, padding: 12, marginBottom: 8 },
  errorTitle: { color: "#9F1D20", fontSize: 13, fontWeight: "900" },
  errorText: { color: "#7D3436", fontSize: 11, lineHeight: 16, marginTop: 4 },
  retry: { flex: 1, minHeight: 42, borderRadius: 4, backgroundColor: "#9F1D20", alignItems: "center", justifyContent: "center" },
  retryText: { color: "#fff", fontSize: 12, fontWeight: "900" },
});
