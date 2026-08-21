import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireSession } from '@/lib/session-context';
import { assertTenantRelations, canAccessResource, userObraWhere } from '@/lib/authorization';

export async function GET(req: NextRequest) {
  const context = await requireSession();
  if (!context) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  if (!canAccessResource(context.role, 'contratos'))
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const obraId = searchParams.get('obraId');
  const status = searchParams.get('status');
  const userObraScope = userObraWhere(context.role, context.tenantId, context.userId);

  const where: DynamicValue = { obra: userObraScope };
  if (obraId) where.obraId = obraId;
  if (status) where.status = status;

  const contratos = await prisma.contrato.findMany({
    where,
    include: {
      fornecedor: { select: { razaoSocial: true, cnpj: true } },
      pagamentos: true,
      obra: { select: { nome: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(contratos);
}

export async function POST(req: NextRequest) {
  const context = await requireSession();
  if (!context) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  if (!canAccessResource(context.role, 'contratos', true))
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });

  try {
    const body = await req.json();
    const { tenantOwnsObra } = await import('@/lib/authorization');
    if (!(await tenantOwnsObra(body.obraId, context.tenantId, context.userId, context.role))) {
      return NextResponse.json({ error: 'Obra não encontrada' }, { status: 404 });
    }
    if (!body.fornecedorId) {
      return NextResponse.json(
        { error: 'Selecione um fornecedor para cadastrar o contrato.' },
        { status: 400 }
      );
    }
    await assertTenantRelations(
      { obraId: body.obraId, fornecedorId: body.fornecedorId },
      context.tenantId
    );
    const contrato = await prisma.contrato.create({
      data: {
        numero: body.numero,
        objeto: body.objeto,
        tipo: body.tipo,
        valor: parseFloat(body.valor),
        obraId: body.obraId,
        fornecedorId: body.fornecedorId,
        dataInicio: new Date(body.dataInicio),
        dataFim: new Date(body.dataFim),
        status: body.status || 'VIGENTE',
      },
    });

    return NextResponse.json(contrato, { status: 201 });
  } catch (error: DynamicValue) {
    if (error?.code === 'P2003')
      return NextResponse.json(
        { error: 'Fornecedor não encontrado. Verifique o vínculo selecionado.' },
        { status: 400 }
      );
    return NextResponse.json({ error: error?.message || 'Erro ao criar contrato' }, { status: 500 });
  }
}
