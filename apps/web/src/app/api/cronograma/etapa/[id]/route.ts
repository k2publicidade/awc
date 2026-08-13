import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireSession } from '@/lib/session-context';
import { canAccessResource } from '@/lib/authorization';

async function canWriteEtapa(id: string) {
  const context = await requireSession();
  if (!context || !canAccessResource(context.role, 'etapas', true)) return false;
  return Boolean(
    await prisma.etapa.findFirst({
      where: { id, obra: { tenantId: context.tenantId } },
      select: { id: true },
    })
  );
}

/** PUT /api/cronograma/etapa/[id] — update etapa */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await canWriteEtapa(id)))
    return NextResponse.json({ error: 'Etapa não encontrada' }, { status: 404 });

  const body = await req.json();
  const data: DynamicValue = {};
  if (body.nome !== undefined) data.nome = body.nome;
  if (body.descricao !== undefined) data.descricao = body.descricao || null;
  if (body.dataInicio !== undefined)
    data.dataInicio = body.dataInicio ? new Date(body.dataInicio) : null;
  if (body.dataFim !== undefined) data.dataFim = body.dataFim ? new Date(body.dataFim) : null;
  if (body.dataInicioReal !== undefined)
    data.dataInicioReal = body.dataInicioReal ? new Date(body.dataInicioReal) : null;
  if (body.dataFimReal !== undefined)
    data.dataFimReal = body.dataFimReal ? new Date(body.dataFimReal) : null;
  if (body.percentualPrevisto !== undefined)
    data.percentualPrevisto = Number(body.percentualPrevisto) || 0;
  if (body.percentualRealizado !== undefined)
    data.percentualRealizado = Math.min(100, Math.max(0, Number(body.percentualRealizado) || 0));
  if (body.valorFinanceiro !== undefined) data.valorFinanceiro = Number(body.valorFinanceiro) || 0;
  if (body.ordem !== undefined) data.ordem = Number(body.ordem) || 0;
  if (body.cor !== undefined) data.cor = body.cor || null;
  const etapa = await prisma.etapa.update({ where: { id }, data });
  return NextResponse.json(etapa);
}

/** DELETE /api/cronograma/etapa/[id] */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await canWriteEtapa(id)))
    return NextResponse.json({ error: 'Etapa não encontrada' }, { status: 404 });

  await prisma.etapa.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
