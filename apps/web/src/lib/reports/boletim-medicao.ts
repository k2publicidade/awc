import prisma from "@/lib/prisma";
import { wrapReport, formatCurrency, statusBadge, AWC_COLORS } from "./pdf-generator";

export async function generateBoletimMedicao(medicaoId: string): Promise<string> {
  const medicao = await prisma.medicao.findUnique({
    where: { id: medicaoId },
    include: {
      obra: { select: { nome: true, codigo: true, valorContratado: true } },
      itens: { include: { etapa: true } },
    },
  });

  if (!medicao) throw new Error("Medição não encontrada");

  const content = `
    <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:20px">
      <div class="metric-card"><div class="metric-label">Obra</div><div class="metric-value" style="font-size:14px">${medicao.obra?.nome}</div></div>
      <div class="metric-card"><div class="metric-label">Período</div><div class="metric-value" style="font-size:12px">${medicao.periodoInicio?.toLocaleDateString("pt-BR")} — ${medicao.periodoFim?.toLocaleDateString("pt-BR")}</div></div>
      <div class="metric-card"><div class="metric-label">Valor Total</div><div class="metric-value">${formatCurrency(medicao.valorTotal)}</div></div>
      <div class="metric-card"><div class="metric-label">Status</div><div class="metric-value">${statusBadge(medicao.status.startsWith("APROVADA") ? AWC_COLORS.success : AWC_COLORS.warning, medicao.status)}</div></div>
    </div>

    <h2>Itens Medidos</h2>
    <table>
      <thead><tr><th>Etapa</th><th>% Medido</th><th>Valor Medido</th><th>Observação</th></tr></thead>
      <tbody>
        ${(medicao.itens || []).map(i => `<tr>
          <td>${i.etapa?.nome || "-"}</td>
          <td>${(i.percentualMedido || 0).toFixed(1)}%</td>
          <td style="font-weight:600">${formatCurrency(i.valorMedido)}</td>
          <td>${i.observacao || "-"}</td>
        </tr>`).join("")}
        <tr style="background:${AWC_COLORS.dark};color:#fff">
          <td colspan="2" style="text-align:right;font-weight:700;color:#fff">TOTAL</td>
          <td colspan="2" style="font-weight:700;color:${AWC_COLORS.orange}">${formatCurrency(medicao.valorTotal)}</td>
        </tr>
      </tbody>
    </table>

    <div style="margin-top:40px;display:flex;justify-content:space-between">
      <div style="text-align:center;width:45%">
        <div style="border-top:1px solid #000;padding-top:8px;margin-top:40px">
          <p style="font-size:10px;font-weight:600">Engenheiro Responsável</p>
          <p style="font-size:9px;color:${AWC_COLORS.gray}">CREA: ______________</p>
        </div>
      </div>
      <div style="text-align:center;width:45%">
        <div style="border-top:1px solid #000;padding-top:8px;margin-top:40px">
          <p style="font-size:10px;font-weight:600">Cliente</p>
          <p style="font-size:9px;color:${AWC_COLORS.gray}">Data: ___/___/___</p>
        </div>
      </div>
    </div>

    <div style="margin-top:24px;text-align:center">
      <p style="font-size:8px;color:${AWC_COLORS.gray}">Este boletim pode ser verificado via QR Code no sistema ObrasAWC</p>
    </div>
  `;

  return wrapReport(content, "Boletim de Medição", medicao.obra?.nome);
}
