// Importa o cronograma real (Hangar Obra CHC, extraído do MS Project) e
// remove os dados demonstrativos do seed (obras, etapas, materiais, notificações).
// Uso: node scripts/import-cronograma-chc.js <json extraído pelo extract-mpp.py>
const path = require("path");
const fs = require("fs");

if (!process.env.DATABASE_URL) {
  const env = fs.readFileSync(path.join(__dirname, "..", "apps", "web", ".env"), "utf8");
  const m = env.match(/DATABASE_URL="([^"]+)"/);
  if (m) process.env.DATABASE_URL = m[1];
}

const { PrismaClient } = require(path.join(__dirname, "..", "node_modules", "@prisma/client"));
const prisma = new PrismaClient();

const DEMO_CODIGOS = ["AWC-2026-001", "AWC-2026-002", "AWC-2026-003"];
const STATUS_DATE = new Date("2026-05-08T16:30:00");

// Percentual previsto na data de status: interpolação linear entre início e fim planejados.
function previsto(inicio, fim) {
  if (!inicio || !fim) return 0;
  const i = new Date(inicio).getTime(), f = new Date(fim).getTime(), s = STATUS_DATE.getTime();
  if (s >= f) return 100;
  if (s <= i) return 0;
  return Math.round(((s - i) / (f - i)) * 100);
}

const PALETA = ["#FF7A1A", "#0EA5E9", "#22C55E", "#A855F7", "#F59E0B", "#EF4444", "#14B8A6", "#6366F1", "#EC4899", "#84CC16"];

(async () => {
  const src = process.argv[2] || "C:/Users/LiPeX/AppData/Local/Temp/cronograma-chc.json";
  const { projeto, tarefas } = JSON.parse(fs.readFileSync(src, "utf8"));

  const tenant = await prisma.tenant.findFirst();
  if (!tenant) throw new Error("Nenhum tenant encontrado");

  // ── 1. Remover dados demonstrativos ──────────────────────────────────────
  const demoObras = await prisma.obra.findMany({ where: { codigo: { in: DEMO_CODIGOS } }, select: { id: true, nome: true } });
  const demoIds = demoObras.map((o) => o.id);

  if (demoIds.length) {
    const demoEtapas = await prisma.etapa.findMany({ where: { obraId: { in: demoIds } }, select: { id: true } });
    const etapaIds = demoEtapas.map((e) => e.id);

    await prisma.predecessor.deleteMany({ where: { OR: [{ etapaId: { in: etapaIds } }, { predecessoraId: { in: etapaIds } }] } });
    // Dependentes diretos das obras demo (contagens já verificadas como zero; deleteMany é idempotente)
    for (const model of ["rDOAtividade", "rDOMaoObra", "rDOEquipamento"]) {
      try { await prisma[model].deleteMany({ where: { rdo: { obraId: { in: demoIds } } } }); } catch {}
    }
    for (const model of ["estoqueMovimento", "requisicaoCompra", "presenca", "equipeObra", "foto", "documento", "ocorrencia", "inspecao", "lancamentoFinanceiro", "notaFiscal", "contrato", "naoConformidade", "medicao", "orcamento", "rDO", "cronogramaVersao"]) {
      try { await prisma[model].deleteMany({ where: { obraId: { in: demoIds } } }); } catch {}
    }
    await prisma.etapa.deleteMany({ where: { obraId: { in: demoIds } } });
    await prisma.obra.deleteMany({ where: { id: { in: demoIds } } });
    console.log(`Removidas ${demoIds.length} obras demo: ${demoObras.map((o) => o.nome).join(", ")}`);
  }

  const matDel = await prisma.material.deleteMany({ where: { estoqueMovimentos: { none: {} } } });
  console.log(`Removidos ${matDel.count} materiais demo`);
  const notDel = await prisma.notificacao.deleteMany({});
  console.log(`Removidas ${notDel.count} notificações demo`);

  // ── 2. Cadastrar a obra real ──────────────────────────────────────────────
  const raiz = tarefas.find((t) => t.nivel === 0);
  const obra = await prisma.obra.upsert({
    where: { codigo: "CHC-001" },
    update: {},
    create: {
      tenantId: tenant.id,
      nome: "Hangar Obra CHC",
      codigo: "CHC-001",
      tipo: "GALPAO",
      status: "EM_ANDAMENTO",
      dataInicio: new Date(raiz.inicio),
      dataPrevisaoFim: new Date(raiz.fim),
      descricao: `Construção de hangar — Obra CHC. Cronograma importado do MS Project (versão de 11/05/2026, autor ${projeto.autor}). Avanço geral na data de status (08/05/2026): ${raiz.percentual}%.`,
    },
  });
  console.log(`Obra criada: ${obra.nome} (${obra.codigo}) id=${obra.id}`);

  // Reimportação limpa: remove etapas anteriores desta obra, se houver
  const prev = await prisma.etapa.findMany({ where: { obraId: obra.id }, select: { id: true } });
  if (prev.length) {
    const ids = prev.map((e) => e.id);
    await prisma.predecessor.deleteMany({ where: { OR: [{ etapaId: { in: ids } }, { predecessoraId: { in: ids } }] } });
    await prisma.etapa.deleteMany({ where: { obraId: obra.id } });
    console.log(`Reimportação: ${prev.length} etapas anteriores removidas`);
  }

  // ── 3. Importar tarefas-folha como etapas ─────────────────────────────────
  // O modelo Etapa é plano: importamos as folhas (não-resumo) e registramos a
  // hierarquia (caminho WBS dos grupos) na descrição.
  const porId = new Map(tarefas.filter((t) => t.id != null).map((t) => [t.id, t]));
  const caminho = (t) => {
    // Reconstrói o caminho de grupos pelo prefixo do WBS
    const partes = t.wbs.split(".");
    const nomes = [];
    for (let n = 1; n < partes.length; n++) {
      const prefixo = partes.slice(0, n).join(".");
      const pai = tarefas.find((x) => x.wbs === prefixo && x.resumo);
      if (pai) nomes.push(pai.nome.trim());
    }
    return nomes.join(" › ");
  };

  const folhas = tarefas.filter((t) => t.id != null && !t.resumo);
  const grupos = [...new Set(folhas.map((t) => t.wbs.split(".").slice(0, 3).join(".")))];
  const corDe = (t) => PALETA[grupos.indexOf(t.wbs.split(".").slice(0, 3).join(".")) % PALETA.length];

  const etapaIdPorTaskId = new Map();
  let ordem = 0;
  for (const t of folhas) {
    ordem += 1;
    const pct = Math.round(t.percentual);
    const etapa = await prisma.etapa.create({
      data: {
        obraId: obra.id,
        nome: `${t.wbs} ${t.nome.trim()}`,
        descricao: caminho(t) || null,
        dataInicio: new Date(t.inicio),
        dataFim: new Date(t.fim),
        dataInicioReal: pct > 0 ? new Date(t.inicio) : null,
        dataFimReal: pct >= 100 ? new Date(t.fim) : null,
        percentualPrevisto: previsto(t.inicio, t.fim),
        percentualRealizado: pct,
        ordem,
        cor: corDe(t),
      },
    });
    etapaIdPorTaskId.set(t.id, etapa.id);
  }
  console.log(`Importadas ${ordem} etapas`);

  // ── 4. Predecessoras (FIM_INICIO) ─────────────────────────────────────────
  let links = 0;
  for (const t of folhas) {
    for (const predId of t.predecessoras || []) {
      const de = etapaIdPorTaskId.get(predId);
      const para = etapaIdPorTaskId.get(t.id);
      if (de && para) {
        await prisma.predecessor.create({ data: { etapaId: para, predecessoraId: de, tipo: "FIM_INICIO" } });
        links += 1;
      }
    }
  }
  console.log(`Criados ${links} vínculos de predecessoras`);

  const total = await prisma.etapa.count({ where: { obraId: obra.id } });
  console.log(`RESULT: OK — obra ${obra.codigo} com ${total} etapas`);
  await prisma.$disconnect();
})().catch(async (e) => {
  console.error("ERRO:", e.message);
  await prisma.$disconnect();
  process.exit(1);
});
