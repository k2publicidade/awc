import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireSession } from '@/lib/session-context';
import { assertTenantRelations, canAccessResource } from '@/lib/authorization';

export async function GET(req: NextRequest) {
  const context = await requireSession();
  if (!context) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  if (!canAccessResource(context.role, 'orcamentos'))
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const obraId = searchParams.get('obraId');
  const userObraScope =
    context.role === 'MASTER_ADMIN'
      ? { tenantId: context.tenantId }
      : {
          tenantId: context.tenantId,
          OR: [
            { engenheiroId: context.userId },
            { clienteId: context.userId },
          ],
        };

  const where: DynamicValue = { obra: userObraScope };
  if (obraId) where.obraId = obraId;

  const orcamentos = await prisma.orcamento.findMany({
    where,
    include: {
      obra: { select: { nome: true, codigo: true } },
      versoes: { orderBy: { versao: 'desc' }, take: 1 },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(orcamentos);
}

export async function POST(req: NextRequest) {
  const context = await requireSession();
  if (!context) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  if (!canAccessResource(context.role, 'orcamentos', true))
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });

  const body = await req.json();
  const { tenantOwnsObra } = await import('@/lib/authorization');
  if (!(await tenantOwnsObra(body.obraId, context.tenantId, context.userId, context.role))) {
    return NextResponse.json({ error: 'Obra não encontrada' }, { status: 404 });
  }
  await assertTenantRelations({ obraId: body.obraId }, context.tenantId);
  const orcamento = await prisma.orcamento.create({
    data: {
      obraId: body.obraId,
      status: 'EM_ELABORACAO',
      valorTotal: body.valorTotal || 0,
      justificativa: body.nome || body.justificativa || null,
      createdBy: context.userId,
      versoes: {
        create: { versao: 1, valorTotal: body.valorTotal || 0, justificativa: 'Versão inicial' },
      },
    },
  });

  return NextResponse.json(orcamento, { status: 201 });
}
