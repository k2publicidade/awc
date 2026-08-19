import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireSession } from '@/lib/session-context';
import { assertTenantRelations, canAccessResource } from '@/lib/authorization';

export async function GET(req: NextRequest) {
  const context = await requireSession();
  if (!context) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  if (!canAccessResource(context.role, 'financeiro'))
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

  const [aPagar, aReceber, nfs] = await Promise.all([
    prisma.lancamentoFinanceiro.findMany({
      where: { ...where, tipo: 'DESPESA' },
      include: { obra: { select: { nome: true } } },
      orderBy: { dataVencimento: 'asc' },
    }),
    prisma.lancamentoFinanceiro.findMany({
      where: { ...where, tipo: 'RECEITA' },
      include: { obra: { select: { nome: true } } },
      orderBy: { dataVencimento: 'asc' },
    }),
    prisma.notaFiscal.findMany({ where: { obra: userObraScope, ...(obraId ? { obraId } : {}) }, orderBy: { dataEmissao: 'desc' } }),
  ]);

  const totalAPagar = aPagar
    .filter((l) => l.status === 'ABERTO' || l.status === 'VENCIDO')
    .reduce((s, l) => s + Number(l.valor), 0);
  const totalAReceber = aReceber
    .filter((l) => l.status === 'ABERTO')
    .reduce((s, l) => s + Number(l.valor), 0);
  const totalVencido = aPagar
    .filter((l) => l.status === 'VENCIDO')
    .reduce((s, l) => s + Number(l.valor), 0);

  return NextResponse.json({ aPagar, aReceber, nfs, totalAPagar, totalAReceber, totalVencido });
}

export async function POST(req: NextRequest) {
  const context = await requireSession();
  if (!context) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  if (!canAccessResource(context.role, 'financeiro', true))
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });

  const body = await req.json();
  const { tenantOwnsObra } = await import('@/lib/authorization');
  if (!(await tenantOwnsObra(body.obraId, context.tenantId, context.userId, context.role))) {
    return NextResponse.json({ error: 'Obra não encontrada' }, { status: 404 });
  }
  await assertTenantRelations(
    { obraId: body.obraId, fornecedorId: body.fornecedorId },
    context.tenantId
  );
  const lancamento = await prisma.lancamentoFinanceiro.create({
    data: {
      tipo: body.tipo,
      descricao: body.descricao,
      valor: parseFloat(body.valor),
      dataVencimento: new Date(body.vencimento || body.dataVencimento),
      status: body.status || 'ABERTO',
      obraId: body.obraId,
      categoria: body.categoria || null,
      fornecedorId: body.fornecedorId || null,
      nfNumero: body.nfNumero || null,
      createdBy: context.userId,
    },
  });

  return NextResponse.json(lancamento, { status: 201 });
}
