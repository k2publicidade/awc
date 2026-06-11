import { Platform } from "react-native";

export const getApiUrl = () => {
  if (Platform.OS === "web") return process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000/api";
  return process.env.EXPO_PUBLIC_API_URL || "http://10.0.2.2:3000/api";
};

export const COLORS = {
  orange: "#FF6B00",
  dark: "#1E2832",
  gray: "#4A5568",
  light: "#F7F8FA",
  white: "#FFFFFF",
  success: "#22C55E",
  warning: "#F59E0B",
  danger: "#EF4444",
  info: "#3B82F6",
};
