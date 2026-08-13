import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireSession } from '@/lib/session-context';
import { canAccessResource } from '@/lib/authorization';

export async function GET() {
  const context = await requireSession();
  if (!context) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  if (!canAccessResource(context.role, 'materiais'))
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });

  const materiais = await prisma.material.findMany({
    where: { tenantId: context.tenantId },
    include: { _count: { select: { estoqueMovimentos: true } } },
    orderBy: { descricao: 'asc' },
  });

  // Saldo atual em uma única query agrupada (evita N+1 no pool de conexões)
  const movimentos = await prisma.estoqueMovimento.groupBy({
    by: ['materialId', 'tipo'],
    where: { material: { tenantId: context.tenantId } },
    _sum: { quantidade: true },
  });
  const saldo = new Map<string, number>();
  for (const mov of movimentos) {
    const atual = saldo.get(mov.materialId) || 0;
    const qtd = mov._sum.quantidade || 0;
    saldo.set(mov.materialId, mov.tipo === 'ENTRADA' ? atual + qtd : atual - qtd);
  }
  const result = materiais.map((m) => {
    const estoqueAtual = saldo.get(m.id) || 0;
    return {
      ...m,
      estoqueAtual,
      estoqueMinimo: m.estoqueMinimo,
      alerta: estoqueAtual <= m.estoqueMinimo,
    };
  });

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const context = await requireSession();
  if (!context) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  if (!canAccessResource(context.role, 'materiais', true))
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });

  const body = await req.json();
  const material = await prisma.material.create({
    data: {
      codigo: body.codigo,
      descricao: body.descricao,
      unidade: body.unidade,
      estoqueMinimo: body.estoqueMinimo || 0,
      categoria: body.categoria || null,
      tenantId: context.tenantId,
    },
  });

  return NextResponse.json(material, { status: 201 });
}
