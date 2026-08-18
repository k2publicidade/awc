import React from "react";
import { Text } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuthStore } from "../store/authStore";
import { COLORS } from "../services/config";

// Screens
import { LoginScreen } from "../screens/LoginScreen";
import { DashboardScreen } from "../screens/DashboardScreen";
import { RDOListScreen } from "../screens/RDOListScreen";
import { RDOFormScreen } from "../screens/RDOFormScreen";
import { GaleriaScreen } from "../screens/GaleriaScreen";
import { ChecklistScreen } from "../screens/ChecklistScreen";
import { RequisicaoScreen } from "../screens/RequisicaoScreen";
import { CronogramaScreen } from "../screens/CronogramaScreen";
import { OcorrenciaScreen } from "../screens/OcorrenciaScreen";
import { NotificacaoScreen } from "../screens/NotificacaoScreen";
import { MaisScreen } from "../screens/MaisScreen";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const TAB_ICONS: Record<string, string> = {
  Home: "🏠", RDO: "📋", Fotos: "📷", Check: "✅", Mais: "•••",
};

const TabIcon = ({ name, size }: { name: string; color: string; size: number }) => (
  <Text style={{ fontSize: size * 0.8 }}>{TAB_ICONS[name] || "📱"}</Text>
);

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: COLORS.orange,
        tabBarInactiveTintColor: COLORS.gray,
        tabBarStyle: { backgroundColor: COLORS.white, borderTopColor: "#D5DBE0", minHeight: 58, paddingBottom: 5 },
        tabBarItemStyle: { minWidth: 68 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "700" },
        headerStyle: { backgroundColor: COLORS.dark },
        headerTintColor: COLORS.white,
        headerTitleStyle: { fontWeight: "700" },
      }}
    >
      <Tab.Screen name="Home" component={DashboardScreen} options={{ title: "Obras", tabBarIcon: (props) => <TabIcon name="Home" {...props} /> }} />
      <Tab.Screen name="RDO" component={RDOListScreen} options={{ title: "RDO", tabBarIcon: (props) => <TabIcon name="RDO" {...props} /> }} />
      <Tab.Screen name="Fotos" component={GaleriaScreen} options={{ title: "Fotos", tabBarIcon: (props) => <TabIcon name="Fotos" {...props} /> }} />
      <Tab.Screen name="Check" component={ChecklistScreen} options={{ title: "Inspeção", tabBarIcon: (props) => <TabIcon name="Check" {...props} /> }} />
      <Tab.Screen name="Mais" component={MaisScreen} options={{ title: "Mais", tabBarIcon: (props) => <TabIcon name="Mais" {...props} /> }} />
    </Tab.Navigator>
  );
}

function MainStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
      <Stack.Screen name="RDOForm" component={RDOFormScreen} options={{ title: "Novo RDO", presentation: "modal", headerStyle: { backgroundColor: COLORS.dark }, headerTintColor: COLORS.white }} />
      <Stack.Screen name="Pedido" component={RequisicaoScreen} options={{ title: "Materiais", headerStyle: { backgroundColor: COLORS.dark }, headerTintColor: COLORS.white }} />
      <Stack.Screen name="Gantt" component={CronogramaScreen} options={{ title: "Cronograma", headerStyle: { backgroundColor: COLORS.dark }, headerTintColor: COLORS.white }} />
      <Stack.Screen name="Alerta" component={OcorrenciaScreen} options={{ title: "Ocorrências", headerStyle: { backgroundColor: COLORS.dark }, headerTintColor: COLORS.white }} />
      <Stack.Screen name="Bell" component={NotificacaoScreen} options={{ title: "Avisos", headerStyle: { backgroundColor: COLORS.dark }, headerTintColor: COLORS.white }} />
    </Stack.Navigator>
  );
}

export function AppNavigator() {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) return null; // splash

  return (
    <NavigationContainer>
      {isAuthenticated ? (
        <MainStack />
      ) : (
        <Stack.Navigator>
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
}
