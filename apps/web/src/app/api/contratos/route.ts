import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireSession } from '@/lib/session-context';
import { assertTenantRelations, canAccessResource } from '@/lib/authorization';

export async function GET(req: NextRequest) {
  const context = await requireSession();
  if (!context) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  if (!canAccessResource(context.role, 'contratos'))
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const obraId = searchParams.get('obraId');
  const status = searchParams.get('status');
  const where: DynamicValue = { obra: { tenantId: context.tenantId } };
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

  const body = await req.json();
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
      fornecedorId: body.fornecedorId || null,
      dataInicio: new Date(body.dataInicio),
      dataFim: new Date(body.dataFim),
      status: body.status || 'VIGENTE',
    },
  });

  return NextResponse.json(contrato, { status: 201 });
}
