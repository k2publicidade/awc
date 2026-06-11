import prisma from "@/lib/prisma";
import { wrapReport, statusBadge, AWC_COLORS } from "./pdf-generator";

export async function generateRelatorioSeguranca(obraId: string): Promise<string> {
  const obra = await prisma.obra.findUnique({ where: { id: obraId }, select: { nome: true } });
  if (!obra) throw new Error("Obra não encontrada");

  const dds = await prisma.dDS.findMany({ where: { obraId }, orderBy: { data: "desc" } });
  const acidentes = await prisma.acidente.findMany({
    where: { obraId },
    orderBy: { dataHora: "desc" },
    include: { vitima: { select: { nome: true } } },
  });
  const ncsSeg = await prisma.naoConformidade.findMany({
    where: { obraId, severidade: { in: ["CRITICO", "ALTO"] }, status: { not: "ENCERRADA" } },
  });

  const horasTrabalhadas = dds.length * 8 * 20; // estimate
  const acidentesComAfast = acidentes.filter(a => (a as any).tipo === "COM_AFASTAMENTO").length;
  const freqRate = horasTrabalhadas > 0 ? (acidentesComAfast * 1000000 / horasTrabalhadas) : 0;

  const content = `
    <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:20px">
      <div class="metric-card"><div class="metric-label">DDS Realizados</div><div class="metric-value">${dds.length}</div></div>
      <div class="metric-card"><div class="metric-label">Acidentes</div><div class="metric-value" style="color:${acidentes.length > 0 ? AWC_COLORS.danger : AWC_COLORS.success}">${acidentes.length}</div></div>
      <div class="metric-card"><div class="metric-label">Taxa de Frequência</div><div class="metric-value">${freqRate.toFixed(2)}</div></div>
      <div class="metric-card"><div class="metric-label">NCs Segurança</div><div class="metric-value" style="color:${ncsSeg.length > 0 ? AWC_COLORS.danger : AWC_COLORS.success}">${ncsSeg.length}</div></div>
    </div>

    <h2>DDS — Diálogos Diários de Segurança</h2>
    <table>
      <thead><tr><th>Data</th><th>Tema</th><th>Participantes</th></tr></thead>
      <tbody>
        ${dds.map(d => `<tr><td>${d.data?.toLocaleDateString("pt-BR")}</td><td>${d.tema || "-"}</td><td>${d.participantes || "-"}</td></tr>`).join("")}
      </tbody>
    </table>

    ${acidentes.length > 0 ? `
    <h2>Acidentes e Incidentes</h2>
    <table>
      <thead><tr><th>Data</th><th>Tipo</th><th>Descrição</th><th>Vítima</th></tr></thead>
      <tbody>
        ${acidentes.map(a => `<tr><td>${a.dataHora?.toLocaleDateString("pt-BR")}</td><td>${statusBadge(a.tipo === "COM_AFASTAMENTO" ? AWC_COLORS.danger : AWC_COLORS.warning, a.tipo || "-")}</td><td>${a.descricao || "-"}</td><td>${a.vitima?.nome || "-"}</td></tr>`).join("")}
      </tbody>
    </table>` : "<p style='color:#22C55E;font-weight:600;margin:16px 0'>✅ Nenhum acidente registrado nesta obra</p>"}

    ${ncsSeg.length > 0 ? `
    <h2>NCs de Segurança Abertas</h2>
    <table>
      <thead><tr><th>Descrição</th><th>Severidade</th><th>Prazo</th></tr></thead>
      <tbody>${ncsSeg.map(nc => `<tr><td>${(nc as any).descricao}</td><td>${statusBadge(AWC_COLORS.danger, (nc as any).severidade)}</td><td>${(nc as any).prazo?.toLocaleDateString("pt-BR") || "-"}</td></tr>`).join("")}</tbody>
    </table>` : ""}
  `;

  return wrapReport(content, "Relatório de Segurança Mensal", obra.nome);
}
