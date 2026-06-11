import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import { authApi, setUnauthorizedHandler, SessionUser } from "../services/api";

interface AuthState {
  user: SessionUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null, isAuthenticated: false, isLoading: true,

  login: async (email, password) => {
    const user = await authApi.login(email, password);
    await SecureStore.setItemAsync("auth_user", JSON.stringify(user));
    set({ user, isAuthenticated: true, isLoading: false });
  },

  logout: async () => {
    await authApi.logout();
    await SecureStore.deleteItemAsync("auth_user");
    set({ user: null, isAuthenticated: false, isLoading: false });
  },

  restoreSession: async () => {
    try {
      // O cookie de sessão vive no armazenamento nativo; valida no servidor.
      const user = await authApi.session();
      if (user) {
        await SecureStore.setItemAsync("auth_user", JSON.stringify(user));
        set({ user, isAuthenticated: true, isLoading: false });
        return;
      }
      // Sem rede ou sessão expirada: tenta o último usuário salvo p/ modo offline
      const cached = await SecureStore.getItemAsync("auth_user");
      if (cached) {
        set({ user: JSON.parse(cached), isAuthenticated: true, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },
}));

// Sessão expirou em alguma chamada → volta para o login
setUnauthorizedHandler(() => {
  const { isAuthenticated } = useAuthStore.getState();
  if (isAuthenticated) {
    SecureStore.deleteItemAsync("auth_user").catch(() => {});
    useAuthStore.setState({ user: null, isAuthenticated: false });
  }
});
