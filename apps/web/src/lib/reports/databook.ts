import prisma from "@/lib/prisma";
import { wrapReport, formatCurrency, statusBadge, progressBar, AWC_COLORS } from "./pdf-generator";

export async function generateDatabook(obraId: string): Promise<string> {
  const obra = await prisma.obra.findUnique({
    where: { id: obraId },
    include: {
      etapas: { orderBy: { dataInicio: "asc" } },
      documentos: { orderBy: { categoria: "asc" } },
      rdos: { orderBy: { data: "desc" }, take: 60 },
      lancamentos: true,
      orcamentos: { where: { status: "APROVADO" }, take: 1 },
      medicoes: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!obra) throw new Error("Obra não encontrada");

  const despesas = obra.lancamentos?.filter(l => l.tipo === "DESPESA").reduce((s, l) => s + Number(l.valor), 0) || 0;
  const receitas = obra.lancamentos?.filter(l => l.tipo === "RECEITA").reduce((s, l) => s + Number(l.valor), 0) || 0;
  const docsByCategory: Record<string, any[]> = {};
  for (const d of obra.documentos || []) {
    const cat = d.categoria || "OUTROS";
    if (!docsByCategory[cat]) docsByCategory[cat] = [];
    docsByCategory[cat].push(d);
  }

  const content = `
    <!-- Cover Page -->
    <div style="text-align:center;padding:60px 0 40px 0;page-break-after:always">
      <div style="background:${AWC_COLORS.dark};display:inline-block;padding:16px 32px;border-radius:8px;margin-bottom:24px">
        <span style="color:${AWC_COLORS.orange};font-size:36px;font-weight:800">AWC</span>
        <span style="color:#fff;font-size:14px;display:block">Pré Moldados</span>
      </div>
      <h1 style="color:${AWC_COLORS.dark};font-size:28px;font-weight:800;margin-top:24px">DATABOOK</h1>
      <h2 style="color:${AWC_COLORS.orange};font-size:20px;font-weight:700;margin:8px 0">${obra.nome}</h2>
      <p style="color:${AWC_COLORS.gray};font-size:13px;margin-top:16px">Código: ${obra.codigo}</p>
      <p style="color:${AWC_COLORS.gray};font-size:12px">Tipo: ${obra.tipo} | ${obra.endereco || ""}</p>
      <p style="color:${AWC_COLORS.gray};font-size:11px;margin-top:24px">Gerado em: ${new Date().toLocaleDateString("pt-BR")}</p>
    </div>

    <!-- Table of Contents -->
    <h2>Índice</h2>
    <table style="border:none">
      <tr><td style="border:none;padding:4px 0">1. Informações Gerais</td></tr>
      <tr><td style="border:none;padding:4px 0">2. Etapas e Cronograma</td></tr>
      <tr><td style="border:none;padding:4px 0">3. Documentos Técnicos</td></tr>
      <tr><td style="border:none;padding:4px 0">4. RDOs — Relatórios Diários</td></tr>
      <tr><td style="border:none;padding:4px 0">5. Resumo Financeiro</td></tr>
      <tr><td style="border:none;padding:4px 0">6. Medições</td></tr>
      <tr><td style="border:none;padding:4px 0">7. As-Built</td></tr>
    </table>

    <!-- 1. General Info -->
    <div style="page-break-before:always">
    <h2>1. Informações Gerais</h2>
    <table>
      <tr><td style="width:35%;font-weight:600">Código</td><td>${obra.codigo}</td></tr>
      <tr><td style="font-weight:600">Tipo</td><td>${obra.tipo}</td></tr>
      <tr><td style="font-weight:600">Endereço</td><td>${obra.endereco || "-"}</td></tr>
      <tr><td style="font-weight:600">Valor Contratado</td><td>${formatCurrency(obra.valorContratado)}</td></tr>
      <tr><td style="font-weight:600">Início</td><td>${obra.dataInicio?.toLocaleDateString("pt-BR") || "-"}</td></tr>
      <tr><td style="font-weight:600">Conclusão Prevista</td><td>${obra.dataPrevisaoFim?.toLocaleDateString("pt-BR") || "-"}</td></tr>
      <tr><td style="font-weight:600">Status</td><td>${obra.status}</td></tr>
    </table>
    </div>

    <!-- 2. Etapas -->
    <div style="page-break-before:always">
    <h2>2. Etapas e Cronograma</h2>
    <table>
      <thead><tr><th>Etapa</th><th>Início</th><th>Fim</th><th>Progresso</th><th>Status</th></tr></thead>
      <tbody>${obra.etapas.map(e => {
        const s = (e.percentualRealizado || 0) >= 100 ? "CONCLUIDA" : e.dataFim && e.dataFim < new Date() && (e.percentualRealizado || 0) < 100 ? "ATRASADA" : "EM_ANDAMENTO";
        return `<tr><td>${e.nome}</td><td>${e.dataInicio?.toLocaleDateString("pt-BR") || "-"}</td><td>${e.dataFim?.toLocaleDateString("pt-BR") || "-"}</td><td>${progressBar(e.percentualRealizado || 0, 80)}</td><td>${statusBadge(s === "CONCLUIDA" ? AWC_COLORS.success : s === "ATRASADA" ? AWC_COLORS.danger : AWC_COLORS.info, s)}</td></tr>`;
      }).join("")}</tbody>
    </table>
    </div>

    <!-- 3. Documentos -->
    <div style="page-break-before:always">
    <h2>3. Documentos Técnicos</h2>
    ${Object.entries(docsByCategory).map(([cat, docs]) => `
      <h3 style="font-size:11px;margin:12px 0 6px">${cat}</h3>
      <table>
        <thead><tr><th>Documento</th><th>Número</th><th>Status</th><th>Validade</th></tr></thead>
        <tbody>${docs.map(d => `<tr><td>${d.nome}</td><td>${(d as any).numero || "-"}</td><td>${statusBadge(d.status === "APROVADO" ? AWC_COLORS.success : d.status === "VENCIDO" ? AWC_COLORS.danger : AWC_COLORS.warning, d.status)}</td><td>${d.validade?.toLocaleDateString("pt-BR") || "-"}</td></tr>`).join("")}</tbody>
      </table>
    `).join("")}
    </div>

    <!-- 4. RDOs -->
    <div style="page-break-before:always">
    <h2>4. RDOs — Relatórios Diários (${obra.rdos.length} registros)</h2>
    <table>
      <thead><tr><th>Data</th><th>Clima</th><th>Responsável</th></tr></thead>
      <tbody>${obra.rdos.map(r => `<tr><td>${r.data?.toLocaleDateString("pt-BR")}</td><td>${(r as any).climaManha || "-"}</td><td>${(r as any).responsavelNome || "-"}</td></tr>`).join("")}</tbody>
    </table>
    </div>

    <!-- 5. Financial -->
    <div style="page-break-before:always">
    <h2>5. Resumo Financeiro</h2>
    <table>
      <tr><td style="font-weight:600;width:40%">Receitas</td><td style="color:${AWC_COLORS.success}">${formatCurrency(receitas)}</td></tr>
      <tr><td style="font-weight:600">Despesas</td><td style="color:${AWC_COLORS.danger}">${formatCurrency(despesas)}</td></tr>
      <tr style="background:${AWC_COLORS.dark}"><td style="font-weight:700;color:#fff">Resultado</td><td style="font-weight:700;color:${receitas - despesas >= 0 ? AWC_COLORS.success : AWC_COLORS.danger}">${formatCurrency(receitas - despesas)}</td></tr>
    </table>
    </div>

    <!-- 6. Medições -->
    <div style="page-break-before:always">
    <h2>6. Medições</h2>
    <table>
      <thead><tr><th>Período</th><th>Valor</th><th>Status</th></tr></thead>
      <tbody>${obra.medicoes.map(m => `<tr><td>${m.periodoInicio?.toLocaleDateString("pt-BR")} — ${m.periodoFim?.toLocaleDateString("pt-BR")}</td><td>${formatCurrency(m.valorTotal)}</td><td>${statusBadge(m.status.startsWith("APROVADA") ? AWC_COLORS.success : AWC_COLORS.warning, m.status)}</td></tr>`).join("")}</tbody>
    </table>
    </div>

    <!-- 7. As-Built -->
    <div style="page-break-before:always">
    <h2>7. As-Built</h2>
    <p style="color:${AWC_COLORS.gray};font-size:11px;margin:12px 0">Documentação final conforme executado — registrado nos RDOs e inspeções acima.</p>
    <table>
      <tr><td style="font-weight:600">Avanço Final</td><td>${obra.etapas.length > 0 ? (obra.etapas.reduce((s, e) => s + (e.percentualRealizado || 0), 0) / obra.etapas.length).toFixed(1) : 0}%</td></tr>
      <tr><td style="font-weight:600">Data de Conclusão</td><td>${obra.dataConclusao?.toLocaleDateString("pt-BR") || "Em andamento"}</td></tr>
    </table>
    </div>
  `;

  return wrapReport(content, "Databook Final", obra.nome);
}
