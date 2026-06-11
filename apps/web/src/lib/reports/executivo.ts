import prisma from "@/lib/prisma";
import { wrapReport, formatCurrency, progressBar, statusBadge, AWC_COLORS } from "./pdf-generator";

export async function generateRelatorioExecutivo(obraId: string): Promise<string> {
  const obra = await prisma.obra.findUnique({
    where: { id: obraId },
    include: {
      etapas: { orderBy: { dataInicio: "asc" } },
      rdos: { orderBy: { data: "desc" }, take: 30 },
      lancamentos: true,
      orcamentos: { where: { status: "APROVADO" }, take: 1 },
      documentos: true,
      ocorrencias: { where: { status: "ABERTO" } },
      medicoes: { orderBy: { createdAt: "desc" }, take: 5 },
    },
  });

  if (!obra) throw new Error("Obra não encontrada");

  const orcamento = obra.orcamentos[0];
  const despesas = obra.lancamentos?.filter(l => l.tipo === "DESPESA").reduce((s, l) => s + Number(l.valor), 0) || 0;
  const receitas = obra.lancamentos?.filter(l => l.tipo === "RECEITA").reduce((s, l) => s + Number(l.valor), 0) || 0;
  const avgAvanco = obra.etapas.length > 0 ? obra.etapas.reduce((s, e) => s + (e.percentualRealizado || 0), 0) / obra.etapas.length : 0;
  const etapasAtrasadas = obra.etapas.filter(e => e.dataFim && e.dataFim < new Date() && (e.percentualRealizado || 0) < 100).length;
  const ncsAbertas = obra.ocorrencias?.length || 0;

  const statusColor = obra.status === "EM_ANDAMENTO" ? AWC_COLORS.info : obra.status === "CONCLUIDO" ? AWC_COLORS.success : obra.status === "PAUSADO" ? AWC_COLORS.danger : AWC_COLORS.gray;

  const content = `
    <!-- Summary Metrics -->
    <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:20px">
      <div class="metric-card"><div class="metric-label">Status</div><div class="metric-value">${statusBadge(statusColor, obra.status.replace(/_/g, " "))}</div></div>
      <div class="metric-card"><div class="metric-label">Avanço Físico</div><div class="metric-value">${avgAvanco.toFixed(1)}%</div></div>
      <div class="metric-card"><div class="metric-label">Valor Contratado</div><div class="metric-value" style="font-size:14px">${formatCurrency(obra.valorContratado)}</div></div>
      <div class="metric-card"><div class="metric-label">Despesas</div><div class="metric-value" style="font-size:14px;color:${AWC_COLORS.danger}">${formatCurrency(despesas)}</div></div>
      <div class="metric-card"><div class="metric-label">Receitas</div><div class="metric-value" style="font-size:14px;color:${AWC_COLORS.success}">${formatCurrency(receitas)}</div></div>
      <div class="metric-card"><div class="metric-label">Margem</div><div class="metric-value" style="font-size:14px;color:${receitas - despesas >= 0 ? AWC_COLORS.success : AWC_COLORS.danger}">${formatCurrency(receitas - despesas)}</div></div>
    </div>

    <!-- General Info -->
    <h2>Informações Gerais</h2>
    <table>
      <tr><td style="width:30%;font-weight:600">Código</td><td>${obra.codigo}</td></tr>
      <tr><td style="font-weight:600">Tipo</td><td>${obra.tipo}</td></tr>
      <tr><td style="font-weight:600">Endereço</td><td>${obra.endereco || "-"}</td></tr>
      <tr><td style="font-weight:600">Início Previsto</td><td>${obra.dataInicio?.toLocaleDateString("pt-BR") || "-"}</td></tr>
      <tr><td style="font-weight:600">Fim Previsto</td><td>${obra.dataPrevisaoFim?.toLocaleDateString("pt-BR") || "-"}</td></tr>
      <tr><td style="font-weight:600">Etapas Atrasadas</td><td>${statusBadge(etapasAtrasadas > 0 ? AWC_COLORS.danger : AWC_COLORS.success, `${etapasAtrasadas} atrasada(s)`)}</td></tr>
      <tr><td style="font-weight:600">Ocorrências Abertas</td><td>${statusBadge(ncsAbertas > 0 ? AWC_COLORS.warning : AWC_COLORS.success, `${ncsAbertas} aberta(s)`)}</td></tr>
    </table>

    <!-- Etapas -->
    <h2>Etapas do Cronograma</h2>
    <table>
      <thead><tr><th>Etapa</th><th>Início</th><th>Fim</th><th>Prev.</th><th>Real.</th><th>Progresso</th></tr></thead>
      <tbody>
        ${obra.etapas.map(e => {
          const status = (e.percentualRealizado || 0) >= 100 ? "CONCLUIDA" : e.dataFim && e.dataFim < new Date() ? "ATRASADA" : "EM_ANDAMENTO";
          const rowColor = status === "ATRASADA" ? `background:#FEF2F2;` : status === "CONCLUIDA" ? `background:#F0FDF4;` : "";
          return `<tr style="${rowColor}"><td>${e.nome}</td><td>${e.dataInicio?.toLocaleDateString("pt-BR") || "-"}</td><td>${e.dataFim?.toLocaleDateString("pt-BR") || "-"}</td><td>${(e.percentualPrevisto || 0).toFixed(0)}%</td><td>${(e.percentualRealizado || 0).toFixed(0)}%</td><td>${progressBar(e.percentualRealizado || 0, 100)}</td></tr>`;
        }).join("")}
      </tbody>
    </table>

    <!-- Orçamento -->
    ${orcamento ? `
    <h2>Orçamento</h2>
    <table>
      <tr><td style="font-weight:600">Valor Total</td><td>${formatCurrency(orcamento.valorTotal)}</td></tr>
      <tr><td style="font-weight:600">Gasto Real</td><td>${formatCurrency(despesas)}</td></tr>
      <tr><td style="font-weight:600">Comprometido</td><td>${(despesas / Number(orcamento.valorTotal) * 100).toFixed(1)}%</td></tr>
      <tr><td style="font-weight:600">Saldo</td><td style="color:${Number(orcamento.valorTotal) - despesas >= 0 ? AWC_COLORS.success : AWC_COLORS.danger}">${formatCurrency(Number(orcamento.valorTotal) - despesas)}</td></tr>
    </table>` : ""}

    <!-- Últimos RDOs -->
    <h2>Últimos RDOs</h2>
    <table>
      <thead><tr><th>Data</th><th>Clima</th><th>Responsável</th><th>Atividades</th></tr></thead>
      <tbody>
        ${obra.rdos.map(r => `<tr><td>${r.data?.toLocaleDateString("pt-BR")}</td><td>${r.climaManha || "-"}</td><td>${r.assinaturaNome || "-"}</td><td>${(r as any).atividades?.length || 0}</td></tr>`).join("")}
      </tbody>
    </table>

    <!-- Medições -->
    ${obra.medicoes.length > 0 ? `
    <h2>Últimas Medições</h2>
    <table>
      <thead><tr><th>Período</th><th>Valor</th><th>Status</th></tr></thead>
      <tbody>
        ${obra.medicoes.map(m => `<tr><td>${m.periodoInicio?.toLocaleDateString("pt-BR")} — ${m.periodoFim?.toLocaleDateString("pt-BR")}</td><td>${formatCurrency(m.valorTotal)}</td><td>${statusBadge(m.status.startsWith("APROVADA") ? AWC_COLORS.success : AWC_COLORS.warning, m.status)}</td></tr>`).join("")}
      </tbody>
    </table>` : ""}
  `;

  return wrapReport(content, "Relatório Executivo da Obra", obra.nome);
}
