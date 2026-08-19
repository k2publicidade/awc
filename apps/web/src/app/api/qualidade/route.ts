import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireSession } from '@/lib/session-context';
import { assertTenantRelations, canAccessResource } from '@/lib/authorization';

export async function GET(req: NextRequest) {
  const context = await requireSession();
  if (!context) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  if (!canAccessResource(context.role, 'qualidade'))
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

  const [inspecoes, ncs] = await Promise.all([
    prisma.inspecao.findMany({ where, include: { itens: true }, orderBy: { data: 'desc' } }),
    prisma.naoConformidade.findMany({ where, orderBy: { createdAt: 'desc' } }),
  ]);

  return NextResponse.json({ inspecoes, ncs });
}

export async function POST(req: NextRequest) {
  const context = await requireSession();
  if (!context) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  if (!canAccessResource(context.role, 'qualidade', true))
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });

  const body = await req.json();
  const { tenantOwnsObra } = await import('@/lib/authorization');
  if (!(await tenantOwnsObra(body.obraId, context.tenantId, context.userId, context.role))) {
    return NextResponse.json({ error: 'Obra não encontrada' }, { status: 404 });
  }

  if (body.type === 'inspecao') {
    await assertTenantRelations(
      {
        obraId: body.obraId,
        etapaId: body.etapaId || body.etapa,
        responsavelId: body.responsavelId || body.responsavel || context.userId,
      },
      context.tenantId
    );
    const inspecao = await prisma.inspecao.create({
      data: {
        data: body.data ? new Date(body.data) : new Date(),
        etapaId: body.etapaId || body.etapa,
        tipo: body.tipo || 'ESTRUTURA',
        responsavelId: body.responsavelId || body.responsavel || context.userId,
        obraId: body.obraId,
        resultado: body.resultado === 'NAO_CONFORME' ? 'NAO_CONFORME' : 'CONFORME',
        itens: { create: body.itens || [] },
      },
      include: { itens: true },
    });
    return NextResponse.json(inspecao, { status: 201 });
  }

  if (body.type === 'nc') {
    await assertTenantRelations(
      { obraId: body.obraId, responsavelId: body.responsavelId || body.responsavel },
      context.tenantId
    );
    const nc = await prisma.naoConformidade.create({
      data: {
        descricao: body.descricao,
        causaRaiz: body.causaRaiz || null,
        severidade: body.severidade,
        obraId: body.obraId,
        responsavelId: body.responsavelId || body.responsavel || null,
        prazo: body.prazo ? new Date(body.prazo) : null,
        acaoCorretiva: body.acaoCorretiva || null,
        status: 'ABERTA',
      },
    });
    return NextResponse.json(nc, { status: 201 });
  }

  return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 });
}
