import axios from "axios";
import * as FileSystem from "expo-file-system";
import { getApiUrl } from "./config";

/**
 * Cliente HTTP do RIGOR mobile.
 *
 * Autenticação: fluxo de credenciais do NextAuth (mesmo backend da web).
 * O React Native gerencia cookies na camada nativa, então o cookie de sessão
 * (next-auth.session-token) é persistido e enviado automaticamente.
 */
const api = axios.create({ baseURL: getApiUrl(), timeout: 20000, withCredentials: true });

let onUnauthorized: (() => void) | null = null;
/** Registrado pelo authStore para deslogar quando a sessão expirar. */
export const setUnauthorizedHandler = (fn: () => void) => { onUnauthorized = fn; };

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401 && onUnauthorized) onUnauthorized();
    return Promise.reject(error);
  }
);

export interface SessionUser {
  id: string; name: string; email: string; role: string; tenantId: string;
}

export const authApi = {
  /** Login via NextAuth credentials. Retorna o usuário da sessão ou lança erro. */
  login: async (email: string, password: string): Promise<SessionUser> => {
    const csrf = await api.get("/auth/csrf");
    const csrfToken: string = csrf.data?.csrfToken;
    const body = new URLSearchParams({ csrfToken, email, password, json: "true" }).toString();
    await api.post("/auth/callback/credentials", body, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      // o NextAuth responde 200 com {url}; em erro a url contém ?error=
      validateStatus: (s) => s < 500,
    });
    const session = await api.get("/auth/session");
    const user = session.data?.user;
    if (!user?.email) throw new Error("Email ou senha inválidos");
    return user as SessionUser;
  },

  /** Sessão atual (null se não autenticado). */
  session: async (): Promise<SessionUser | null> => {
    try {
      const res = await api.get("/auth/session");
      return res.data?.user?.email ? (res.data.user as SessionUser) : null;
    } catch {
      return null;
    }
  },

  logout: async () => {
    try {
      const csrf = await api.get("/auth/csrf");
      const body = new URLSearchParams({ csrfToken: csrf.data?.csrfToken, json: "true" }).toString();
      await api.post("/auth/signout", body, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        validateStatus: () => true,
      });
    } catch { /* sessão local é limpa de qualquer forma */ }
  },
};

export const obrasApi = {
  list: () => api.get("/obras"),
  get: (id: string) => api.get(`/obras/${id}`),
};

export const rdoApi = {
  list: (obraId?: string) => api.get(obraId ? `/rdo?obraId=${obraId}` : "/rdo"),
  create: (data: any) => api.post("/rdo", data),
  get: (id: string) => api.get(`/rdo/${id}`),
  update: (id: string, data: any) => api.put(`/rdo/${id}`, data),
};

export const cronogramaApi = {
  /** Retorna { etapas, versoes } da obra. */
  get: (obraId: string) => api.get(`/cronograma/${obraId}`),
};

export const materiaisApi = {
  list: () => api.get("/materiais"),
  /** Cria uma requisição de compra (fluxo de aprovação no almoxarifado). */
  requisitar: (data: { obraId: string; materialId: string; quantidade: number; justificativa?: string }) =>
    api.post("/crud/requisicoes", data),
};

export const ocorrenciasApi = {
  list: (obraId?: string) => api.get(obraId ? `/ocorrencias?obraId=${obraId}` : "/ocorrencias"),
  create: (data: { obraId: string; tipo: string; descricao: string; data?: string }) =>
    api.post("/ocorrencias", data),
};

export const qualidadeApi = {
  list: (obraId: string) => api.get(`/qualidade?obraId=${obraId}`),
  criarInspecao: (data: {
    obraId: string; etapaId: string; tipo?: string; resultado: string;
    itens: { descricao: string; resultado: string; observacao?: string }[];
  }) => api.post("/qualidade", { type: "inspecao", ...data }),
};

export const galeriaApi = {
  list: (obraId: string) => api.get(`/galeria?obraId=${obraId}`),
  /**
   * Persiste o arquivo antes de criar o registro da galeria. Também converte
   * data URLs legadas que ainda possam existir na fila offline.
   */
  uploadPhoto: async (
    localUri: string,
    data: { obraId: string; legenda?: string; etapaId?: string | null; rdoId?: string | null }
  ) => {
    let uploadUri = localUri;
    let temporaryUri: string | null = null;
    if (localUri.startsWith("data:")) {
      const base64 = localUri.split(",")[1];
      if (!base64) throw new Error("Imagem offline inválida");
      temporaryUri = `${FileSystem.cacheDirectory}rigor-${Date.now()}.jpg`;
      await FileSystem.writeAsStringAsync(temporaryUri, base64, { encoding: FileSystem.EncodingType.Base64 });
      uploadUri = temporaryUri;
    }

    try {
      const form = new FormData();
      form.append("file", { uri: uploadUri, name: `campo-${Date.now()}.jpg`, type: "image/jpeg" } as any);
      form.append("category", "galeria");
      const uploaded = await api.post("/uploads", form, {
        timeout: 60000,
      });
      if (!uploaded.data?.url) throw new Error("O servidor não retornou a URL da foto");
      return api.post("/galeria", { ...data, url: uploaded.data.url });
    } finally {
      if (temporaryUri) await FileSystem.deleteAsync(temporaryUri, { idempotent: true }).catch(() => {});
    }
  },
};

export const notificacoesApi = {
  /** Retorna { notificacoes, naoLidas }. */
  list: () => api.get("/notificacoes"),
  markRead: (id: string) => api.put(`/notificacoes/${id}`, { lida: true }),
};

export default api;
