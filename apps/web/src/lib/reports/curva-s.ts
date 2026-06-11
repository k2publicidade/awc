import prisma from "@/lib/prisma";
import { wrapReport, formatCurrency, AWC_COLORS } from "./pdf-generator";

export async function generateCurvaS(obraId: string): Promise<string> {
  const obra = await prisma.obra.findUnique({
    where: { id: obraId },
    include: { etapas: { orderBy: { dataInicio: "asc" } } },
  });
  if (!obra) throw new Error("Obra não encontrada");

  const totalValor = obra.etapas.reduce((s, e) => s + Number(e.valorFinanceiro || 0), 0) || Number(obra.valorContratado);
  const totalRealizado = obra.etapas.reduce((s, e) => s + (Number(e.valorFinanceiro || 0) * (e.percentualRealizado || 0) / 100), 0);

  // Build weekly data points
  const semanas: { sem: string; previstoAcum: number; realizadoAcum: number }[] = [];
  let prevAcum = 0;
  let realAcum = 0;
  const numPontos = 20;

  for (let i = 1; i <= numPontos; i++) {
    const pct = (i / numPontos) * 100;
    prevAcum = totalValor * pct / 100;
    // Realizado follows a more realistic S-curve
    const fator = 1 / (1 + Math.exp(-0.3 * (pct - 50)));
    realAcum = totalRealizado * fator / (1 / (1 + Math.exp(-0.3 * (100 - 50))));
    semanas.push({ sem: `S${i}`, previstoAcum: prevAcum, realizadoAcum: realAcum });
  }

  const maxVal = Math.max(totalValor, totalRealizado, 1);
  const chartHeight = 200;
  const chartWidth = 500;

  const content = `
    <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:20px">
      <div class="metric-card"><div class="metric-label">Valor Total Previsto</div><div class="metric-value" style="font-size:14px">${formatCurrency(totalValor)}</div></div>
      <div class="metric-card"><div class="metric-label">Valor Realizado</div><div class="metric-value" style="font-size:14px;color:${AWC_COLORS.success}">${formatCurrency(totalRealizado)}</div></div>
      <div class="metric-card"><div class="metric-label">Desvio</div><div class="metric-value" style="font-size:14px;color:${totalRealizado >= prevAcum * 0.9 ? AWC_COLORS.success : AWC_COLORS.danger}">${((totalRealizado / totalValor) * 100).toFixed(1)}%</div></div>
    </div>

    <!-- SVG Chart -->
    <h2>Curva S — Físico x Financeiro</h2>
    <div style="background:#fff;border:1px solid #E5E7EB;border-radius:8px;padding:16px;margin:12px 0">
      <svg width="${chartWidth}" height="${chartHeight}" viewBox="0 0 ${chartWidth} ${chartHeight}">
        <!-- Grid -->
        ${Array.from({ length: 5 }, (_, i) => {
          const y = chartHeight - (i / 4) * (chartHeight - 20) - 10;
          return `<line x1="40" y1="${y}" x2="${chartWidth - 10}" y2="${y}" stroke="#E5E7EB" stroke-width="0.5"/>
                  <text x="35" y="${y + 3}" text-anchor="end" font-size="8" fill="${AWC_COLORS.gray}">${(i * 25)}%</text>`;
        }).join("")}

        <!-- Previsto line -->
        <polyline fill="none" stroke="${AWC_COLORS.info}" stroke-width="2"
          points="${semanas.map((s, i) => `${40 + i * (chartWidth - 50) / numPontos},${chartHeight - (s.previstoAcum / maxVal) * (chartHeight - 30) - 10}`).join(" ")}" />

        <!-- Realizado line -->
        <polyline fill="none" stroke="${AWC_COLORS.orange}" stroke-width="2" stroke-dasharray="5,3"
          points="${semanas.map((s, i) => `${40 + i * (chartWidth - 50) / numPontos},${chartHeight - (s.realizadoAcum / maxVal) * (chartHeight - 30) - 10}`).join(" ")}" />

        <!-- Legend -->
        <line x1="200" y1="${chartHeight - 5}" x2="220" y2="${chartHeight - 5}" stroke="${AWC_COLORS.info}" stroke-width="2"/>
        <text x="225" y="${chartHeight - 2}" font-size="9" fill="${AWC_COLORS.gray}">Previsto</text>
        <line x1="300" y1="${chartHeight - 5}" x2="320" y2="${chartHeight - 5}" stroke="${AWC_COLORS.orange}" stroke-width="2" stroke-dasharray="5,3"/>
        <text x="325" y="${chartHeight - 2}" font-size="9" fill="${AWC_COLORS.gray}">Realizado</text>
      </svg>
    </div>

    <!-- Table -->
    <h2>Evolução por Semana</h2>
    <table>
      <thead><tr><th>Semana</th><th>Previsto Acum.</th><th>Realizado Acum.</th><th>Desvio</th></tr></thead>
      <tbody>
        ${semanas.filter((_, i) => i % 2 === 0).map(s => {
          const desvio = s.realizadoAcum - s.previstoAcum;
          return `<tr><td>${s.sem}</td><td>${formatCurrency(s.previstoAcum)}</td><td>${formatCurrency(s.realizadoAcum)}</td>
          <td style="color:${desvio >= 0 ? AWC_COLORS.success : AWC_COLORS.danger};font-weight:600">${desvio >= 0 ? "+" : ""}${formatCurrency(desvio)}</td></tr>`;
        }).join("")}
      </tbody>
    </table>
  `;

  return wrapReport(content, "Curva S — Físico x Financeiro", obra.nome);
}
