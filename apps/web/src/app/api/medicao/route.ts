import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireSession } from '@/lib/session-context';
import { assertTenantRelations, canAccessResource, userObraWhere } from '@/lib/authorization';

/** POST /api/medicao — Create medição */
export async function POST(req: NextRequest) {
  const context = await requireSession();
  if (!context) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  if (!canAccessResource(context.role, 'medicoes', true))
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
  const userId = context.userId;

  try {
    const body = await req.json();
    const { tenantOwnsObra } = await import('@/lib/authorization');
    if (!(await tenantOwnsObra(body.obraId, context.tenantId, context.userId, context.role))) {
      return NextResponse.json({ error: 'Obra não encontrada' }, { status: 404 });
    }
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
  } catch (error: DynamicValue) {
    if (error?.code === 'P2002')
      return NextResponse.json(
        { error: 'Já existe uma medição com este número para esta obra.' },
        { status: 409 }
      );
    if (error?.code === 'P2003')
      return NextResponse.json(
        { error: 'Obra ou etapa não encontrada. Verifique os vínculos selecionados.' },
        { status: 400 }
      );
    return NextResponse.json({ error: error?.message || 'Erro ao criar medição' }, { status: 500 });
  }
}

/** PUT /api/medicao — Update medição status */
export async function PUT(req: NextRequest) {
  const context = await requireSession();
  if (!context) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  if (!canAccessResource(context.role, 'medicoes', true))
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });

  const body = await req.json();
  const userObraScope = userObraWhere(context.role, context.tenantId, context.userId);

  const existing = await prisma.medicao.findFirst({
    where: { id: body.id, obra: userObraScope },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: 'Medição não encontrada' }, { status: 404 });
  const medicao = await prisma.medicao.update({
    where: { id: body.id },
    data: { status: body.status, observacao: body.observacoes ?? body.observacao },
  });

  return NextResponse.json(medicao);
}
