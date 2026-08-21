import path from 'node:path';
import type { ProjectData, ProjectTask } from '@tensor-estate/tsmpp';
import type { ImportedEtapa, ImportedObra } from '@/types/obra-import';

export interface ParsedMppResult {
  obra: ImportedObra;
  etapas: ImportedEtapa[];
  detectedFields: string[];
  warnings: string[];
}

function projectDate(value?: string | null) {
  return value ? value.slice(0, 10) : '';
}

export function mapStructuredMppProject(project: ProjectData, fileName: string): ParsedMppResult {
  const taskById = new Map(project.tasks.map((task) => [task.id, task]));

  function parentPath(task: ProjectTask) {
    const names: string[] = [];
    let parentId = task.parentId;
    const visited = new Set<number>();
    while (parentId && !visited.has(parentId)) {
      visited.add(parentId);
      const parent = taskById.get(parentId);
      if (!parent) break;
      names.unshift(parent.name);
      parentId = parent.parentId;
    }
    return names.join(' › ');
  }

  const operationalTasks = project.tasks.filter((task) => !task.isSummary && task.name.trim());
  const etapas = operationalTasks.map<ImportedEtapa>((task, index) => {
    const details: string[] = [];
    const hierarchy = parentPath(task);
    if (hierarchy) details.push(`Fase: ${hierarchy}`);
    if (Number.isFinite(task.durationDays)) details.push(`Duração: ${task.durationDays} dia(s)`);
    if (task.isMilestone) details.push('Marco do projeto');
    if (task.baselineStartDate || task.baselineFinishDate) {
      details.push(
        `Baseline: ${projectDate(task.baselineStartDate) || '—'} a ${projectDate(task.baselineFinishDate) || '—'}`
      );
    }
    if (task.predecessors.length) {
      details.push(
        `Predecessoras: ${task.predecessors.map((item) => `${item.taskId} (${item.type})`).join(', ')}`
      );
    }

    const customValues = Object.entries(task.tableValues || {})
      .filter(([, value]) => value !== null && value !== '')
      .map(([key, value]) => `${key}: ${String(value)}`);
    if (customValues.length) details.push(`Campos do projeto: ${customValues.join('; ')}`);

    return {
      nome: task.name.trim(),
      descricao: details.join(' | '),
      dataInicio: projectDate(task.startDate),
      dataFim: projectDate(task.finishDate),
      percentualPrevisto: 0,
      percentualRealizado: 0,
      valorFinanceiro: 0,
      ordem: index + 1,
    };
  });

  const projectName = project.name?.trim() || path.parse(fileName).name.replace(/[-_]/g, ' ').trim();
  const obra: ImportedObra = {
    nome: projectName,
    codigo: generateCode(projectName),
    tipo: normalizeTipoString(projectName),
    endereco: '',
    cidade: '',
    estado: '',
    valorContratado: 0,
    dataInicio: projectDate(project.startDate),
    dataPrevisaoFim: projectDate(project.finishDate),
    descricao: `Cronograma estruturado importado do Microsoft Project (${fileName}).`,
  };

  return {
    obra,
    etapas,
    detectedFields: ['Nome da obra', 'Código', 'Descrição', 'Data de início', 'Previsão de término'],
    warnings: [
      `Microsoft Project processado estruturalmente: ${project.tasks.length} tarefas no arquivo, ${etapas.length} tarefas operacionais importadas com hierarquia, datas, duração e dependências.`,
    ],
  };
}

/**
 * Leitor nativo de arquivos Microsoft Project (.mpp) em TypeScript puro.
 * Funciona de forma 100% autônoma em qualquer ambiente (PROD, Vercel, Netlify, Linux, Docker, Windows)
 * sem necessidade de Python, Java ou binários externos.
 */
export function parseMppBuffer(buffer: Buffer, fileName: string): ParsedMppResult {
  if (buffer.length < 512 || buffer.readUInt32LE(0) !== 0xe011cfd0 || buffer.readUInt32LE(4) !== 0xe11ab1a1) {
    throw new Error('Arquivo não é um formato binário de Microsoft Project (.mpp) válido.');
  }

  const sectorSize = 1 << buffer.readUInt16LE(30);
  const dirFirstSector = buffer.readUInt32LE(48);

  const fat: number[] = [];
  for (let i = 0; i < 109; i++) {
    const fatSector = buffer.readUInt32LE(76 + i * 4);
    if (fatSector === 0xfffffffe || fatSector === 0xffffffff) continue;
    const offset = (fatSector + 1) * sectorSize;
    for (let j = 0; j < sectorSize; j += 4) {
      fat.push(buffer.readUInt32LE(offset + j));
    }
  }

  function getChain(startSector: number) {
    const chain: number[] = [];
    let cur = startSector;
    while (cur !== 0xfffffffe && cur < fat.length && chain.length < 10000) {
      chain.push(cur);
      cur = fat[cur];
    }
    return chain;
  }

  function readStream(startSector: number, size: number): Buffer {
    const chain = getChain(startSector);
    const chunks: Buffer[] = [];
    let remaining = size;
    for (const sec of chain) {
      const offset = (sec + 1) * sectorSize;
      const readLen = Math.min(remaining, sectorSize);
      chunks.push(buffer.subarray(offset, offset + readLen));
      remaining -= readLen;
      if (remaining <= 0) break;
    }
    return Buffer.concat(chunks);
  }

  const dirChain = getChain(dirFirstSector);
  const dirBytes: Buffer[] = [];
  for (const sec of dirChain) {
    const offset = (sec + 1) * sectorSize;
    dirBytes.push(buffer.subarray(offset, offset + sectorSize));
  }
  const dirBuf = Buffer.concat(dirBytes);

  interface DirEntry {
    index: number;
    name: string;
    type: number;
    startSector: number;
    size: number;
  }

  const entries: DirEntry[] = [];
  for (let i = 0; i < dirBuf.length; i += 128) {
    const entryBuf = dirBuf.subarray(i, i + 128);
    const nameLen = entryBuf.readUInt16LE(64);
    if (nameLen === 0) continue;
    const name = entryBuf.subarray(0, nameLen - 2).toString('utf16le');
    const type = entryBuf.readUInt8(66);
    const startSector = entryBuf.readUInt32LE(116);
    const size = entryBuf.readUInt32LE(120);
    entries.push({ index: entries.length, name, type, startSector, size });
  }

  // Filtrar todos os fluxos de strings Var2Data
  const var2Entries = entries.filter((e) => e.name === 'Var2Data' && e.size > 100);

  function extractStrings(streamBuf: Buffer): string[] {
    const strings: string[] = [];
    let cur: string[] = [];
    for (let i = 0; i < streamBuf.length - 1; i += 2) {
      const code = streamBuf.readUInt16LE(i);
      if (code === 0) {
        if (cur.length >= 3) {
          const s = cur.join('').trim();
          if (/^[A-Za-z0-9À-ÿ\s\-_.,/()#º°:%+–—]+$/.test(s) && /[a-zA-ZÀ-ÿ]/.test(s)) {
            strings.push(s);
          }
        }
        cur = [];
      } else if ((code >= 32 && code <= 126) || (code >= 192 && code <= 382)) {
        cur.push(String.fromCharCode(code));
      } else {
        if (cur.length >= 3) {
          const s = cur.join('').trim();
          if (/^[A-Za-z0-9À-ÿ\s\-_.,/()#º°:%+–—]+$/.test(s) && /[a-zA-ZÀ-ÿ]/.test(s)) {
            strings.push(s);
          }
        }
        cur = [];
      }
    }
    return strings;
  }

  // Avaliar qual fluxo contém as tarefas reais da obra (excluindo visualizações, calendários e recursos)
  let bestStreamTasks: string[] = [];
  for (const entry of var2Entries) {
    const streamBuf = readStream(entry.startSector, entry.size);
    const strings = extractStrings(streamBuf);

    const isMetaOrView = strings.some((s) => {
      const l = s.toLowerCase();
      return (
        l.includes('tarefa inativa') ||
        l.includes('marco inativo') ||
        l.includes('resumo manual') ||
        l.includes('gantt chart') ||
        l.includes('aniversário') ||
        l.includes('feriado nacional') ||
        l.includes('equipe planejamento')
      );
    });

    if (!isMetaOrView && strings.length > bestStreamTasks.length) {
      bestStreamTasks = strings;
    }
  }

  if (bestStreamTasks.length === 0) {
    throw new Error('Não foi possível identificar a lista de tarefas da obra no arquivo Microsoft Project.');
  }

  // Identificar nome da obra
  const baseFileName = path.parse(fileName).name.replace(/[-_]/g, ' ').trim();
  const projectName = bestStreamTasks[0] || baseFileName || 'Obra MS Project';

  // Identificar grupos de resumo e tarefas operacionais
  const isSummaryHeader = (name: string) => {
    const trimmed = name.trim();
    // Todo em maiúsculo ou termos comuns de grandes fases de obra
    const upper = trimmed === trimmed.toUpperCase() && trimmed.length >= 4 && /[A-Z]/.test(trimmed);
    const keywords = /^(EXECUÇÃO|PLANEJAMENTO|SUPRIMENTO|MOBILIZAÇÃO|PROJETO|FUNDAÇÃO|ESTRUTURA|COBERTURA|INSTALAÇÕES|ACABAMENTO|TESTES|ÁREA ADMINISTRATIVA)/i.test(trimmed);
    return upper || keywords;
  };

  const rawTasks = bestStreamTasks.slice(1);
  const etapas: ImportedEtapa[] = [];
  let currentGroup = '';
  let counter = 1;

  for (const taskName of rawTasks) {
    if (taskName.toLowerCase() === projectName.toLowerCase()) continue;
    if (taskName.length < 3) continue;

    if (isSummaryHeader(taskName)) {
      currentGroup = taskName;
      continue; // Não cadastra o grupo como etapa individual para manter apenas as tarefas reais
    }

    etapas.push({
      nome: taskName,
      descricao: currentGroup ? `Fase: ${currentGroup}` : '',
      dataInicio: '',
      dataFim: '',
      percentualPrevisto: 0,
      percentualRealizado: 0,
      valorFinanceiro: 0,
      ordem: counter++,
    });
  }

  // Se por algum motivo todas foram consideradas sumários, inclui todas
  if (etapas.length === 0) {
    rawTasks.forEach((t, idx) => {
      etapas.push({
        nome: t,
        descricao: '',
        dataInicio: '',
        dataFim: '',
        percentualPrevisto: 0,
        percentualRealizado: 0,
        valorFinanceiro: 0,
        ordem: idx + 1,
      });
    });
  }

  const obra: ImportedObra = {
    nome: projectName,
    codigo: generateCode(projectName),
    tipo: normalizeTipoString(projectName),
    endereco: '',
    cidade: '',
    estado: '',
    valorContratado: 0,
    dataInicio: '',
    dataPrevisaoFim: '',
    descricao: `Cronograma importado do Microsoft Project (${fileName}).`,
  };

  const detectedFields = ['Nome da obra', 'Código', 'Descrição'];
  if (obra.tipo !== 'OUTRO') detectedFields.push('Tipo');

  return {
    obra,
    etapas,
    detectedFields,
    warnings: [`Importação Microsoft Project concluída: ${etapas.length} etapas operacionais identificadas.`],
  };
}

/**
 * Parser nativo para arquivos Microsoft Project em formato XML (.xml)
 */
export function parseMppXml(xmlString: string, fileName: string): ParsedMppResult {
  const titleMatch = xmlString.match(/<Title>([^<]+)<\/Title>/i) || xmlString.match(/<Name>([^<]+)<\/Name>/i);
  const startMatch = xmlString.match(/<StartDate>([^<]+)<\/StartDate>/i);
  const finishMatch = xmlString.match(/<FinishDate>([^<]+)<\/FinishDate>/i);
  const costMatch = xmlString.match(/<TotalCost>([^<]+)<\/TotalCost>/i);

  const baseFileName = path.parse(fileName).name.replace(/[-_]/g, ' ').trim();
  const projectName = titleMatch ? titleMatch[1].trim() : baseFileName;

  const obra: ImportedObra = {
    nome: projectName,
    codigo: generateCode(projectName),
    tipo: normalizeTipoString(projectName),
    endereco: '',
    cidade: '',
    estado: '',
    valorContratado: costMatch ? Math.max(0, Number(costMatch[1])) : 0,
    dataInicio: startMatch ? startMatch[1].slice(0, 10) : '',
    dataPrevisaoFim: finishMatch ? finishMatch[1].slice(0, 10) : '',
    descricao: `Cronograma importado de arquivo XML Microsoft Project (${fileName}).`,
  };

  const etapas: ImportedEtapa[] = [];
  const taskRegex = /<Task>([\s\S]*?)<\/Task>/gi;
  let taskMatch: RegExpExecArray | null;

  while ((taskMatch = taskRegex.exec(xmlString)) !== null) {
    const block = taskMatch[1];
    const nameMatch = block.match(/<Name>([^<]+)<\/Name>/i);
    if (!nameMatch) continue;

    const name = nameMatch[1].trim();
    if (!name || name === projectName) continue;

    const isSummary = /<Summary>1<\/Summary>/i.test(block);
    if (isSummary) continue; // Pular tarefas resumo no XML

    const wbsMatch = block.match(/<WBS>([^<]+)<\/WBS>/i);
    const start = block.match(/<Start>([^<]+)<\/Start>/i);
    const finish = block.match(/<Finish>([^<]+)<\/Finish>/i);
    const pct = block.match(/<PercentComplete>([^<]+)<\/PercentComplete>/i);
    const cost = block.match(/<Cost>([^<]+)<\/Cost>/i);

    const wbsPrefix = wbsMatch && wbsMatch[1] !== '0' ? `${wbsMatch[1]} ` : '';

    etapas.push({
      nome: `${wbsPrefix}${name}`.trim(),
      descricao: wbsMatch ? `WBS: ${wbsMatch[1]}` : '',
      dataInicio: start ? start[1].slice(0, 10) : '',
      dataFim: finish ? finish[1].slice(0, 10) : '',
      percentualPrevisto: pct ? Math.min(100, Math.max(0, Number(pct[1]))) : 0,
      percentualRealizado: pct ? Math.min(100, Math.max(0, Number(pct[1]))) : 0,
      valorFinanceiro: cost ? Math.max(0, Number(cost[1])) : 0,
      ordem: etapas.length + 1,
    });
  }

  const detectedFields = ['Nome da obra', 'Código', 'Descrição'];
  if (obra.dataInicio) detectedFields.push('Data de início');
  if (obra.dataPrevisaoFim) detectedFields.push('Previsão de término');
  if (obra.valorContratado > 0) detectedFields.push('Valor contratado');

  return {
    obra,
    etapas,
    detectedFields,
    warnings: [`XML Microsoft Project processado: ${etapas.length} etapas operacionais identificadas.`],
  };
}

function generateCode(name: string): string {
  const words = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!words.length) return `OBRA-${new Date().getFullYear()}-001`;

  const initials = words
    .slice(0, 3)
    .map((w) => w[0].toUpperCase())
    .join('');
  const year = new Date().getFullYear();
  return `${initials || 'OBRA'}-${year}-001`;
}

function normalizeTipoString(name: string): ImportedObra['tipo'] {
  const lower = name.toLowerCase();
  if (lower.includes('galpao') || lower.includes('barracao') || lower.includes('hangar') || lower.includes('armazem'))
    return 'GALPAO';
  if (lower.includes('edificio') || lower.includes('predio') || lower.includes('residencial')) return 'EDIFICIO';
  if (lower.includes('ponte') || lower.includes('viaduto')) return 'PONTE';
  if (lower.includes('muro') && lower.includes('arrimo')) return 'MURO_ARRIMO';
  return 'OUTRO';
}
