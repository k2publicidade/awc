import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform } from "react-native";
import { useAuthStore } from "../store/authStore";
import { COLORS } from "../services/config";

export function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const login = useAuthStore((s) => s.login);

  const handleLogin = async () => {
    if (!email || !password) { setError("Preencha todos os campos"); return; }
    setLoading(true); setError("");
    try {
      await login(email.trim(), password);
    } catch (e: any) {
      setError(e.message || e.response?.data?.error || "Erro ao fazer login");
    } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.container}>
      <View style={styles.card}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>AWC</Text>
          <Text style={styles.logoSub}>Pré Moldados</Text>
        </View>
        <Text style={styles.title}>ObrasAWC</Text>
        <Text style={styles.subtitle}>Sistema de Gestão de Obras</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail}
          keyboardType="email-address" autoCapitalize="none" autoCorrect={false} placeholderTextColor={COLORS.gray} />
        <TextInput style={styles.input} placeholder="Senha" value={password} onChangeText={setPassword}
          secureTextEntry placeholderTextColor={COLORS.gray} />

        <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Entrar</Text>}
        </TouchableOpacity>

        <Text style={styles.hint}>Use a mesma conta do sistema web</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.dark, justifyContent: "center", padding: 24 },
  card: { backgroundColor: COLORS.white, borderRadius: 16, padding: 32, maxWidth: 400, alignSelf: "center", width: "100%" },
  logoContainer: { backgroundColor: COLORS.dark, borderRadius: 12, padding: 16, alignSelf: "center", marginBottom: 24 },
  logoText: { color: COLORS.orange, fontSize: 32, fontWeight: "800", textAlign: "center" },
  logoSub: { color: COLORS.white, fontSize: 12, textAlign: "center" },
  title: { fontSize: 24, fontWeight: "700", color: COLORS.dark, textAlign: "center" },
  subtitle: { fontSize: 13, color: COLORS.gray, textAlign: "center", marginBottom: 32 },
  input: { borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10, padding: 14, fontSize: 15, marginBottom: 12, color: COLORS.dark },
  button: { backgroundColor: COLORS.orange, borderRadius: 10, padding: 16, alignItems: "center", marginTop: 8 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  hint: { color: COLORS.gray, fontSize: 12, textAlign: "center", marginTop: 16 },
  error: { color: COLORS.danger, fontSize: 13, textAlign: "center", marginBottom: 12 },
});
