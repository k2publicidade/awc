import { Platform } from "react-native";
import Constants from "expo-constants";

export const getApiUrl = () => {
  const envUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
  const configuredUrl = Constants.expoConfig?.extra?.apiUrl;
  const appConfigUrl = typeof configuredUrl === "string" ? configuredUrl.trim() : "";
  const explicitUrl = envUrl || appConfigUrl;
  if (explicitUrl) return explicitUrl.replace(/\/$/, "");

  if (__DEV__) {
    return Platform.OS === "android" ? "http://10.0.2.2:3000/api" : "http://localhost:3000/api";
  }

  throw new Error(
    "API do RIGOR não configurada. Defina EXPO_PUBLIC_API_URL no build de release ou expo.extra.apiUrl no app config."
  );
};

/** Converte caminhos persistidos pelo backend em URLs utilizáveis pelo Image nativo. */
export const resolveApiAssetUrl = (url: string) => {
  if (!url || /^(https?:|file:|data:)/i.test(url)) return url;
  const apiUrl = getApiUrl().replace(/\/$/, "");
  const origin = apiUrl.replace(/\/api$/, "");
  return `${origin}${url.startsWith("/") ? "" : "/"}${url}`;
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
