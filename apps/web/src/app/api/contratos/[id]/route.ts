import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireSession } from '@/lib/session-context';
import { assertTenantRelations, canAccessResource } from '@/lib/authorization';

async function contextFor(id: string, write = false) {
  const context = await requireSession();
  if (!context || !canAccessResource(context.role, 'contratos', write)) return null;
  const row = await prisma.contrato.findFirst({
    where: { id, obra: { tenantId: context.tenantId } },
    select: { id: true },
  });
  return row ? context : null;
}

/** GET /api/contratos/[id] */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await contextFor(id);
  if (!context) return NextResponse.json({ error: 'Contrato não encontrado' }, { status: 404 });

  const contrato = await prisma.contrato.findFirst({
    where: { id, obra: { tenantId: context.tenantId } },
    include: { fornecedor: true, pagamentos: { orderBy: { dataVencimento: 'asc' } } },
  });
  if (!contrato) return NextResponse.json({ error: 'Contrato não encontrado' }, { status: 404 });
  return NextResponse.json(contrato);
}

/** PUT /api/contratos/[id] */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await contextFor(id, true);
  if (!context) return NextResponse.json({ error: 'Contrato não encontrado' }, { status: 404 });

  const body = await req.json();
  const allowed = [
    'fornecedorId', 'numero', 'objeto', 'tipo', 'valor', 'valorAditivo', 'dataInicio', 'dataFim',
    'status', 'observacoes',
  ];
  const data: DynamicValue = {};
  for (const key of allowed) if (key in body) data[key] = body[key];
  for (const key of ['dataInicio', 'dataFim']) {
    if (key in data) data[key] = data[key] ? new Date(data[key]) : null;
  }
  await assertTenantRelations(data, context.tenantId);
  const contrato = await prisma.contrato.update({ where: { id }, data });
  return NextResponse.json(contrato);
}

/** DELETE /api/contratos/[id] */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await contextFor(id, true);
  if (!context) return NextResponse.json({ error: 'Contrato não encontrado' }, { status: 404 });

  await prisma.contrato.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
