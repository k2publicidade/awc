import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireSession } from '@/lib/session-context';
import { assertTenantRelations, canAccessResource } from '@/lib/authorization';

/** POST /api/medicao — Create medição */
export async function POST(req: NextRequest) {
  const context = await requireSession();
  if (!context) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  if (!canAccessResource(context.role, 'medicoes', true))
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
  const userId = context.userId;

  const body = await req.json();
  await assertTenantRelations({ obraId: body.obraId }, context.tenantId);
  for (const item of body.itens || [])
    await assertTenantRelations({ etapaId: item.etapaId }, context.tenantId);
  const medicao = await prisma.medicao.create({
    data: {
      numero: body.numero,
      periodoInicio: new Date(body.periodoInicio),
      periodoFim: new Date(body.periodoFim),
      obraId: body.obraId,
      createdBy: userId,
      status: 'EM_ELABORACAO',
      itens: { create: body.itens || [] },
    },
    include: { itens: true },
  });

  return NextResponse.json(medicao, { status: 201 });
}

/** PUT /api/medicao — Update medição status */
export async function PUT(req: NextRequest) {
  const context = await requireSession();
  if (!context) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  if (!canAccessResource(context.role, 'medicoes', true))
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });

  const body = await req.json();
  const existing = await prisma.medicao.findFirst({
    where: { id: body.id, obra: { tenantId: context.tenantId } },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: 'Medição não encontrada' }, { status: 404 });
  const medicao = await prisma.medicao.update({
    where: { id: body.id },
    data: { status: body.status, observacao: body.observacoes ?? body.observacao },
  });

  return NextResponse.json(medicao);
}
