import path from 'node:path';
import readXlsxFile from 'read-excel-file/node';
import mammoth from 'mammoth';
import type {
  ImportedEtapa,
  ImportedObra,
  ObraImportPreview,
} from '@/types/obra-import';

type CellValue = unknown;
type FieldName = keyof ImportedObra;
type EtapaFieldName = keyof ImportedEtapa;

const MAX_ROWS = 1_000;
const MAX_ETAPAS = 300;

const OBRA_ALIASES: Record<FieldName, string[]> = {
  nome: ['nome', 'nome da obra', 'obra', 'empreendimento', 'projeto', 'nome do projeto'],
  codigo: ['codigo', 'codigo da obra', 'cod obra', 'cod', 'identificador', 'numero da obra'],
  tipo: ['tipo', 'tipo da obra', 'tipologia', 'categoria da obra'],
  endereco: ['endereco', 'logradouro', 'local', 'local da obra'],
  cidade: ['cidade', 'municipio'],
  estado: ['estado', 'uf'],
  valorContratado: [
    'valor contratado',
    'valor da obra',
    'valor do contrato',
    'valor contratual',
    'valor',
  ],
  dataInicio: ['data inicio', 'data de inicio', 'inicio da obra', 'inicio previsto', 'inicio'],
  dataPrevisaoFim: [
    'data previsao fim',
    'previsao de fim',
    'previsao fim',
    'termino previsto',
    'data de termino',
    'fim previsto',
  ],
  descricao: ['descricao', 'escopo', 'objeto', 'objeto do contrato', 'observacoes'],
};

const ETAPA_ALIASES: Record<EtapaFieldName, string[]> = {
  nome: ['etapa', 'nome', 'atividade', 'fase', 'servico', 'tarefa'],
  descricao: ['descricao', 'detalhes', 'observacoes', 'escopo'],
  dataInicio: ['data inicio', 'inicio', 'inicio previsto'],
  dataFim: ['data fim', 'fim', 'termino', 'fim previsto', 'termino previsto'],
  percentualPrevisto: ['percentual previsto', 'previsto', 'avanco previsto', 'progresso previsto'],
  percentualRealizado: [
    'percentual realizado',
    'realizado',
    'avanco realizado',
    'progresso real',
  ],
  valorFinanceiro: ['valor financeiro', 'valor', 'custo', 'orcamento'],
  ordem: ['ordem', 'sequencia', 'numero', 'item'],
};

const FIELD_LABELS: Record<FieldName, string> = {
  nome: 'Nome da obra',
  codigo: 'Código',
  tipo: 'Tipo',
  endereco: 'Endereço',
  cidade: 'Cidade',
  estado: 'Estado',
  valorContratado: 'Valor contratado',
  dataInicio: 'Data de início',
  dataPrevisaoFim: 'Previsão de término',
  descricao: 'Descrição',
};

function emptyObra(): ImportedObra {
  return {
    nome: '',
    codigo: '',
    tipo: 'OUTRO',
    endereco: '',
    cidade: '',
    estado: '',
    valorContratado: 0,
    dataInicio: '',
    dataPrevisaoFim: '',
    descricao: '',
  };
}

export function normalizeImportKey(value: unknown) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[%º°]/g, ' percentual ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function aliasLookup<T extends string>(aliases: Record<T, string[]>) {
  const lookup = new Map<string, T>();
  for (const [field, names] of Object.entries(aliases) as [T, string[]][]) {
    for (const name of names) lookup.set(normalizeImportKey(name), field);
  }
  return lookup;
}

const OBRA_LOOKUP = aliasLookup(OBRA_ALIASES);
const ETAPA_LOOKUP = aliasLookup(ETAPA_ALIASES);

function cleanString(value: CellValue) {
  if (value instanceof Date) return value.toISOString();
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

export function parseBrazilianNumber(value: unknown) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  let text = String(value ?? '')
    .trim()
    .replace(/R\$/gi, '')
    .replace(/%/g, '')
    .replace(/\s/g, '');
  if (!text) return 0;
  if (text.includes(',') && text.includes('.')) text = text.replace(/\./g, '').replace(',', '.');
  else if (text.includes(',')) text = text.replace(',', '.');
  const parsed = Number(text.replace(/[^0-9.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function parseImportDate(value: unknown) {
  if (!value && value !== 0) return '';
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === 'number' && value > 20_000 && value < 100_000) {
    const date = new Date(Date.UTC(1899, 11, 30) + value * 86_400_000);
    return date.toISOString().slice(0, 10);
  }
  const text = cleanString(value);
  const iso = text.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (iso) return `${iso[1]}-${iso[2].padStart(2, '0')}-${iso[3].padStart(2, '0')}`;
  const br = text.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2,4})/);
  if (br) {
    const year = br[3].length === 2 ? `20${br[3]}` : br[3];
    return `${year}-${br[2].padStart(2, '0')}-${br[1].padStart(2, '0')}`;
  }
  return '';
}

function normalizeTipo(value: unknown): ImportedObra['tipo'] {
  const tipo = normalizeImportKey(value);
  if (tipo.includes('galpao')) return 'GALPAO';
  if (tipo.includes('edificio') || tipo.includes('predio')) return 'EDIFICIO';
  if (tipo.includes('ponte') || tipo.includes('viaduto')) return 'PONTE';
  if (tipo.includes('muro') && tipo.includes('arrimo')) return 'MURO_ARRIMO';
  if (tipo.includes('elemento') && tipo.includes('isolado')) return 'ELEMENTO_ISOLADO';
  return 'OUTRO';
}

function setObraField(obra: ImportedObra, field: FieldName, value: CellValue) {
  if (field === 'valorContratado') obra.valorContratado = Math.max(0, parseBrazilianNumber(value));
  else if (field === 'dataInicio' || field === 'dataPrevisaoFim') obra[field] = parseImportDate(value);
  else if (field === 'tipo') obra.tipo = normalizeTipo(value);
  else if (field === 'estado') obra.estado = cleanString(value).toUpperCase().slice(0, 2);
  else obra[field] = cleanString(value) as never;
}

function parseObraRows(rows: CellValue[][]) {
  const obra = emptyObra();
  const detected = new Set<FieldName>();
  const limitedRows = rows.slice(0, MAX_ROWS);

  // Formato vertical: "Campo | Valor".
  for (const row of limitedRows) {
    const field = OBRA_LOOKUP.get(normalizeImportKey(row[0]));
    if (!field || row[1] === undefined || row[1] === null || cleanString(row[1]) === '') continue;
    setObraField(obra, field, row[1]);
    detected.add(field);
  }

  // Formato tabular: cabeçalhos em uma linha e dados na linha seguinte.
  let bestHeader: { index: number; fields: (FieldName | undefined)[]; score: number } | undefined;
  limitedRows.slice(0, 25).forEach((row, index) => {
    const fields = row.map((cell) => OBRA_LOOKUP.get(normalizeImportKey(cell)));
    const score = new Set(fields.filter(Boolean)).size;
    if (score >= 2 && (!bestHeader || score > bestHeader.score)) bestHeader = { index, fields, score };
  });
  if (bestHeader) {
    const dataRow = limitedRows.slice(bestHeader.index + 1).find((row) => row.some((cell) => cleanString(cell)));
    if (dataRow) {
      bestHeader.fields.forEach((field, column) => {
        if (!field || dataRow[column] === undefined || cleanString(dataRow[column]) === '') return;
        setObraField(obra, field, dataRow[column]);
        detected.add(field);
      });
    }
  }

  return { obra, detected };
}

function parseEtapaRows(rows: CellValue[][]) {
  const limitedRows = rows.slice(0, MAX_ROWS);
  let header: { index: number; fields: (EtapaFieldName | undefined)[]; score: number } | undefined;
  limitedRows.slice(0, 35).forEach((row, index) => {
    const fields = row.map((cell) => ETAPA_LOOKUP.get(normalizeImportKey(cell)));
    const unique = new Set(fields.filter(Boolean));
    const score = unique.size + (unique.has('nome') ? 3 : 0);
    if (unique.has('nome') && (!header || score > header.score)) header = { index, fields, score };
  });
  if (!header) return [];

  const etapas: ImportedEtapa[] = [];
  for (const row of limitedRows.slice(header.index + 1)) {
    const raw: Partial<Record<EtapaFieldName, CellValue>> = {};
    header.fields.forEach((field, index) => {
      if (field) raw[field] = row[index];
    });
    const nome = cleanString(raw.nome);
    if (!nome) continue;
    etapas.push({
      nome,
      descricao: cleanString(raw.descricao),
      dataInicio: parseImportDate(raw.dataInicio),
      dataFim: parseImportDate(raw.dataFim),
      percentualPrevisto: Math.min(100, Math.max(0, parseBrazilianNumber(raw.percentualPrevisto))),
      percentualRealizado: Math.min(100, Math.max(0, parseBrazilianNumber(raw.percentualRealizado))),
      valorFinanceiro: Math.max(0, parseBrazilianNumber(raw.valorFinanceiro)),
      ordem: Math.max(0, Math.round(parseBrazilianNumber(raw.ordem) || etapas.length + 1)),
    });
    if (etapas.length >= MAX_ETAPAS) break;
  }
  return etapas;
}

function scoreObra(result: ReturnType<typeof parseObraRows>) {
  return result.detected.size + (result.obra.nome ? 3 : 0) + (result.obra.codigo ? 2 : 0);
}

function finalizePreview(input: {
  name: string;
  size: number;
  obra: ImportedObra;
  etapas?: ImportedEtapa[];
  detected: Set<FieldName>;
  extraWarnings?: string[];
}): ObraImportPreview {
  const warnings = [...(input.extraWarnings || [])];
  if (!input.obra.nome) warnings.push('Nome da obra não identificado; informe-o antes de continuar.');
  if (!input.obra.codigo) warnings.push('Código da obra não identificado; informe um código único.');
  if (!input.detected.has('tipo')) warnings.push('Tipo não identificado; o sistema selecionou “Outro”.');
  if (!input.etapas?.length)
    warnings.push('Nenhuma etapa de cronograma foi identificada. A obra ainda pode ser importada.');
  const detectedFields = [...input.detected].map((field) => FIELD_LABELS[field]);
  const confidence = input.detected.size >= 7 ? 'alta' : input.detected.size >= 4 ? 'media' : 'baixa';
  return {
    file: {
      name: input.name,
      extension: path.extname(input.name).toLowerCase(),
      size: input.size,
    },
    obra: input.obra,
    etapas: (input.etapas || []).slice(0, MAX_ETAPAS),
    detectedFields,
    warnings: [...new Set(warnings)],
    confidence,
  };
}

export function parseDelimitedText(text: string) {
  const normalized = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const firstLine = normalized.split('\n').find((line) => line.trim()) || '';
  const candidates = [';', ',', '\t'];
  const delimiter = candidates.sort((a, b) => firstLine.split(b).length - firstLine.split(a).length)[0];
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let index = 0; index < normalized.length; index++) {
    const char = normalized[index];
    if (char === '"') {
      if (quoted && normalized[index + 1] === '"') {
        cell += '"';
        index++;
      } else quoted = !quoted;
    } else if (char === delimiter && !quoted) {
      row.push(cell.trim());
      cell = '';
    } else if (char === '\n' && !quoted) {
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = '';
    } else cell += char;
  }
  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows.slice(0, MAX_ROWS);
}

export function parseWordText(text: string) {
  const rows: CellValue[][] = [];
  const etapas: ImportedEtapa[] = [];
  const lines = text
    .replace(/\r/g, '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, MAX_ROWS);

  for (const line of lines) {
    const label = line.match(/^([^:]{2,60}):\s*(.+)$/);
    if (label) rows.push([label[1], label[2]]);

    const etapa = line.match(/^etapa\s*(?:\d+)?\s*:\s*(.+)$/i);
    if (etapa) {
      const parts = etapa[1].split(/[|;]/).map((part) => part.trim());
      etapas.push({
        nome: parts[0],
        descricao: '',
        dataInicio: parseImportDate(parts[1]),
        dataFim: parseImportDate(parts[2]),
        percentualPrevisto: 0,
        percentualRealizado: 0,
        valorFinanceiro: parseBrazilianNumber(parts[3]),
        ordem: etapas.length + 1,
      });
    }
  }
  return { ...parseObraRows(rows), etapas };
}

export async function parseObraFile(input: {
  name: string;
  size: number;
  buffer: Buffer;
}): Promise<ObraImportPreview> {
  const extension = path.extname(input.name).toLowerCase();
  if (extension === '.xlsx') {
    const sheets = await readXlsxFile(input.buffer);
    if (!sheets.length) throw new Error('A planilha não possui abas legíveis.');
    const parsedSheets = sheets.map((sheet) => ({ sheet, parsed: parseObraRows(sheet.data) }));
    const metadata = parsedSheets.sort((a, b) => scoreObra(b.parsed) - scoreObra(a.parsed))[0];
    const etapaSheet = sheets.find((sheet) =>
      /etapa|cronograma|planejamento|atividades/.test(normalizeImportKey(sheet.sheet))
    );
    const etapas = etapaSheet ? parseEtapaRows(etapaSheet.data) : [];
    return finalizePreview({
      name: input.name,
      size: input.size,
      obra: metadata.parsed.obra,
      detected: metadata.parsed.detected,
      etapas,
      extraWarnings:
        sheets.length > 1 && !etapaSheet
          ? ['Foram encontradas várias abas, mas nenhuma foi reconhecida como “Etapas” ou “Cronograma”.']
          : [],
    });
  }

  if (extension === '.csv') {
    let text = input.buffer.toString('utf8');
    if (text.includes('�')) text = new TextDecoder('windows-1252').decode(input.buffer);
    const parsed = parseObraRows(parseDelimitedText(text));
    return finalizePreview({
      name: input.name,
      size: input.size,
      obra: parsed.obra,
      detected: parsed.detected,
    });
  }

  if (extension === '.docx') {
    const result = await mammoth.extractRawText({ buffer: input.buffer });
    const parsed = parseWordText(result.value.slice(0, 150_000));
    return finalizePreview({
      name: input.name,
      size: input.size,
      obra: parsed.obra,
      detected: parsed.detected,
      etapas: parsed.etapas,
      extraWarnings: result.messages.length
        ? ['O Word contém elementos que não viraram texto. Revise a prévia antes de importar.']
        : [],
    });
  }

  throw new Error('Formato não suportado. Use arquivos .xlsx, .csv ou .docx.');
}
