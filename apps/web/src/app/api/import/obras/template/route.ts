import { NextResponse } from 'next/server';
import writeXlsxFile, { type SheetData } from 'write-excel-file/node';
import { requireSession } from '@/lib/session-context';
import { canAccessResource } from '@/lib/authorization';

export const runtime = 'nodejs';

const header = (value: string) => ({
  value,
  fontWeight: 'bold' as const,
  color: '#FFFFFF',
  backgroundColor: '#17212B',
  align: 'center' as const,
});

export async function GET() {
  const context = await requireSession();
  if (!context) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  if (!canAccessResource(context.role, 'obras', true))
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });

  const obra: SheetData = [
    [header('Campo'), header('Valor')],
    [{ value: 'Nome da obra' }, { value: 'Centro Logístico RIGOR' }],
    [{ value: 'Código' }, { value: 'OBR-001' }],
    [{ value: 'Tipo' }, { value: 'GALPAO' }],
    [{ value: 'Endereço' }, { value: 'Rodovia BR-000, km 10' }],
    [{ value: 'Cidade' }, { value: 'São Paulo' }],
    [{ value: 'Estado' }, { value: 'SP' }],
    [{ value: 'Valor contratado' }, { value: 2500000, format: 'R$ #,##0.00' }],
    [{ value: 'Data de início' }, { value: '01/09/2026' }],
    [{ value: 'Previsão de fim' }, { value: '30/06/2027' }],
    [{ value: 'Descrição' }, { value: 'Construção de galpão logístico e áreas administrativas.' }],
  ];
  const etapas: SheetData = [
    [
      header('Etapa'),
      header('Descrição'),
      header('Data início'),
      header('Data fim'),
      header('% previsto'),
      header('% realizado'),
      header('Valor financeiro'),
      header('Ordem'),
    ],
    [
      { value: 'Mobilização' },
      { value: 'Instalação do canteiro' },
      { value: '01/09/2026' },
      { value: '15/09/2026' },
      { value: 100 },
      { value: 0 },
      { value: 120000, format: 'R$ #,##0.00' },
      { value: 1 },
    ],
    [
      { value: 'Fundações' },
      { value: 'Estacas, blocos e vigas baldrame' },
      { value: '16/09/2026' },
      { value: '30/11/2026' },
      { value: 100 },
      { value: 0 },
      { value: 680000, format: 'R$ #,##0.00' },
      { value: 2 },
    ],
  ];

  const buffer = await writeXlsxFile(
    [
      { sheet: 'Obra', data: obra, columns: [{ width: 28 }, { width: 58 }] },
      {
        sheet: 'Etapas',
        data: etapas,
        columns: [
          { width: 24 },
          { width: 36 },
          { width: 16 },
          { width: 16 },
          { width: 14 },
          { width: 14 },
          { width: 20 },
          { width: 10 },
        ],
      },
    ],
    { fontFamily: 'Arial', fontSize: 11 }
  ).toBuffer();

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="modelo-importacao-rigor.xlsx"',
      'Cache-Control': 'private, max-age=300',
    },
  });
}
