import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireSession } from '@/lib/session-context';
import { assertTenantRelations, canAccessResource } from '@/lib/authorization';

export async function GET(req: NextRequest) {
  const context = await requireSession();
  if (!context) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  if (!canAccessResource(context.role, 'estoqueMovimentos'))
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const materialId = searchParams.get('materialId');
  const obraId = searchParams.get('obraId');
  const where: DynamicValue = { obra: { tenantId: context.tenantId } };
  if (materialId) where.materialId = materialId;
  if (obraId) where.obraId = obraId;

  const movimentos = await prisma.estoqueMovimento.findMany({
    where,
    include: { material: true, fornecedor: true },
    orderBy: { data: 'desc' },
  });

  return NextResponse.json(movimentos);
}

export async function POST(req: NextRequest) {
  const context = await requireSession();
  if (!context) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  if (!canAccessResource(context.role, 'estoqueMovimentos', true))
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });

  const body = await req.json();
  await assertTenantRelations(
    {
      obraId: body.obraId,
      materialId: body.materialId,
      fornecedorId: body.fornecedorId,
      etapaId: body.etapaId,
    },
    context.tenantId
  );
  const movimento = await prisma.estoqueMovimento.create({
    data: {
      tipo: body.tipo,
      materialId: body.materialId,
      obraId: body.obraId,
      quantidade: body.quantidade,
      data: body.data ? new Date(body.data) : new Date(),
      precoUnitario: body.precoUnitario != null ? parseFloat(body.precoUnitario) : 0,
      fornecedorId: body.fornecedorId || null,
      nfNumero: body.notaFiscal || body.nfNumero || null,
      etapaId: body.etapaId || null,
      justificativa: body.observacao || body.justificativa || null,
      responsavelId: context.userId,
    },
  });

  return NextResponse.json(movimento, { status: 201 });
}
