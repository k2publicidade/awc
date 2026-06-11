import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

/**
 * GET /api/relatorios/excel?type=orcamento&obraId=xxx
 * Generates CSV/Excel-compatible data for export.
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") || "orcamento";
  const obraId = searchParams.get("obraId") || "";

  if (type === "orcamento") {
    const orcamento = await prisma.orcamento.findFirst({
      where: { obraId, status: "APROVADO" },
      include: { itens: { include: { etapa: true }, orderBy: { createdAt: "asc" } } },
    });

    if (!orcamento) return NextResponse.json({ error: "Orçamento não encontrado" }, { status: 404 });

    // Generate CSV (SINAPI-compatible format)
    const headers = ["Código SINAPI", "Descrição", "Unidade", "Quantidade", "Preço Unitário", "Preço Total", "Etapa", "BDI %"];
    const rows = orcamento.itens.map((item: any) => [
      item.codigoSinapi || "",
      `"${item.descricao || ""}"`,
      item.unidade || "",
      item.quantidade || 0,
      (item.precoUnitario || 0).toFixed(2),
      (item.precoTotal || 0).toFixed(2),
      `"${item.etapa?.nome || ""}"`,
      orcamento.bdi || 0,
    ]);

    const csv = [headers.join(";"), ...rows.map(r => r.join(";"))].join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="orcamento-${obraId}.csv"`,
      },
    });
  }

  if (type === "financeiro") {
    const lancamentos = await prisma.lancamentoFinanceiro.findMany({
      where: { obraId },
      orderBy: { dataVencimento: "asc" },
    });

    const headers = ["Data", "Tipo", "Categoria", "Descrição", "Valor", "Fornecedor", "Status"];
    const rows = lancamentos.map((l: any) => [
      l.dataVencimento?.toLocaleDateString("pt-BR") || "",
      l.tipo || "",
      l.categoria || "",
      `"${l.descricao || ""}"`,
      l.valor?.toFixed(2) || "0.00",
      l.fornecedor || "",
      l.status || "",
    ]);

    const csv = [headers.join(";"), ...rows.map(r => r.join(";"))].join("\n");

    // Format compatible with Omie / Conta Azul
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="financeiro-${obraId}.csv"`,
      },
    });
  }

  if (type === "materiais") {
    const movimentos = await prisma.estoqueMovimento.findMany({
      where: { obraId },
      include: { material: true },
      orderBy: { data: "asc" },
    });

    const headers = ["Data", "Tipo", "Material", "Quantidade", "Unidade", "Fornecedor", "Observação"];
    const rows = movimentos.map((m: any) => [
      m.data?.toLocaleDateString("pt-BR") || "",
      m.tipo || "",
      `"${m.material?.descricao || ""}"`,
      m.quantidade || 0,
      m.material?.unidade || "",
      m.fornecedor || "",
      `"${m.observacao || ""}"`,
    ]);

    const csv = [headers.join(";"), ...rows.map(r => r.join(";"))].join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="materiais-${obraId}.csv"`,
      },
    });
  }

  return NextResponse.json({ error: "Tipo de exportação inválido" }, { status: 400 });
}
