import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { COLORS } from "../services/config";
import { ObraBanner } from "../components/ui";
import { useObraStore } from "../store/obraStore";

const destinations = [
  { route: "Pedido", icon: "📦", title: "Materiais", description: "Solicitações e consumo" },
  { route: "Gantt", icon: "▥", title: "Cronograma", description: "Etapas e avanço" },
  { route: "Alerta", icon: "⚠", title: "Ocorrências", description: "Riscos e impedimentos" },
  { route: "Bell", icon: "●", title: "Avisos", description: "Notificações da equipe" },
] as const;

export function MaisScreen({ navigation }: any) {
  const obra = useObraStore((state) => state.obra);
  return (
    <View style={styles.page}>
      <ObraBanner obra={obra} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.kicker}>FERRAMENTAS DE CAMPO</Text>
        <Text style={styles.title}>Mais recursos</Text>
        <Text style={styles.subtitle}>Acesse planejamento, suprimentos e comunicação sem apertar a barra inferior.</Text>
        <View style={styles.grid}>
          {destinations.map((item) => (
            <TouchableOpacity
              key={item.route}
              style={styles.card}
              onPress={() => navigation.navigate(item.route)}
              accessibilityRole="button"
              accessibilityLabel={`${item.title}: ${item.description}`}
            >
              <Text style={styles.icon}>{item.icon}</Text>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardDescription}>{item.description}</Text>
              <Text style={styles.arrow}>Abrir →</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#EEF1F3" },
  content: { padding: 18, paddingBottom: 32 },
  kicker: { color: COLORS.orange, fontSize: 10, fontWeight: "900", letterSpacing: 1.8 },
  title: { color: COLORS.dark, fontSize: 27, lineHeight: 32, fontWeight: "900", marginTop: 4 },
  subtitle: { color: COLORS.gray, fontSize: 13, lineHeight: 19, marginTop: 5, maxWidth: 330 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 22 },
  card: { width: "48%", minHeight: 154, backgroundColor: COLORS.white, borderRadius: 4, borderTopWidth: 4, borderTopColor: COLORS.orange, padding: 15, elevation: 1 },
  icon: { color: COLORS.orange, fontSize: 22, fontWeight: "900" },
  cardTitle: { color: COLORS.dark, fontSize: 16, fontWeight: "900", marginTop: 10 },
  cardDescription: { color: COLORS.gray, fontSize: 11, lineHeight: 16, marginTop: 3 },
  arrow: { color: "#C84E00", fontSize: 11, fontWeight: "800", marginTop: "auto" },
});
