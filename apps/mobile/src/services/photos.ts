import * as FileSystem from "expo-file-system";
import { genId } from "../lib/id";

/** Move uma captura temporária para armazenamento durável antes de entrar na fila offline. */
export async function persistOfflinePhoto(uri: string) {
  if (uri.startsWith("data:")) return uri;
  const directory = `${FileSystem.documentDirectory}field-photos/`;
  await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
  const destination = `${directory}${genId()}.jpg`;
  await FileSystem.copyAsync({ from: uri, to: destination });
  return destination;
}
