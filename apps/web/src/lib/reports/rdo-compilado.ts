import prisma from "@/lib/prisma";
import { wrapReport, formatCurrency, statusBadge, AWC_COLORS } from "./pdf-generator";

export async function generateRDOCompilado(obraId: string, dataInicio: string, dataFim: string): Promise<string> {
  const rdos = await prisma.rDO.findMany({
    where: {
      obraId,
      data: { gte: new Date(dataInicio), lte: new Date(dataFim) },
    },
    orderBy: { data: "asc" },
    include: {
      efetivos: true, atividades: { include: { etapa: true } },
      equipamentos: true, ocorrenciasRdo: true,
      responsavel: { select: { name: true } },
    },
  });

  const obra = await prisma.obra.findUnique({ where: { id: obraId }, select: { nome: true } });

  let totalPresentes = 0;
  let totalAtividades = 0;
  let diasChuva = 0;

  const content = `
    <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:20px">
      <div class="metric-card"><div class="metric-label">Período</div><div class="metric-value" style="font-size:13px">${new Date(dataInicio).toLocaleDateString("pt-BR")} — ${new Date(dataFim).toLocaleDateString("pt-BR")}</div></div>
      <div class="metric-card"><div class="metric-label">Total RDOs</div><div class="metric-value">${rdos.length}</div></div>
      <div class="metric-card"><div class="metric-label">Dias de Chuva</div><div class="metric-value">${diasChuva}</div></div>
    </div>

    ${rdos.map(rdo => {
      const presentes = rdo.efetivos.reduce((s: number, e) => s + (e.quantidadePresente || 0), 0);
      totalPresentes += presentes;
      totalAtividades += rdo.atividades.length;
      if (rdo.climaManha === "CHUVOSO" || rdo.climaTarde === "CHUVOSO") diasChuva++;

      return `
      <div style="page-break-inside:avoid;margin-bottom:16px;border:1px solid #E5E7EB;border-radius:6px;padding:12px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <h3 style="font-size:12px;margin:0">📅 RDO Nº ${rdo.numero} — ${rdo.data?.toLocaleDateString("pt-BR")}</h3>
          <span style="font-size:10px;color:${AWC_COLORS.gray}">☀️ ${rdo.climaManha || "-"} / ${rdo.climaTarde || "-"}</span>
        </div>

        <p style="font-size:10px;margin-bottom:4px"><strong>Efetivo:</strong> ${presentes} trabalhadores | <strong>Responsável:</strong> ${rdo.responsavel?.name || rdo.assinaturaNome || "-"}${rdo.assinaturaCrea ? ` — CREA ${rdo.assinaturaCrea}` : ""}</p>

        ${rdo.atividades.length > 0 ? `
        <table style="margin:6px 0">
          <thead><tr><th>Atividade</th><th>Etapa</th><th>%</th></tr></thead>
          <tbody>${rdo.atividades.map(a => `<tr><td>${a.descricao}</td><td>${a.etapa?.nome || "-"}</td><td>${a.percentualExecutado || 0}%</td></tr>`).join("")}</tbody>
        </table>` : ""}

        ${rdo.equipamentos.length > 0 ? `
        <p style="font-size:10px;margin-top:4px"><strong>Equipamentos:</strong> ${rdo.equipamentos.map(e => `${e.equipamento} (${e.horasTrabalhadas}h)`).join(", ")}</p>` : ""}

        ${rdo.ocorrenciasRdo.length > 0 ? `<p style="font-size:10px;margin-top:4px;color:${AWC_COLORS.danger}"><strong>Ocorrências:</strong> ${rdo.ocorrenciasRdo.map(o => o.descricao).join("; ")}</p>` : ""}
      </div>`;
    }).join("")}

    <h2>Resumo do Período</h2>
    <table>
      <tr><td style="font-weight:600">Total de RDOs</td><td>${rdos.length}</td></tr>
      <tr><td style="font-weight:600">Dias de Chuva</td><td>${diasChuva}</td></tr>
      <tr><td style="font-weight:600">Total Atividades</td><td>${totalAtividades}</td></tr>
      <tr><td style="font-weight:600">Média Trabalhadores/Dia</td><td>${rdos.length > 0 ? (totalPresentes / rdos.length).toFixed(1) : 0}</td></tr>
    </table>
  `;

  return wrapReport(content, "Relatório de RDOs por Período", obra?.nome);
}
