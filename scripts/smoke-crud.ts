import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const stamp = Date.now();
async function first(model: string, where?: any) { return (prisma as any)[model].findFirst({ where }); }
async function main() {
  const tenant = await first("tenant") || await prisma.tenant.create({ data: { name: "Smoke", slug: `smoke-${stamp}` } });
  const user = await first("user", { tenantId: tenant.id }) || await prisma.user.create({ data: { tenantId: tenant.id, name: "Smoke User", email: `smoke-${stamp}@awc.test`, role: "ADMIN" } as any });
  const fornecedor = await first("fornecedor", { tenantId: tenant.id }) || await prisma.fornecedor.create({ data: { tenantId: tenant.id, razaoSocial: "Fornecedor Smoke", cnpj: `${stamp}` } });
  const obra = await prisma.obra.create({ data: { tenantId: tenant.id, nome: `Smoke Obra ${stamp}`, codigo: `SMK-${stamp}`, tipo: "GALPAO", status: "PLANEJAMENTO" } as any });
  const etapa = await prisma.etapa.create({ data: { obraId: obra.id, nome: "Smoke Etapa", ordem: 99 } as any });
  const material = await prisma.material.create({ data: { tenantId: tenant.id, codigo: `SMK-MAT-${stamp}`, descricao: "Smoke Material", unidade: "un" } as any });
  const trabalhador = await prisma.trabalhador.create({ data: { tenantId: tenant.id, nome: "Smoke Trabalhador", cpf: `SMK${stamp}`, funcao: "Teste" } as any });
  const rdo = await prisma.rDO.create({ data: { obraId: obra.id, responsavelId: user.id, numero: stamp % 100000, data: new Date(), observacoes: "Smoke" } as any });
  const financeiro = await prisma.lancamentoFinanceiro.create({ data: { obraId: obra.id, tipo: "DESPESA", descricao: "Smoke financeiro", valor: 1, dataVencimento: new Date(), createdBy: user.id } as any });
  const documento = await prisma.documento.create({ data: { obraId: obra.id, nome: "Smoke doc", categoria: "OUTRO", createdBy: user.id } as any });
  const nc = await prisma.naoConformidade.create({ data: { obraId: obra.id, etapaId: etapa.id, descricao: "Smoke NC", responsavelId: user.id } as any });
  const dds = await prisma.dDS.create({ data: { obraId: obra.id, tema: "Smoke DDS", responsavelId: user.id } as any });
  const foto = await prisma.foto.create({ data: { obraId: obra.id, etapaId: etapa.id, url: "https://placehold.co/600x400" } as any });
  const orc = await prisma.orcamento.create({ data: { obraId: obra.id, createdBy: user.id } as any });
  const contrato = await prisma.contrato.create({ data: { obraId: obra.id, fornecedorId: fornecedor.id, numero: `SMK-CTR-${stamp}`, objeto: "Smoke contrato", tipo: "SERVICO", dataInicio: new Date(), dataFim: new Date(Date.now()+86400000), createdBy: user.id } as any });
  const ocorrencia = await prisma.ocorrencia.create({ data: { obraId: obra.id, etapaId: etapa.id, tipo: "OUTRO", descricao: "Smoke ocorrencia", responsavelAberturaId: user.id } as any });
  const notif = await prisma.notificacao.create({ data: { tenantId: tenant.id, userId: user.id, tipo: "SMOKE", titulo: "Smoke", mensagem: "Smoke", canal: "IN_APP" } as any });
  await prisma.obra.update({ where: { id: obra.id }, data: { nome: `Smoke Obra Editada ${stamp}` } });
  await prisma.material.update({ where: { id: material.id }, data: { descricao: "Smoke Material Editado" } });
  await prisma.notificacao.delete({ where: { id: notif.id } });
  await prisma.ocorrencia.delete({ where: { id: ocorrencia.id } });
  await prisma.contrato.delete({ where: { id: contrato.id } });
  await prisma.orcamento.delete({ where: { id: orc.id } });
  await prisma.foto.delete({ where: { id: foto.id } });
  await prisma.dDS.delete({ where: { id: dds.id } });
  await prisma.naoConformidade.delete({ where: { id: nc.id } });
  await prisma.documento.delete({ where: { id: documento.id } });
  await prisma.lancamentoFinanceiro.delete({ where: { id: financeiro.id } });
  await prisma.rDO.delete({ where: { id: rdo.id } });
  await prisma.trabalhador.delete({ where: { id: trabalhador.id } });
  await prisma.material.delete({ where: { id: material.id } });
  await prisma.etapa.delete({ where: { id: etapa.id } });
  await prisma.obra.delete({ where: { id: obra.id } });
  console.log("SMOKE CRUD OK: obras, cronograma, rdo, financeiro, materiais, equipe, documentos, qualidade, seguranca, galeria, orcamentos, contratos, ocorrencias, notificacoes");
}
main().catch(e => { console.error(e); process.exit(1); }).finally(async () => prisma.$disconnect());

