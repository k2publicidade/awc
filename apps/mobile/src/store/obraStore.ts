import { create } from "zustand";
import * as SecureStore from "expo-secure-store";

export interface ObraAtiva { id: string; nome: string; codigo: string }

interface ObraState {
  obra: ObraAtiva | null;
  setObra: (obra: ObraAtiva) => Promise<void>;
  restore: () => Promise<void>;
}

/** Obra ativa selecionada no Dashboard — contexto de todas as telas. */
export const useObraStore = create<ObraState>((set) => ({
  obra: null,

  setObra: async (obra) => {
    await SecureStore.setItemAsync("obra_ativa", JSON.stringify(obra));
    set({ obra });
  },

  restore: async () => {
    try {
      const raw = await SecureStore.getItemAsync("obra_ativa");
      if (raw) set({ obra: JSON.parse(raw) });
    } catch { /* primeira execução */ }
  },
}));
