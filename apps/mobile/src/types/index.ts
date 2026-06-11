export interface User {
  id: string; name: string; email: string; role: string; tenantId: string;
}

export interface Obra {
  id: string; nome: string; codigo: string; tipo: string; status: string;
  endereco?: string | null; cidade?: string | null; estado?: string | null;
  valorContratado: string | number;
  dataInicio?: string | null; dataPrevisaoFim?: string | null;
  avancoRealizado?: number; avancoPrevisto?: number;
  semaforo?: "verde" | "amarelo" | "vermelho";
  engenheiro?: { name: string } | null;
}

export interface Etapa {
  id: string; nome: string; ordem: number;
  dataInicio?: string | null; dataFim?: string | null;
  percentualPrevisto: number; percentualRealizado: number;
}

export interface RDOResumo {
  id: string; numero: number; data: string; status: string;
  climaManha?: string | null; climaTarde?: string | null;
  assinaturaNome?: string | null;
  obra?: { id: string; nome: string; codigo?: string } | null;
  responsavel?: { id: string; name: string } | null;
}

export interface Material {
  id: string; codigo: string; descricao: string; unidade: string;
  estoqueAtual?: number; estoqueMinimo?: number; alerta?: boolean;
}

export interface Ocorrencia {
  id: string; tipo: string; descricao: string; status: string;
  dataAbertura: string; obra?: { nome: string } | null;
}

export interface Notificacao {
  id: string; titulo: string; mensagem: string; tipo: string;
  lida: boolean; createdAt: string;
}

export interface Foto {
  id: string; url: string; legenda?: string | null; data: string;
  etapa?: { nome: string } | null;
}

export interface ChecklistItem {
  id: string; nome: string; conformidade: "OK" | "NC" | "NA" | null;
}
