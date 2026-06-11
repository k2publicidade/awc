import prisma from "@/lib/prisma";
import { wrapReport, formatCurrency, statusBadge, AWC_COLORS } from "./pdf-generator";

export async function generateRelatorioQualidade(obraId: string): Promise<string> {
  const obra = await prisma.obra.findUnique({ where: { id: obraId }, select: { nome: true } });
  if (!obra) throw new Error("Obra não encontrada");

  const inspecoes = await prisma.inspecao.findMany({
    where: { obraId },
    include: { itens: true, etapa: true, responsavel: { select: { name: true } } },
    orderBy: { data: "desc" },
  });

  const ncs = await prisma.naoConformidade.findMany({
    where: { obraId },
    orderBy: { createdAt: "desc" },
  });

  const totalItens = inspecoes.reduce((s, i) => s + (i.itens?.length || 0), 0);
  const itensConformes = inspecoes.reduce((s, i) => s + (i.itens?.filter((it: any) => it.resultado === "CONFORME").length || 0), 0);
  const ncsAbertas = ncs.filter(n => n.status === "ABERTA").length;
  const ncsResolvidas = ncs.filter(n => n.status === "ENCERRADA").length;
  const indiceNC = totalItens > 0 ? ((totalItens - itensConformes) / totalItens * 100) : 0;

  const content = `
    <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:20px">
      <div class="metric-card"><div class="metric-label">Inspeções</div><div class="metric-value">${inspecoes.length}</div></div>
      <div class="metric-card"><div class="metric-label">Itens Verificados</div><div class="metric-value">${totalItens}</div></div>
      <div class="metric-card"><div class="metric-label">Índice Conformidade</div><div class="metric-value" style="color:${indiceNC < 10 ? AWC_COLORS.success : AWC_COLORS.danger}">${(100 - indiceNC).toFixed(1)}%</div></div>
      <div class="metric-card"><div class="metric-label">NCs Abertas</div><div class="metric-value" style="color:${ncsAbertas > 0 ? AWC_COLORS.danger : AWC_COLORS.success}">${ncsAbertas}</div></div>
      <div class="metric-card"><div class="metric-label">NCs Resolvidas</div><div class="metric-value">${ncsResolvidas}</div></div>
    </div>

    <h2>Inspecões Realizadas</h2>
    <table>
      <thead><tr><th>Data</th><th>Etapa</th><th>Responsável</th><th>Itens</th><th>Conformes</th><th>Resultado</th></tr></thead>
      <tbody>
        ${inspecoes.map(i => {
          const conformes = i.itens?.filter((it: any) => it.resultado === "CONFORME").length || 0;
          const total = i.itens?.length || 0;
          const resultado = conformes === total ? "APROVADA" : "REPROVADA";
          return `<tr><td>${i.data?.toLocaleDateString("pt-BR")}</td><td>${i.etapa?.nome || "-"}</td><td>${i.responsavel?.name || "-"}</td><td>${total}</td><td>${conformes}</td><td>${statusBadge(resultado === "APROVADA" ? AWC_COLORS.success : AWC_COLORS.danger, resultado)}</td></tr>`;
        }).join("")}
      </tbody>
    </table>

    ${ncs.length > 0 ? `
    <h2>Não Conformidades</h2>
    <table>
      <thead><tr><th>Descrição</th><th>Severidade</th><th>Causa Raiz</th><th>Status</th><th>Prazo</th></tr></thead>
      <tbody>
        ${ncs.map(nc => `<tr>
          <td>${(nc as any).descricao || "-"}</td>
          <td>${statusBadge((nc as any).severidade === "CRITICO" ? AWC_COLORS.danger : (nc as any).severidade === "ALTO" ? AWC_COLORS.warning : AWC_COLORS.info, (nc as any).severidade || "-")}</td>
          <td>${(nc as any).causaRaiz || "-"}</td>
          <td>${statusBadge(nc.status === "ENCERRADA" ? AWC_COLORS.success : nc.status === "EM_EXECUCAO" ? AWC_COLORS.warning : AWC_COLORS.danger, nc.status)}</td>
          <td>${(nc as any).prazo?.toLocaleDateString("pt-BR") || "-"}</td>
        </tr>`).join("")}
      </tbody>
    </table>` : ""}
  `;

  return wrapReport(content, "Relatório de Qualidade", obra.nome);
}
