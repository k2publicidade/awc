import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireSession } from '@/lib/session-context';
import { assertTenantRelations, canAccessResource } from '@/lib/authorization';

export async function GET(req: NextRequest) {
  const context = await requireSession();
  if (!context) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  if (!canAccessResource(context.role, 'ocorrencias'))
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const obraId = searchParams.get('obraId');
  const status = searchParams.get('status');
  const where: DynamicValue = { obra: { tenantId: context.tenantId } };
  if (obraId) where.obraId = obraId;
  if (status) where.status = status;

  const ocorrencias = await prisma.ocorrencia.findMany({
    where,
    include: { obra: { select: { nome: true } } },
    orderBy: { dataAbertura: 'desc' },
  });

  return NextResponse.json(ocorrencias);
}

export async function POST(req: NextRequest) {
  const context = await requireSession();
  if (!context) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  if (!canAccessResource(context.role, 'ocorrencias', true))
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });

  const body = await req.json();
  await assertTenantRelations({ obraId: body.obraId, etapaId: body.etapaId }, context.tenantId);
  const ocorrencia = await prisma.ocorrencia.create({
    data: {
      dataAbertura: body.data ? new Date(body.data) : new Date(),
      tipo: body.tipo,
      descricao: body.descricao,
      obraId: body.obraId,
      etapaId: body.etapaId || null,
      impactoDias: body.impactoPrazoDias || body.impactoDias || 0,
      responsavelAberturaId: context.userId,
      status: 'ABERTO',
    },
  });

  return NextResponse.json(ocorrencia, { status: 201 });
}
