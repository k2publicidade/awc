import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireSession } from '@/lib/session-context';
import { canAccessResource, tenantOwnsObra } from '@/lib/authorization';

/**
 * GET /api/relatorios/excel?type=orcamento&obraId=xxx
 * Generates CSV/Excel-compatible data for export.
 */
export async function GET(req: NextRequest) {
  const context = await requireSession();
  if (!context) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type') || 'orcamento';
  const obraId = searchParams.get('obraId') || '';
  const resourceByType: Record<string, string> = {
    orcamento: 'orcamentos',
    financeiro: 'financeiro',
    materiais: 'estoqueMovimentos',
  };
  const resource = resourceByType[type];
  if (!resource || !canAccessResource(context.role, resource))
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
  if (!(await tenantOwnsObra(obraId, context.tenantId)))
    return NextResponse.json({ error: 'Obra não encontrada' }, { status: 404 });

  if (type === 'orcamento') {
    const orcamento = await prisma.orcamento.findFirst({
      where: { obraId, status: 'APROVADO' },
      include: { itens: { include: { etapa: true }, orderBy: { createdAt: 'asc' } } },
    });

    if (!orcamento)
      return NextResponse.json({ error: 'Orçamento não encontrado' }, { status: 404 });

    // Generate CSV (SINAPI-compatible format)
    const headers = [
      'Código SINAPI',
      'Descrição',
      'Unidade',
      'Quantidade',
      'Preço Unitário',
      'Preço Total',
      'Etapa',
      'BDI %',
    ];
    const rows = orcamento.itens.map((item: DynamicValue) => [
      item.codigoSinapi || '',
      `"${item.descricao || ''}"`,
      item.unidade || '',
      item.quantidade || 0,
      (item.precoUnitario || 0).toFixed(2),
      (item.precoTotal || 0).toFixed(2),
      `"${item.etapa?.nome || ''}"`,
      orcamento.bdi || 0,
    ]);

    const csv = [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="orcamento-${obraId}.csv"`,
      },
    });
  }

  if (type === 'financeiro') {
    const lancamentos = await prisma.lancamentoFinanceiro.findMany({
      where: { obraId },
      orderBy: { dataVencimento: 'asc' },
    });

    const headers = ['Data', 'Tipo', 'Categoria', 'Descrição', 'Valor', 'Fornecedor', 'Status'];
    const rows = lancamentos.map((l: DynamicValue) => [
      l.dataVencimento?.toLocaleDateString('pt-BR') || '',
      l.tipo || '',
      l.categoria || '',
      `"${l.descricao || ''}"`,
      l.valor?.toFixed(2) || '0.00',
      l.fornecedor || '',
      l.status || '',
    ]);

    const csv = [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');

    // Format compatible with Omie / Conta Azul
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="financeiro-${obraId}.csv"`,
      },
    });
  }

  if (type === 'materiais') {
    const movimentos = await prisma.estoqueMovimento.findMany({
      where: { obraId },
      include: { material: true },
      orderBy: { data: 'asc' },
    });

    const headers = [
      'Data',
      'Tipo',
      'Material',
      'Quantidade',
      'Unidade',
      'Fornecedor',
      'Observação',
    ];
    const rows = movimentos.map((m: DynamicValue) => [
      m.data?.toLocaleDateString('pt-BR') || '',
      m.tipo || '',
      `"${m.material?.descricao || ''}"`,
      m.quantidade || 0,
      m.material?.unidade || '',
      m.fornecedor || '',
      `"${m.observacao || ''}"`,
    ]);

    const csv = [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="materiais-${obraId}.csv"`,
      },
    });
  }

  return NextResponse.json({ error: 'Tipo de exportação inválido' }, { status: 400 });
}
