import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireSession } from '@/lib/session-context';
import { assertTenantRelations, canAccessResource } from '@/lib/authorization';

async function contextFor(id: string, write = false) {
  const context = await requireSession();
  if (!context || !canAccessResource(context.role, 'ocorrencias', write)) return null;
  const row = await prisma.ocorrencia.findFirst({
    where: { id, obra: { tenantId: context.tenantId } },
    select: { id: true },
  });
  return row ? context : null;
}

/** GET /api/ocorrencias/[id] */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await contextFor(id);
  if (!context) return NextResponse.json({ error: 'Ocorrência não encontrada' }, { status: 404 });

  const ocorrencia = await prisma.ocorrencia.findFirst({
    where: { id, obra: { tenantId: context.tenantId } },
    include: { obra: { select: { nome: true } }, etapa: { select: { nome: true } } },
  });
  if (!ocorrencia)
    return NextResponse.json({ error: 'Ocorrência não encontrada' }, { status: 404 });
  return NextResponse.json(ocorrencia);
}

/** PUT /api/ocorrencias/[id] */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await contextFor(id, true);
  if (!context) return NextResponse.json({ error: 'Ocorrência não encontrada' }, { status: 404 });

  const body = await req.json();
  const allowed = [
    'etapaId', 'tipo', 'descricao', 'impactoDias', 'responsavelEncerramentoId', 'resolucao',
    'status', 'dataEncerramento',
  ];
  const data: DynamicValue = {};
  for (const key of allowed) if (key in body) data[key] = body[key];
  if ('dataEncerramento' in data)
    data.dataEncerramento = data.dataEncerramento ? new Date(data.dataEncerramento) : null;
  await assertTenantRelations(data, context.tenantId);
  const ocorrencia = await prisma.ocorrencia.update({ where: { id }, data });
  return NextResponse.json(ocorrencia);
}

/** DELETE /api/ocorrencias/[id] */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await contextFor(id, true);
  if (!context) return NextResponse.json({ error: 'Ocorrência não encontrada' }, { status: 404 });

  await prisma.ocorrencia.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
