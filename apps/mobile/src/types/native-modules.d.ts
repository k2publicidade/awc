// Declarações mínimas para o typecheck em ambientes que ainda não executaram
// `npx expo install`. Os pacotes e tipos oficiais são usados no build nativo.
declare module "expo-location" {
  export enum Accuracy { Balanced = 3 }
  export interface LocationObject { coords: { latitude: number; longitude: number } }
  export interface LocationGeocodedAddress { street?: string | null; district?: string | null; city?: string | null }
  export function requestForegroundPermissionsAsync(): Promise<{ granted: boolean }>;
  export function getCurrentPositionAsync(options?: { accuracy?: Accuracy }): Promise<LocationObject>;
  export function reverseGeocodeAsync(location: { latitude: number; longitude: number }): Promise<LocationGeocodedAddress[]>;
}

declare module "react-native-view-shot" {
  export function captureRef(
    view: unknown,
    options?: { format?: "jpg" | "png" | "webm"; quality?: number; result?: "tmpfile" | "base64" | "data-uri" | "zip-base64" }
  ): Promise<string>;
}

declare module "expo-speech-recognition" {
  export interface SpeechRecognitionResultEvent {
    results: Array<{ transcript: string; confidence?: number }>;
  }
  export interface SpeechRecognitionErrorEvent { error?: string; message?: string }
  export const ExpoSpeechRecognitionModule: {
    requestPermissionsAsync(): Promise<{ granted: boolean }>;
    start(options: { lang: string; interimResults?: boolean; continuous?: boolean; maxAlternatives?: number }): void;
    stop(): void;
    abort(): void;
  };
  export function useSpeechRecognitionEvent(type: "start" | "end", listener: () => void): void;
  export function useSpeechRecognitionEvent(type: "result", listener: (event: SpeechRecognitionResultEvent) => void): void;
  export function useSpeechRecognitionEvent(type: "error", listener: (event: SpeechRecognitionErrorEvent) => void): void;
}
