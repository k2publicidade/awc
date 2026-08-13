export type ImportConfidence = 'alta' | 'media' | 'baixa';

export type ImportedObra = {
  nome: string;
  codigo: string;
  tipo: 'GALPAO' | 'EDIFICIO' | 'PONTE' | 'MURO_ARRIMO' | 'ELEMENTO_ISOLADO' | 'OUTRO';
  endereco: string;
  cidade: string;
  estado: string;
  valorContratado: number;
  dataInicio: string;
  dataPrevisaoFim: string;
  descricao: string;
};

export type ImportedEtapa = {
  nome: string;
  descricao: string;
  dataInicio: string;
  dataFim: string;
  percentualPrevisto: number;
  percentualRealizado: number;
  valorFinanceiro: number;
  ordem: number;
};

export type ObraImportPreview = {
  file: {
    name: string;
    extension: string;
    size: number;
  };
  obra: ImportedObra;
  etapas: ImportedEtapa[];
  detectedFields: string[];
  warnings: string[];
  confidence: ImportConfidence;
};

export type ObraImportResult = {
  id: string;
  nome: string;
  codigo: string;
  etapasCriadas: number;
};
