'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

export interface ObraItem {
  id: string;
  nome: string;
  codigo: string;
  tipo?: string;
  status?: string;
  cidade?: string | null;
  estado?: string | null;
  avancoRealizado?: number;
  avancoPrevisto?: number;
  semaforo?: 'verde' | 'amarelo' | 'vermelho';
  engenheiro?: { id: string; name: string } | null;
  cliente?: { id: string; name: string } | null;
}

interface ObraContextValue {
  obras: ObraItem[];
  activeObraId: string | null;
  activeObra: ObraItem | null;
  isAllObras: boolean;
  isLoading: boolean;
  setActiveObraId: (id: string | null) => void;
  selectObra: (obra: ObraItem | null | 'all') => void;
  clearActiveObra: () => void;
  refreshObras: () => Promise<ObraItem[]>;
}

const STORAGE_KEY = 'rigor_active_obra_id';
const CHANGE_EVENT = 'rigor:active_obra_change';

const ObraContext = createContext<ObraContextValue | undefined>(undefined);

export function ObraProvider({ children }: { children: React.ReactNode }) {
  const [obras, setObras] = useState<ObraItem[]>([]);
  const [activeObraId, setActiveObraIdState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasInitialized, setHasInitialized] = useState(false);

  const fetchObras = useCallback(async () => {
    try {
      const res = await fetch('/api/obras');
      if (!res.ok) {
        // Fallback to /api/crud/obras if needed
        const crudRes = await fetch('/api/crud/obras');
        if (!crudRes.ok) return [];
        const crudData = await crudRes.json();
        const list: ObraItem[] = crudData.rows || [];
        setObras(list);
        return list;
      }
      const data = await res.json();
      const list: ObraItem[] = Array.isArray(data) ? data : data.rows || [];
      setObras(list);
      return list;
    } catch {
      // Ignora erro silenciosamente
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  const setActiveObraId = useCallback((id: string | null) => {
    const nextId = id === 'all' || !id ? null : id;
    setActiveObraIdState(nextId);

    if (typeof window !== 'undefined') {
      try {
        if (nextId) {
          localStorage.setItem(STORAGE_KEY, nextId);
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
        window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: { obraId: nextId } }));
      } catch {
        // localStorage indisponível
      }
    }
  }, []);

  const selectObra = useCallback(
    (obra: ObraItem | null | 'all') => {
      if (obra === 'all' || obra === null) {
        setActiveObraId(null);
      } else {
        setActiveObraId(obra.id);
      }
    },
    [setActiveObraId]
  );

  const clearActiveObra = useCallback(() => {
    setActiveObraId(null);
  }, [setActiveObraId]);

  // Carrega lista inicial de obras
  useEffect(() => {
    let active = true;
    (async () => {
      const list = await fetchObras();
      if (!active) return;

      if (typeof window !== 'undefined') {
        try {
          const stored = localStorage.getItem(STORAGE_KEY);
          if (stored && list && list.some((o) => o.id === stored)) {
            setActiveObraIdState(stored);
          } else if (list && list.length === 1) {
            // Se o usuário possui apenas 1 obra, seleciona automaticamente como ativa
            setActiveObraIdState(list[0].id);
            localStorage.setItem(STORAGE_KEY, list[0].id);
          }
        } catch {
          // Ignora erro de localStorage
        }
      }
      setHasInitialized(true);
    })();

    return () => {
      active = false;
    };
  }, [fetchObras]);

  // Sincroniza entre abas e eventos locais
  useEffect(() => {
    if (!hasInitialized) return;

    function handleStorage(e: StorageEvent) {
      if (e.key === STORAGE_KEY) {
        const nextId = e.newValue;
        setActiveObraIdState(nextId || null);
      }
    }

    function handleCustomEvent(e: Event) {
      const custom = e as CustomEvent<{ obraId: string | null }>;
      if (custom.detail) {
        setActiveObraIdState(custom.detail.obraId);
      }
    }

    window.addEventListener('storage', handleStorage);
    window.addEventListener(CHANGE_EVENT, handleCustomEvent);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener(CHANGE_EVENT, handleCustomEvent);
    };
  }, [hasInitialized]);

  const activeObra = useMemo(() => {
    if (!activeObraId || activeObraId === 'all') return null;
    return obras.find((o) => o.id === activeObraId) || null;
  }, [obras, activeObraId]);

  const isAllObras = !activeObraId || activeObraId === 'all';

  const value = useMemo(
    () => ({
      obras,
      activeObraId,
      activeObra,
      isAllObras,
      isLoading,
      setActiveObraId,
      selectObra,
      clearActiveObra,
      refreshObras: fetchObras,
    }),
    [
      obras,
      activeObraId,
      activeObra,
      isAllObras,
      isLoading,
      setActiveObraId,
      selectObra,
      clearActiveObra,
      fetchObras,
    ]
  );

  return <ObraContext.Provider value={value}>{children}</ObraContext.Provider>;
}

export function useObra() {
  const context = useContext(ObraContext);
  if (!context) {
    throw new Error('useObra deve ser usado dentro de um ObraProvider');
  }
  return context;
}
