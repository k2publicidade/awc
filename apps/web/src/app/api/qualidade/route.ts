import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireSession } from '@/lib/session-context';
import { assertTenantRelations, canAccessResource, userObraWhere } from '@/lib/authorization';

export async function GET(req: NextRequest) {
  const context = await requireSession();
  if (!context) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  if (!canAccessResource(context.role, 'qualidade'))
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const obraId = searchParams.get('obraId');

  const userObraScope = userObraWhere(context.role, context.tenantId, context.userId);

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

  try {
    const body = await req.json();
    const { tenantOwnsObra } = await import('@/lib/authorization');
    if (!(await tenantOwnsObra(body.obraId, context.tenantId, context.userId, context.role))) {
      return NextResponse.json({ error: 'Obra não encontrada' }, { status: 404 });
    }

    if (body.type === 'inspecao') {
      if (!body.etapaId && !body.etapa) {
        return NextResponse.json(
          { error: 'Selecione a etapa da inspeção.' },
          { status: 400 }
        );
      }
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
      if (!body.descricao || !body.severidade) {
        return NextResponse.json(
          { error: 'Descrição e severidade são obrigatórias.' },
          { status: 400 }
        );
      }
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
  } catch (error: DynamicValue) {
    if (error?.code === 'P2003')
      return NextResponse.json(
        { error: 'Obra, etapa ou responsável não encontrado. Verifique os vínculos.' },
        { status: 400 }
      );
    return NextResponse.json({ error: error?.message || 'Erro ao salvar' }, { status: 500 });
  }
}
