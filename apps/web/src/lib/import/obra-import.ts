import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { execFile } from 'node:child_process';
import readXlsxFile from 'read-excel-file/node';
import mammoth from 'mammoth';
import type {
  ImportedEtapa,
  ImportedObra,
  ObraImportPreview,
} from '@/types/obra-import';
import { mapStructuredMppProject, parseMppXml } from './mpp-parser';

type CellValue = unknown;
type FieldName = keyof ImportedObra;
type EtapaFieldName = keyof ImportedEtapa;

const MAX_ROWS = 5_000;
const MAX_ETAPAS = 5_000;

const OBRA_ALIASES: Record<FieldName, string[]> = {
  nome: ['nome', 'nome da obra', 'obra', 'empreendimento', 'projeto', 'nome do projeto', 'titulo'],
  codigo: ['codigo', 'codigo da obra', 'cod obra', 'cod', 'identificador', 'numero da obra', 'numero do contrato', 'contrato'],
  tipo: ['tipo', 'tipo da obra', 'tipologia', 'categoria da obra'],
  endereco: ['endereco', 'logradouro', 'local', 'local da obra', 'localizacao'],
  cidade: ['cidade', 'municipio'],
  estado: ['estado', 'uf'],
  valorContratado: [
    'valor contratado',
    'valor da obra',
    'valor do contrato',
    'valor contratual',
    'valor total',
    'valor',
    'orcamento',
    'custo total',
  ],
  dataInicio: ['data inicio', 'data de inicio', 'inicio da obra', 'inicio previsto', 'inicio', 'data inicial'],
  dataPrevisaoFim: [
    'data previsao fim',
    'previsao de fim',
    'previsao fim',
    'termino previsto',
    'data de termino',
    'fim previsto',
    'data final',
    'termino',
    'conclusao prevista',
  ],
  descricao: ['descricao', 'escopo', 'objeto', 'objeto do contrato', 'observacoes', 'detalhes'],
};

const ETAPA_ALIASES: Record<EtapaFieldName, string[]> = {
  nome: ['etapa', 'nome', 'atividade', 'fase', 'servico', 'tarefa', 'item', 'discriminacao', 'descricao do servico'],
  descricao: ['descricao', 'detalhes', 'observacoes', 'escopo', 'especificacao'],
  dataInicio: ['data inicio', 'inicio', 'inicio previsto', 'data inicial'],
  dataFim: ['data fim', 'fim', 'termino', 'fim previsto', 'termino previsto', 'data final'],
  percentualPrevisto: ['percentual previsto', 'previsto', 'avanco previsto', 'progresso previsto', '% previsto', 'prev (%)'],
  percentualRealizado: [
    'percentual realizado',
    'realizado',
    'avanco realizado',
    'progresso real',
    '% realizado',
    'real (%)',
  ],
  valorFinanceiro: ['valor financeiro', 'valor', 'custo', 'orcamento', 'total', 'preco total', 'valor (r$)'],
  ordem: ['ordem', 'sequencia', 'numero', 'item', 'wbs', 'id'],
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
  // YYYY-MM-DD
  const iso = text.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (iso) return `${iso[1]}-${iso[2].padStart(2, '0')}-${iso[3].padStart(2, '0')}`;
  // DD/MM/YYYY
  const br = text.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2,4})/);
  if (br) {
    const year = br[3].length === 2 ? `20${br[3]}` : br[3];
    return `${year}-${br[2].padStart(2, '0')}-${br[1].padStart(2, '0')}`;
  }
  return '';
}

function normalizeTipo(value: unknown): ImportedObra['tipo'] {
  const tipo = normalizeImportKey(value);
  if (tipo.includes('galpao') || tipo.includes('barracao') || tipo.includes('armazem') || tipo.includes('hangar'))
    return 'GALPAO';
  if (tipo.includes('edificio') || tipo.includes('predio') || tipo.includes('residencial') || tipo.includes('comercial'))
    return 'EDIFICIO';
  if (tipo.includes('ponte') || tipo.includes('viaduto') || tipo.includes('passarela')) return 'PONTE';
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

function generateObraCode(name: string, fallbackPrefix = 'OBRA'): string {
  const words = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!words.length) return `${fallbackPrefix}-${new Date().getFullYear()}-001`;

  const initials = words
    .slice(0, 3)
    .map((w) => w[0].toUpperCase())
    .join('');
  const year = new Date().getFullYear();
  return `${initials || fallbackPrefix}-${year}-001`;
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
  const limitedRows = rows;
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
  if ((input.etapas?.length || 0) > MAX_ETAPAS) {
    throw new Error(
      `O projeto contém ${input.etapas!.length} etapas, acima do limite seguro de ${MAX_ETAPAS}. Nenhuma etapa foi descartada nem importada parcialmente.`
    );
  }
  const warnings = [...(input.extraWarnings || [])];
  if (!input.obra.nome) warnings.push('Nome da obra não identificado; informe-o antes de continuar.');
  if (!input.obra.codigo) {
    input.obra.codigo = generateObraCode(input.obra.nome || path.parse(input.name).name);
    warnings.push(`Código da obra preenchido automaticamente como "${input.obra.codigo}".`);
  }
  if (!input.detected.has('tipo')) warnings.push('Tipo não identificado; o sistema selecionou “Outro”.');
  if (!input.etapas?.length)
    warnings.push('Nenhuma etapa de cronograma foi identificada. A obra ainda pode ser importada.');
  const detectedFields = [...input.detected].map((field) => FIELD_LABELS[field]);
  const confidence = input.detected.size >= 5 && (input.etapas?.length || 0) > 0 ? 'alta' : input.detected.size >= 3 ? 'media' : 'baixa';
  return {
    file: {
      name: input.name,
      extension: path.extname(input.name).toLowerCase(),
      size: input.size,
    },
    obra: input.obra,
    etapas: input.etapas || [],
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

function decodeTextBuffer(buffer: Buffer) {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer);
  } catch {
    return new TextDecoder('windows-1252').decode(buffer);
  }
}

export function parseWordText(text: string) {
  const rows: CellValue[][] = [];
  const etapas: ImportedEtapa[] = [];
  const lines = text
    .replace(/\r/g, '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    const label = line.match(/^([^:]{2,60}):\s*(.+)$/);
    if (label) rows.push([label[1], label[2]]);

    const etapa = line.match(/^(?:etapa|fase|item|atividade)\s*(?:\d+)?\s*:\s*(.+)$/i);
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

function findScript(scriptName: string): string {
  const candidates = [
    path.resolve(process.cwd(), 'scripts', scriptName),
    path.resolve(process.cwd(), '..', 'scripts', scriptName),
    path.resolve(process.cwd(), '..', '..', 'scripts', scriptName),
    path.join(__dirname, '..', '..', '..', '..', 'scripts', scriptName),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return candidates[0];
}

function findPythonBinary(): string {
  if (process.env.PYTHON_PATH && fs.existsSync(process.env.PYTHON_PATH)) {
    return process.env.PYTHON_PATH;
  }

  const homedir = os.homedir();
  const candidates = [
    path.join(homedir, 'AppData', 'Local', 'hermes', 'hermes-agent', 'venv', 'Scripts', 'python.exe'),
    path.join(homedir, 'AppData', 'Local', 'Programs', 'Python', 'Python312', 'python.exe'),
    path.join(homedir, 'AppData', 'Local', 'Programs', 'Python', 'Python311', 'python.exe'),
    path.join(homedir, 'AppData', 'Local', 'Programs', 'Python', 'Python310', 'python.exe'),
    'C:\\Program Files\\Python312\\python.exe',
    'C:\\Program Files\\Python311\\python.exe',
    'C:\\Program Files\\Python310\\python.exe',
    'C:\\Python312\\python.exe',
    'C:\\Python311\\python.exe',
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }

  return 'python';
}

function runPythonScript(scriptName: string, inputFilePath: string, outputJsonPath: string): Promise<string> {
  const scriptPath = findScript(scriptName);
  const pythonBin = findPythonBinary();
  return new Promise((resolve, reject) => {
    execFile(pythonBin, [scriptPath, inputFilePath, outputJsonPath], { timeout: 35000 }, (error, stdout, stderr) => {
      if (fs.existsSync(outputJsonPath) && fs.statSync(outputJsonPath).size > 10) {
        return resolve(stdout || 'OK');
      }
      if (error) {
        reject(new Error(stderr || stdout || error.message));
      } else {
        resolve(stdout);
      }
    });
  });
}

/**
 * Extrator e interpretador de arquivos do Microsoft Project (.mpp e .xml)
 * Suporta execução nativa em TypeScript (PROD/Vercel/Netlify) e enriquecimento via MPXJ quando disponível.
 */
async function parseMppOrXml(input: { name: string; size: number; buffer: Buffer }): Promise<ObraImportPreview> {
  const ext = path.extname(input.name).toLowerCase();

  // Se for XML do MS Project
  if (ext === '.xml') {
    const xmlResult = parseMppXml(input.buffer.toString('utf8'), input.name);
    const detected = new Set<FieldName>();
    if (xmlResult.obra.nome) detected.add('nome');
    if (xmlResult.obra.codigo) detected.add('codigo');
    if (xmlResult.obra.tipo !== 'OUTRO') detected.add('tipo');
    if (xmlResult.obra.dataInicio) detected.add('dataInicio');
    if (xmlResult.obra.dataPrevisaoFim) detected.add('dataPrevisaoFim');
    if (xmlResult.obra.valorContratado > 0) detected.add('valorContratado');

    return finalizePreview({
      name: input.name,
      size: input.size,
      obra: xmlResult.obra,
      detected,
      etapas: xmlResult.etapas,
      extraWarnings: xmlResult.warnings,
    });
  }

  // Tentar primeiro extrair via Python MPXJ se disponível no servidor local
  const tmpDir = os.tmpdir();
  const tmpInput = path.join(tmpDir, `mpp_${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`);
  const tmpOutput = path.join(tmpDir, `mpp_${Date.now()}_${Math.random().toString(36).slice(2)}.json`);

  try {
    fs.writeFileSync(tmpInput, input.buffer);
    await runPythonScript('extract-mpp.py', tmpInput, tmpOutput);

    if (fs.existsSync(tmpOutput)) {
      const data = JSON.parse(fs.readFileSync(tmpOutput, 'utf8'));
      const { projeto, tarefas } = data;

      const obra = emptyObra();
      const detected = new Set<FieldName>();

      const baseName = path.parse(input.name).name.replace(/[-_]/g, ' ').trim();
      obra.nome = projeto?.titulo || baseName;
      detected.add('nome');

      obra.codigo = generateObraCode(obra.nome, 'PRJ');
      detected.add('codigo');

      obra.tipo = normalizeTipo(obra.nome);
      if (obra.tipo !== 'OUTRO') detected.add('tipo');

      if (projeto?.dataInicio) {
        obra.dataInicio = parseImportDate(projeto.dataInicio);
        detected.add('dataInicio');
      }
      if (projeto?.dataFim) {
        obra.dataPrevisaoFim = parseImportDate(projeto.dataFim);
        detected.add('dataPrevisaoFim');
      }
      if (projeto?.custoTotal && projeto.custoTotal > 0) {
        obra.valorContratado = Math.max(0, projeto.custoTotal);
        detected.add('valorContratado');
      }

      const authorText = projeto?.autor ? ` Autor: ${projeto.autor}.` : '';
      obra.descricao = `Cronograma importado do Microsoft Project (${input.name}).${authorText}`;
      detected.add('descricao');

      const rawTasks: DynamicValue[] = Array.isArray(tarefas) ? tarefas : [];
      const etapas: ImportedEtapa[] = [];
      let calculatedCostTotal = 0;

      rawTasks.forEach((t, idx) => {
        const taskCost = typeof t.custo === 'number' ? Math.max(0, t.custo) : 0;
        calculatedCostTotal += taskCost;

        const pct = Math.round(Number(t.percentual || 0));
        const wbsPrefix = t.wbs && t.wbs !== '0' ? `${t.wbs} ` : '';

        etapas.push({
          nome: `${wbsPrefix}${t.nome}`.trim(),
          descricao: t.caminho || t.notas || '',
          dataInicio: parseImportDate(t.inicio),
          dataFim: parseImportDate(t.fim),
          percentualPrevisto: pct,
          percentualRealizado: pct,
          valorFinanceiro: taskCost,
          ordem: idx + 1,
        });
      });

      if (obra.valorContratado === 0 && calculatedCostTotal > 0) {
        obra.valorContratado = calculatedCostTotal;
        detected.add('valorContratado');
      }

      if (!obra.dataInicio && etapas.length > 0) {
        const startDates = etapas.map((e) => e.dataInicio).filter(Boolean).sort();
        if (startDates.length > 0) {
          obra.dataInicio = startDates[0];
          detected.add('dataInicio');
        }
      }
      if (!obra.dataPrevisaoFim && etapas.length > 0) {
        const finishDates = etapas.map((e) => e.dataFim).filter(Boolean).sort();
        if (finishDates.length > 0) {
          obra.dataPrevisaoFim = finishDates[finishDates.length - 1];
          detected.add('dataPrevisaoFim');
        }
      }

      return finalizePreview({
        name: input.name,
        size: input.size,
        obra,
        detected,
        etapas,
        extraWarnings: [
          `Cronograma MS Project: ${etapas.length} etapas operacionais identificadas com WBS, datas e percentuais.`,
        ],
      });
    }
  } catch (pyErr) {
    // Ambiente de produção sem Python (Netlify/Vercel) -> Executar parser nativo em TypeScript puro
    console.warn('[import] Executando parser nativo TypeScript puro para Microsoft Project:', pyErr);
  } finally {
    try { if (fs.existsSync(tmpInput)) fs.unlinkSync(tmpInput); } catch {}
    try { if (fs.existsSync(tmpOutput)) fs.unlinkSync(tmpOutput); } catch {}
  }

  try {
    const { parseMPP } = await import('@tensor-estate/tsmpp');
    const bytes = input.buffer.buffer.slice(
      input.buffer.byteOffset,
      input.buffer.byteOffset + input.buffer.byteLength
    ) as ArrayBuffer;
    const structuredResult = mapStructuredMppProject(await parseMPP(bytes), input.name);
    const detected = new Set<FieldName>(['nome', 'codigo', 'descricao']);
    if (structuredResult.obra.tipo !== 'OUTRO') detected.add('tipo');
    if (structuredResult.obra.dataInicio) detected.add('dataInicio');
    if (structuredResult.obra.dataPrevisaoFim) detected.add('dataPrevisaoFim');

    return finalizePreview({
      name: input.name,
      size: input.size,
      obra: structuredResult.obra,
      detected,
      etapas: structuredResult.etapas,
      extraWarnings: structuredResult.warnings,
    });
  } catch (structuredError) {
    console.error('[import] Falha no parser estrutural Microsoft Project:', structuredError);
    throw new Error(
      'Não foi possível comprovar a leitura completa deste arquivo .mpp. Nenhum dado foi importado. Salve o projeto como XML no Microsoft Project e tente novamente.'
    );
  }
}

/**
 * Fallback em TypeScript puro para extrair texto de PDF
 */
function parsePdfFallback(input: { name: string; size: number; buffer: Buffer }): ObraImportPreview {
  const content = input.buffer.toString('latin1');
  const textBlocks: string[] = [];

  const streamRegex = /stream[\r\n]+([\s\S]*?)[\r\n]+endstream/g;
  let match: RegExpExecArray | null;

  while ((match = streamRegex.exec(content)) !== null) {
    try {
      const rawStream = Buffer.from(match[1], 'latin1');
      const decompressed = zlib.inflateSync(rawStream).toString('utf8');
      const textMatches = decompressed.match(/\(([^)]+)\)|\[([^\]]+)\]/g);
      if (textMatches) {
        textBlocks.push(textMatches.join(' '));
      }
    } catch {
      const plainMatches = match[1].match(/\(([^)]+)\)/g);
      if (plainMatches) {
        textBlocks.push(plainMatches.join(' '));
      }
    }
  }

  const baseName = path.parse(input.name).name.replace(/[-_]/g, ' ').trim();
  const obra = emptyObra();
  const detected = new Set<FieldName>();

  obra.nome = baseName || 'Obra PDF';
  detected.add('nome');

  obra.codigo = generateObraCode(obra.nome, 'PDF');
  detected.add('codigo');

  obra.descricao = textBlocks.length
    ? `Documento PDF importado (${input.name}): ${textBlocks.slice(0, 2).join(' ')}`.slice(0, 250)
    : `Documento PDF importado (${input.name}).`;
  detected.add('descricao');

  return finalizePreview({
    name: input.name,
    size: input.size,
    obra,
    detected,
    etapas: [],
    extraWarnings: ['Texto do PDF processado. Revise os campos cadastrais antes de confirmar.'],
  });
}

/**
 * Extrator e interpretador de arquivos PDF (.pdf)
 */
async function parsePdf(input: { name: string; size: number; buffer: Buffer }): Promise<ObraImportPreview> {
  const tmpDir = os.tmpdir();
  const tmpInput = path.join(tmpDir, `pdf_${Date.now()}_${Math.random().toString(36).slice(2)}.pdf`);
  const tmpOutput = path.join(tmpDir, `pdf_${Date.now()}_${Math.random().toString(36).slice(2)}.json`);

  try {
    fs.writeFileSync(tmpInput, input.buffer);
    await runPythonScript('extract-pdf.py', tmpInput, tmpOutput);

    if (fs.existsSync(tmpOutput)) {
      const data = JSON.parse(fs.readFileSync(tmpOutput, 'utf8'));
      const fullText = String(data?.full_text || '');
      const pages: DynamicValue[] = Array.isArray(data?.pages) ? data.pages : [];

      const obra = emptyObra();
      const detected = new Set<FieldName>();
      const warnings: string[] = [];

      const baseName = path.parse(input.name).name.replace(/[-_]/g, ' ').trim();
      obra.nome = baseName;

      const lines = fullText
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);

      for (const line of lines) {
        const matchNome = line.match(/(?:nome da obra|obra|empreendimento|projeto|edif[íi]cio|constru[çc][ãa]o)\s*[:\-–]\s*([^\n;.,]{3,80})/i);
        if (matchNome && (!detected.has('nome') || obra.nome === baseName)) {
          obra.nome = matchNome[1].trim();
          detected.add('nome');
        }

        const matchCodigo = line.match(/(?:c[óo]digo|c[óo]d\.?|contrato(?:\s*n[ºo])?|art(?:\s*n[ºo])?)\s*[:\-–]\s*([A-Za-z0-9\-_/]{2,30})/i);
        if (matchCodigo && !detected.has('codigo')) {
          obra.codigo = matchCodigo[1].trim().toUpperCase();
          detected.add('codigo');
        }

        const matchCidade = line.match(/(?:cidade|munic[íi]pio|local)\s*[:\-–]\s*([A-Za-zÀ-ÿ\s]{3,40})(?:\s*[\/\-]\s*([A-Za-z]{2}))?/i);
        if (matchCidade && !detected.has('cidade')) {
          obra.cidade = matchCidade[1].trim();
          detected.add('cidade');
          if (matchCidade[2]) {
            obra.estado = matchCidade[2].trim().toUpperCase();
            detected.add('estado');
          }
        }

        const matchValor = line.match(/(?:valor(?:\s*contratado|\s*total|\s*do contrato)?|or[çc]amento(?:\s*total)?)\s*[:\-–]?\s*(?:R\$\s*)?([\d\.,]{4,20})/i);
        if (matchValor && !detected.has('valorContratado')) {
          const val = parseBrazilianNumber(matchValor[1]);
          if (val > 0) {
            obra.valorContratado = val;
            detected.add('valorContratado');
          }
        }

        const matchInicio = line.match(/(?:data(?:\s*de)?\s*in[íi]cio|in[íi]cio(?:\s*previsto)?)\s*[:\-–]\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i);
        if (matchInicio && !detected.has('dataInicio')) {
          const dt = parseImportDate(matchInicio[1]);
          if (dt) {
            obra.dataInicio = dt;
            detected.add('dataInicio');
          }
        }

        const matchFim = line.match(/(?:data(?:\s*de)?\s*t[ée]rmino|t[ée]rmino(?:\s*previsto)?|previs[ãa]o(?:\s*de)?\s*fim|conclus[ãa]o(?:\s*prevista)?)\s*[:\-–]\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i);
        if (matchFim && !detected.has('dataPrevisaoFim')) {
          const dt = parseImportDate(matchFim[1]);
          if (dt) {
            obra.dataPrevisaoFim = dt;
            detected.add('dataPrevisaoFim');
          }
        }
      }

      if (!detected.has('codigo')) {
        obra.codigo = generateObraCode(obra.nome, 'PDF');
        detected.add('codigo');
      }

      obra.descricao = `Documento PDF importado (${pages.length} páginas).`;
      detected.add('descricao');

      const etapas: ImportedEtapa[] = [];
      const itemPattern = /^(?:(?:item|etapa|fase)\s*)?(\d+(?:\.\d+)*)\s*[\.\-–\)]\s*([A-Za-zÀ-ÿ0-9\s\-_/]{3,100})/i;

      for (const line of lines) {
        const matchItem = line.match(itemPattern);
        if (matchItem) {
          const num = matchItem[1];
          const nomeEtapa = matchItem[2].trim();

          if (nomeEtapa.length >= 3 && !/p[áa]gina|folha|data|vers[ãa]o|autor/i.test(nomeEtapa)) {
            const dateMatch = line.match(/(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/g);
            const moneyMatch = line.match(/(?:R\$\s*)?([\d\.,]{4,15})/);

            etapas.push({
              nome: `${num} ${nomeEtapa}`.trim(),
              descricao: '',
              dataInicio: dateMatch && dateMatch[0] ? parseImportDate(dateMatch[0]) : '',
              dataFim: dateMatch && dateMatch[1] ? parseImportDate(dateMatch[1]) : '',
              percentualPrevisto: 0,
              percentualRealizado: 0,
              valorFinanceiro: moneyMatch ? parseBrazilianNumber(moneyMatch[1]) : 0,
              ordem: etapas.length + 1,
            });
          }
        }
      }

      warnings.push(`Texto extraído de ${pages.length} páginas do documento PDF.`);

      return finalizePreview({
        name: input.name,
        size: input.size,
        obra,
        detected,
        etapas,
        extraWarnings: warnings,
      });
    }
  } catch (pyErr) {
    console.warn('[import] Falha na extração Python PDF, utilizando fallback:', pyErr);
  } finally {
    try { if (fs.existsSync(tmpInput)) fs.unlinkSync(tmpInput); } catch {}
    try { if (fs.existsSync(tmpOutput)) fs.unlinkSync(tmpOutput); } catch {}
  }

  return parsePdfFallback(input);
}

export async function parseObraFile(input: {
  name: string;
  size: number;
  buffer: Buffer;
}): Promise<ObraImportPreview> {
  const extension = path.extname(input.name).toLowerCase();

  // Microsoft Project (.mpp e .xml)
  if (extension === '.mpp' || extension === '.xml') {
    return parseMppOrXml(input);
  }

  // Documentos PDF (.pdf)
  if (extension === '.pdf') {
    return parsePdf(input);
  }

  // Planilhas Excel (.xlsx e .xls)
  if (extension === '.xlsx' || extension === '.xls') {
    const sheets = await readXlsxFile(input.buffer);
    if (!sheets.length) throw new Error('A planilha não possui abas legíveis.');
    const parsedSheets = sheets.map((sheet) => ({ sheet, parsed: parseObraRows(sheet.data) }));
    const metadata = parsedSheets.sort((a, b) => scoreObra(b.parsed) - scoreObra(a.parsed))[0];
    const etapaSheet = sheets.find((sheet) =>
      /etapa|cronograma|planejamento|atividades|servicos|tarefas/.test(normalizeImportKey(sheet.sheet))
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

  // Arquivos CSV (.csv)
  if (extension === '.csv') {
    const text = decodeTextBuffer(input.buffer);
    const parsed = parseObraRows(parseDelimitedText(text));
    return finalizePreview({
      name: input.name,
      size: input.size,
      obra: parsed.obra,
      detected: parsed.detected,
    });
  }

  // Documentos Word (.docx)
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

  throw new Error('Formato não suportado. Use arquivos .mpp, .xml, .pdf, .xlsx, .csv ou .docx.');
}
