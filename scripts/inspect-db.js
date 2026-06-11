// Lista obras e volumes de dados associados para identificar dados demonstrativos.
const path = require("path");
const fs = require("fs");

if (!process.env.DATABASE_URL) {
  const env = fs.readFileSync(path.join(__dirname, "..", "apps", "web", ".env"), "utf8");
  const m = env.match(/DATABASE_URL="([^"]+)"/);
  if (m) process.env.DATABASE_URL = m[1];
}

const { PrismaClient } = require(path.join(__dirname, "..", "node_modules", "@prisma/client"));
const prisma = new PrismaClient();

(async () => {
  const obras = await prisma.obra.findMany({
    select: {
      id: true, nome: true, codigo: true, status: true, tipo: true,
      _count: { select: { etapas: true, rdos: true, lancamentos: true, documentos: true, fotos: true, ocorrencias: true, inspecoes: true, contratos: true, orcamentos: true, medicoes: true } },
    },
    orderBy: { createdAt: "asc" },
  });
  for (const o of obras) {
    console.log(JSON.stringify(o));
  }
  const counts = {};
  for (const t of ["etapa", "rDO", "lancamentoFinanceiro", "documento", "foto", "ocorrencia", "inspecao", "contrato", "orcamento", "medicao", "material", "funcionario", "user", "notificacao"]) {
    try { counts[t] = await prisma[t].count(); } catch (e) { counts[t] = "ERR"; }
  }
  console.log("TOTAIS:", JSON.stringify(counts));
  await prisma.$disconnect();
})();
