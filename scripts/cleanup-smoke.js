// Remove registros criados pelos smoke tests (prefixo SMOKE)
const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

async function main() {
  const rdos = await p.rDO.findMany({ where: { observacoes: "SMOKE TEST" }, select: { id: true } });
  for (const r of rdos) {
    await p.rDOClima.deleteMany({ where: { rdoId: r.id } });
    await p.rDOEfetivo.deleteMany({ where: { rdoId: r.id } });
    await p.rDOAtividade.deleteMany({ where: { rdoId: r.id } });
    await p.rDOOcorrencia.deleteMany({ where: { rdoId: r.id } });
    await p.rDOEquipamento.deleteMany({ where: { rdoId: r.id } });
    await p.foto.deleteMany({ where: { rdoId: r.id } });
    await p.rDO.delete({ where: { id: r.id } });
  }
  console.log("RDOs:", rdos.length);

  console.log("lanc:", (await p.lancamentoFinanceiro.deleteMany({ where: { descricao: { startsWith: "SMOKE" } } })).count);
  console.log("ocorr:", (await p.ocorrencia.deleteMany({ where: { descricao: { startsWith: "SMOKE" } } })).count);
  console.log("mov:", (await p.estoqueMovimento.deleteMany({ where: { material: { codigo: "SMOKE-001" } } })).count);
  console.log("mat:", (await p.material.deleteMany({ where: { codigo: "SMOKE-001" } })).count);
  const trabs = await p.trabalhador.findMany({ where: { nome: { startsWith: "SMOKE" } }, select: { id: true } });
  for (const t of trabs) {
    await p.exameMedico.deleteMany({ where: { trabalhadorId: t.id } });
    await p.trabalhador.delete({ where: { id: t.id } });
  }
  console.log("trab:", trabs.length);
  console.log("doc:", (await p.documento.deleteMany({ where: { nome: { startsWith: "SMOKE" } } })).count);
  console.log("foto:", (await p.foto.deleteMany({ where: { legenda: { startsWith: "SMOKE" } } })).count);
  const orcs = await p.orcamento.findMany({ where: { justificativa: { startsWith: "SMOKE" } }, select: { id: true } });
  for (const o of orcs) {
    await p.orcamentoVersao.deleteMany({ where: { orcamentoId: o.id } });
    await p.orcamento.delete({ where: { id: o.id } });
  }
  console.log("orc:", orcs.length);
  console.log("nc:", (await p.naoConformidade.deleteMany({ where: { descricao: { startsWith: "SMOKE" } } })).count);
  console.log("dds:", (await p.dDS.deleteMany({ where: { tema: { startsWith: "SMOKE" } } })).count);
  console.log("acid:", (await p.acidente.deleteMany({ where: { descricao: { startsWith: "SMOKE" } } })).count);
  const meds = await p.medicao.findMany({ where: { numero: 999 }, select: { id: true } });
  for (const m of meds) {
    await p.medicaoItem.deleteMany({ where: { medicaoId: m.id } });
    await p.medicao.delete({ where: { id: m.id } });
  }
  console.log("med:", meds.length);
  console.log("contrato:", (await p.contrato.deleteMany({ where: { numero: { startsWith: "SMOKE" } } })).count);
  console.log("notif smoke:", (await p.notificacao.deleteMany({ where: { mensagem: { contains: "SMOKE" } } })).count);
}

main().then(() => p.$disconnect()).catch((e) => { console.error(e); process.exit(1); });
