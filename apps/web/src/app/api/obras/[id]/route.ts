import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireSession } from '@/lib/session-context';
import { assertTenantRelations } from '@/lib/authorization';

/** GET /api/obras/[id] */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await requireSession();
  if (!context) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const obra = await prisma.obra.findFirst({
    where: { id, tenantId: context.tenantId },
    include: {
      engenheiro: { select: { id: true, name: true, email: true } },
      cliente: { select: { id: true, name: true, email: true } },
      etapas: { orderBy: { ordem: 'asc' } },
      rdos: { orderBy: { data: 'desc' }, take: 5 },
      orcamentos: { orderBy: { createdAt: 'desc' } },
      documentos: { orderBy: { createdAt: 'desc' } },
    },
  });

  if (!obra) return NextResponse.json({ error: 'Obra não encontrada' }, { status: 404 });
  return NextResponse.json(obra);
}

/** PUT /api/obras/[id] */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await requireSession(['SUPER_ADMIN', 'ADMIN', 'ENGENHEIRO']);
  if (!context) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });

  const existing = await prisma.obra.findFirst({
    where: { id, tenantId: context.tenantId },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: 'Obra não encontrada' }, { status: 404 });

  const body = await req.json();
  const allowed = [
    'nome', 'codigo', 'tipo', 'endereco', 'cidade', 'estado', 'latitude', 'longitude',
    'valorContratado', 'dataInicio', 'dataPrevisaoFim', 'dataConclusao', 'status',
    'engenheiroId', 'clienteId', 'descricao',
  ];
  const data: DynamicValue = {};
  for (const key of allowed) if (key in body) data[key] = body[key];
  for (const key of ['dataInicio', 'dataPrevisaoFim', 'dataConclusao']) {
    if (key in data) data[key] = data[key] ? new Date(data[key]) : null;
  }
  await assertTenantRelations(data, context.tenantId);
  const obra = await prisma.obra.update({ where: { id }, data });
  return NextResponse.json(obra);
}

/** DELETE /api/obras/[id] */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await requireSession(['SUPER_ADMIN', 'ADMIN']);
  if (!context) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });

  const existing = await prisma.obra.findFirst({
    where: { id, tenantId: context.tenantId },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: 'Obra não encontrada' }, { status: 404 });

  await prisma.obra.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
