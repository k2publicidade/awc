import prisma from "@/lib/prisma";
import { wrapReport, formatCurrency, AWC_COLORS } from "./pdf-generator";

export async function generateRelatorioFinanceiro(obraId: string): Promise<string> {
  const obra = await prisma.obra.findUnique({
    where: { id: obraId },
    include: {
      lancamentos: { orderBy: { dataVencimento: "asc" } },
      orcamentos: { where: { status: "APROVADO" }, take: 1 },
    },
  });
  if (!obra) throw new Error("Obra não encontrada");

  const orc = obra.orcamentos[0];
  const despesas = obra.lancamentos?.filter(l => l.tipo === "DESPESA") || [];
  const receitas = obra.lancamentos?.filter(l => l.tipo === "RECEITA") || [];
  const totalDespesas = despesas.reduce((s, l) => s + Number(l.valor), 0);
  const totalReceitas = receitas.reduce((s, l) => s + Number(l.valor), 0);

  // Group by month
  const byMonth: Record<string, { receitas: number; despesas: number }> = {};
  for (const l of obra.lancamentos || []) {
    const key = l.dataVencimento?.toISOString().substring(0, 7) || "N/A";
    if (!byMonth[key]) byMonth[key] = { receitas: 0, despesas: 0 };
    if (l.tipo === "DESPESA") byMonth[key].despesas += Number(l.valor);
    else byMonth[key].receitas += Number(l.valor);
  }

  // Category breakdown
  const byCategory: Record<string, number> = {};
  for (const d of despesas) {
    const cat = d.categoria || "Outros";
    byCategory[cat] = (byCategory[cat] || 0) + Number(d.valor);
  }

  const content = `
    <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:20px">
      <div class="metric-card"><div class="metric-label">Valor Contratado</div><div class="metric-value" style="font-size:14px">${formatCurrency(obra.valorContratado)}</div></div>
      <div class="metric-card"><div class="metric-label">Receitas</div><div class="metric-value" style="font-size:14px;color:${AWC_COLORS.success}">${formatCurrency(totalReceitas)}</div></div>
      <div class="metric-card"><div class="metric-label">Despesas</div><div class="metric-value" style="font-size:14px;color:${AWC_COLORS.danger}">${formatCurrency(totalDespesas)}</div></div>
      <div class="metric-card"><div class="metric-label">Resultado</div><div class="metric-value" style="font-size:14px;color:${totalReceitas - totalDespesas >= 0 ? AWC_COLORS.success : AWC_COLORS.danger}">${formatCurrency(totalReceitas - totalDespesas)}</div></div>
    </div>

    <!-- DRE Simplificado -->
    <h2>DRE — Demonstrativo de Resultado</h2>
    <table>
      <thead><tr><th>Item</th><th style="text-align:right">Valor</th></tr></thead>
      <tbody>
        <tr><td style="font-weight:600">Receita Bruta</td><td style="text-align:right">${formatCurrency(totalReceitas)}</td></tr>
        ${Object.entries(byCategory).sort((a, b) => b[1] - a[1]).map(([cat, val]) => `<tr><td style="padding-left:24px">${cat}</td><td style="text-align:right;color:${AWC_COLORS.danger}">- ${formatCurrency(val)}</td></tr>`).join("")}
        <tr style="background:${AWC_COLORS.dark}"><td style="font-weight:700;color:#fff">Resultado Líquido</td><td style="text-align:right;font-weight:700;color:${totalReceitas - totalDespesas >= 0 ? AWC_COLORS.success : AWC_COLORS.danger}">${formatCurrency(totalReceitas - totalDespesas)}</td></tr>
      </tbody>
    </table>

    <!-- Fluxo de Caixa Mensal -->
    <h2>Fluxo de Caixa Mensal</h2>
    <table>
      <thead><tr><th>Mês</th><th style="text-align:right">Receitas</th><th style="text-align:right">Despesas</th><th style="text-align:right">Saldo</th></tr></thead>
      <tbody>
        ${Object.entries(byMonth).sort().map(([mes, vals]) => `<tr><td>${mes}</td><td style="text-align:right;color:${AWC_COLORS.success}">${formatCurrency(vals.receitas)}</td><td style="text-align:right;color:${AWC_COLORS.danger}">${formatCurrency(vals.despesas)}</td><td style="text-align:right;font-weight:600;color:${vals.receitas - vals.despesas >= 0 ? AWC_COLORS.success : AWC_COLORS.danger}">${formatCurrency(vals.receitas - vals.despesas)}</td></tr>`).join("")}
      </tbody>
    </table>

    <!-- Custo por Categoria -->
    <h2>Custos por Categoria</h2>
    <table>
      <thead><tr><th>Categoria</th><th style="text-align:right">Valor</th><th style="text-align:right">% do Total</th></tr></thead>
      <tbody>
        ${Object.entries(byCategory).sort((a, b) => b[1] - a[1]).map(([cat, val]) => `<tr><td>${cat}</td><td style="text-align:right">${formatCurrency(val)}</td><td style="text-align:right">${totalDespesas > 0 ? (val / totalDespesas * 100).toFixed(1) : 0}%</td></tr>`).join("")}
      </tbody>
    </table>

    ${orc ? `
    <!-- Orçado x Realizado -->
    <h2>Orçado x Realizado</h2>
    <table>
      <tr><td style="font-weight:600">Orçamento Aprovado</td><td>${formatCurrency(orc.valorTotal)}</td></tr>
      <tr><td style="font-weight:600">Gasto Real</td><td>${formatCurrency(totalDespesas)}</td></tr>
      <tr><td style="font-weight:600">Comprometido</td><td>${(totalDespesas / Number(orc.valorTotal) * 100).toFixed(1)}%</td></tr>
      <tr><td style="font-weight:600">Saldo Orçamentário</td><td style="color:${Number(orc.valorTotal) - totalDespesas >= 0 ? AWC_COLORS.success : AWC_COLORS.danger}">${formatCurrency(Number(orc.valorTotal) - totalDespesas)}</td></tr>
    </table>` : ""}
  `;

  return wrapReport(content, "Relatório Financeiro", obra.nome);
}
