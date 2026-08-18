import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import prisma from '@/lib/prisma';
import { requireSession } from '@/lib/session-context';
import { canAccessResource } from '@/lib/authorization';
import { readUpload } from '@/lib/storage';
import { generateRdoPdf } from '@/lib/reports/rdo-pdf';

export const runtime = 'nodejs';

/** GET /api/rdo/[id]/pdf — generate RDO PDF */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await requireSession();
  if (!context) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  if (!canAccessResource(context.role, 'rdos'))
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });

  const rdo = await prisma.rDO.findFirst({
    where: { id, obra: { tenantId: context.tenantId } },
    include: {
      obra: { select: { nome: true } },
      responsavel: { select: { name: true } },
      climas: true,
      efetivos: true,
      atividades: { include: { etapa: { select: { nome: true } } } },
      equipamentos: true,
      fotos: true,
    },
  });

  if (!rdo) return NextResponse.json({ error: 'RDO não encontrado' }, { status: 404 });

  const climaManha = rdo.climas.find((c) => c.periodo === 'MANHA');
  const climaTarde = rdo.climas.find((c) => c.periodo === 'TARDE');

  const photos = await Promise.all(
    rdo.fotos.map(async (foto) => {
      if (!foto.url.startsWith('/api/uploads/')) return null;
      const stored = await readUpload(foto.url.slice('/api/uploads/'.length));
      if (!stored.ok) return null;
      const contentType = stored.headers.get('content-type')?.split(';')[0].toLowerCase();
      if (!contentType?.startsWith('image/')) return null;
      const original = Buffer.from(await stored.arrayBuffer());
      try {
        const jpeg = contentType === 'image/jpeg'
          ? original
          : await sharp(original, { failOn: 'warning' }).rotate().jpeg({ quality: 88, mozjpeg: true }).toBuffer();
        return { bytes: new Uint8Array(jpeg), legenda: foto.legenda, data: foto.data };
      } catch {
        return null;
      }
    })
  );
  const pdf = generateRdoPdf({
    numero: rdo.numero,
    data: rdo.data,
    obra: rdo.obra.nome,
    responsavel: rdo.responsavel?.name || rdo.assinaturaNome || '-',
    clima: rdo.climas.length ? `Manhã: ${climaManha?.condicao || '-'} | Tarde: ${climaTarde?.condicao || '-'}` : undefined,
    efetivos: rdo.efetivos.map((item) => ({ funcao: item.funcao, presentes: item.quantidadePresente, ausentes: item.quantidadeAusente })),
    atividades: rdo.atividades.map((item) => ({ descricao: item.descricao, etapa: item.etapa?.nome || '-', percentual: item.percentualExecutado || 0 })),
    equipamentos: rdo.equipamentos.map((item) => ({ nome: item.equipamento, horas: Number(item.horasTrabalhadas) })),
    observacoes: rdo.observacoes,
    fotos: photos.filter((photo): photo is NonNullable<typeof photo> => Boolean(photo)),
  });

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="RDO-${rdo.numero}.pdf"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
