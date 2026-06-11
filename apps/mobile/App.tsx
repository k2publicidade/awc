import React, { useEffect } from "react";
import { StyleSheet, ActivityIndicator, View, Text } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { AppNavigator } from "./src/navigation/AppNavigator";
import { useAuthStore } from "./src/store/authStore";
import { useObraStore } from "./src/store/obraStore";
import { syncAll, getPendingCount } from "./src/services/sync";
import { useSyncStore } from "./src/store/syncStore";
import { COLORS } from "./src/services/config";

export default function App() {
  const { isLoading, restoreSession, isAuthenticated } = useAuthStore();
  const restoreObra = useObraStore((s) => s.restore);
  const { setSyncing, setLastSync, setPending } = useSyncStore();

  useEffect(() => {
    restoreSession();
    restoreObra();
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    // Sincroniza a fila offline ao abrir e a cada 5 minutos
    const doSync = async () => {
      setSyncing(true);
      try {
        const result = await syncAll();
        if (result.synced > 0) setLastSync(new Date().toISOString());
        setPending(await getPendingCount());
      } finally {
        setSyncing(false);
      }
    };
    doSync();
    const interval = setInterval(doSync, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  if (isLoading) {
    return (
      <View style={styles.splash}>
        <Text style={styles.splashLogo}>AWC</Text>
        <Text style={styles.splashSub}>Pré Moldados</Text>
        <ActivityIndicator size="large" color={COLORS.orange} style={{ marginTop: 20 }} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.root} edges={["top"]}>
        <StatusBar style="light" backgroundColor={COLORS.dark} />
        <AppNavigator />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.dark },
  splash: { flex: 1, backgroundColor: COLORS.dark, justifyContent: "center", alignItems: "center" },
  splashLogo: { color: COLORS.orange, fontSize: 48, fontWeight: "800" },
  splashSub: { color: "#fff", fontSize: 14, letterSpacing: 4, textTransform: "uppercase" },
});
