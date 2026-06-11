import { create } from "zustand";

interface SyncState {
  isSyncing: boolean;
  lastSyncAt: string | null;
  pendingCount: number;
  setSyncing: (v: boolean) => void;
  setLastSync: (d: string) => void;
  setPending: (n: number) => void;
}

export const useSyncStore = create<SyncState>((set) => ({
  isSyncing: false, lastSyncAt: null, pendingCount: 0,
  setSyncing: (v) => set({ isSyncing: v }),
  setLastSync: (d) => set({ lastSyncAt: d }),
  setPending: (n) => set({ pendingCount: n }),
}));
