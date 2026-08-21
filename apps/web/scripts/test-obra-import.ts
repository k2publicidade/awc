import assert from 'node:assert/strict';
import writeXlsxFile, { type SheetData } from 'write-excel-file/node';
import {
  parseBrazilianNumber,
  parseDelimitedText,
  parseImportDate,
  parseObraFile,
  parseWordText,
} from '../src/lib/import/obra-import';
import { mapStructuredMppProject, parseMppXml } from '../src/lib/import/mpp-parser';
import { assertImportedStageCount } from '../src/lib/import/import-integrity';

async function main() {
  assert.equal(parseBrazilianNumber('R$ 2.450.100,75'), 2450100.75);
  assert.equal(parseImportDate('17/09/2026'), '2026-09-17');
  assert.deepEqual(parseDelimitedText('Campo;Valor\nCódigo;OBR-90'), [
    ['Campo', 'Valor'],
    ['Código', 'OBR-90'],
  ]);

  const csv = Buffer.from(
    [
      'Campo;Valor',
      'Nome da obra;Hospital Regional',
      'Código;HOSP-01',
      'Tipo;Edifício',
      'Cidade;Campinas',
      'Estado;SP',
      'Valor contratado;R$ 12.500.000,00',
      'Data de início;01/10/2026',
    ].join('\n')
  );
  const csvPreview = await parseObraFile({ name: 'hospital.csv', size: csv.length, buffer: csv });
  assert.equal(csvPreview.obra.nome, 'Hospital Regional');
  assert.equal(csvPreview.obra.codigo, 'HOSP-01');
  assert.equal(csvPreview.obra.tipo, 'EDIFICIO');
  assert.equal(csvPreview.obra.valorContratado, 12500000);

  const obraSheet: SheetData = [
    [{ value: 'Campo' }, { value: 'Valor' }],
    [{ value: 'Nome da obra' }, { value: 'Centro de Distribuição' }],
    [{ value: 'Código' }, { value: 'CD-2026' }],
    [{ value: 'Tipo' }, { value: 'Galpão' }],
    [{ value: 'Cidade' }, { value: 'Sorocaba' }],
    [{ value: 'Valor contratado' }, { value: 3500000 }],
  ];
  const etapasSheet: SheetData = [
    [
      { value: 'Etapa' },
      { value: 'Data início' },
      { value: 'Data fim' },
      { value: '% previsto' },
      { value: 'Valor financeiro' },
      { value: 'Ordem' },
    ],
    [
      { value: 'Terraplenagem' },
      { value: '10/10/2026' },
      { value: '30/10/2026' },
      { value: 100 },
      { value: 275000 },
      { value: 1 },
    ],
  ];
  const workbook = await writeXlsxFile([
    { sheet: 'Obra', data: obraSheet },
    { sheet: 'Cronograma', data: etapasSheet },
  ]).toBuffer();
  const xlsxPreview = await parseObraFile({
    name: 'centro-distribuicao.xlsx',
    size: workbook.length,
    buffer: workbook,
  });
  assert.equal(xlsxPreview.obra.nome, 'Centro de Distribuição');
  assert.equal(xlsxPreview.etapas.length, 1);
  assert.equal(xlsxPreview.etapas[0].nome, 'Terraplenagem');
  assert.equal(xlsxPreview.etapas[0].dataInicio, '2026-10-10');

  const word = parseWordText(`
    Nome da obra: Ponte sobre o Rio Azul
    Código: PON-08
    Tipo: Ponte
    Cidade: Curitiba
    Estado: PR
    Valor contratado: R$ 8.900.000,00
    Etapa 1: Fundações | 01/11/2026 | 15/12/2026 | R$ 1.200.000,00
  `);
  assert.equal(word.obra.nome, 'Ponte sobre o Rio Azul');
  assert.equal(word.obra.tipo, 'PONTE');
  assert.equal(word.etapas.length, 1);
  assert.equal(word.etapas[0].valorFinanceiro, 1200000);

  const xmlTasks = Array.from({ length: 350 }, (_, index) => `
    <Task>
      <UID>${index + 1}</UID>
      <ID>${index + 1}</ID>
      <Name>Atividade ${index + 1}</Name>
      <WBS>${index + 1}</WBS>
      <Summary>0</Summary>
      <Start>2026-01-01T08:00:00</Start>
      <Finish>2026-01-02T17:00:00</Finish>
    </Task>
  `).join('');
  const mppXml = parseMppXml(
    `<Project><Title>Projeto Completo</Title><Tasks>${xmlTasks}</Tasks></Project>`,
    'projeto-completo.xml'
  );
  assert.equal(mppXml.etapas.length, 350, 'não deve truncar silenciosamente tarefas do projeto');

  const structured = mapStructuredMppProject(
    {
      name: 'Projeto Estruturado',
      startDate: '2026-02-01T08:00',
      finishDate: '2026-06-30T17:00',
      tasks: [
        { id: 1, name: 'EXECUÇÃO', level: 1, startDate: '2026-02-01T08:00', finishDate: '2026-06-30T17:00', durationDays: 100, isSummary: true, isMilestone: false, parentId: null, predecessors: [] },
        { id: 2, name: 'Fundação', level: 2, startDate: '2026-02-01T08:00', finishDate: '2026-02-10T17:00', durationDays: 8, isSummary: false, isMilestone: false, parentId: 1, predecessors: [] },
        { id: 3, name: 'Estrutura', level: 2, startDate: '2026-02-11T08:00', finishDate: '2026-03-10T17:00', durationDays: 20, isSummary: false, isMilestone: false, parentId: 1, predecessors: [{ taskId: 2, type: 'FS' }] },
      ],
    },
    'projeto.mpp'
  );
  assert.equal(structured.etapas.length, 2);
  assert.equal(structured.etapas[0].dataInicio, '2026-02-01');
  assert.match(structured.etapas[0].descricao, /Fase: EXECUÇÃO/);
  assert.match(structured.etapas[1].descricao, /Predecessoras: 2 \(FS\)/);

  assert.doesNotThrow(() => assertImportedStageCount(77, 77));
  assert.throws(
    () => assertImportedStageCount(77, 8),
    /Integridade da importação violada: esperadas 77 etapas, mas 8 foram gravadas/
  );

  console.log('Importador de obras: formatos, volume e integridade aprovados.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
