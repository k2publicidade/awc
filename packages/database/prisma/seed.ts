import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create tenant
  const tenant = await prisma.tenant.upsert({
    where: { slug: "awc" },
    update: {},
    create: {
      name: "AWC Pree Moldados",
      slug: "awc",
      primaryColor: "#FF6B00",
    },
  });

  console.log("Tenant created:", tenant.name);

  // Create users
  const users = [
    { name: "Admin AWC", email: "admin@awc.com.br", role: "SUPER_ADMIN" as const, password: "admin123" },
    { name: "Carlos Engenheiro", email: "engenheiro@awc.com.br", role: "ENGENHEIRO" as const, password: "eng123" },
    { name: "Joao Encarregado", email: "encarregado@awc.com.br", role: "ENCARREGADO" as const, password: "enc123" },
    { name: "Maria Financeiro", email: "financeiro@awc.com.br", role: "FINANCEIRO" as const, password: "fin123" },
    { name: "Pedro Almoxarife", email: "almoxarife@awc.com.br", role: "ALMOXARIFE" as const, password: "alm123" },
    { name: "Cliente Demo", email: "cliente@awc.com.br", role: "CLIENTE" as const, password: "cli123" },
  ];

  for (const userData of users) {
    const passwordHash = await bcrypt.hash(userData.password, 12);
    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: {},
      create: {
        name: userData.name,
        email: userData.email,
        passwordHash,
        role: userData.role,
        tenantId: tenant.id,
      },
    });
    console.log(`User: ${user.name} (${user.role})`);
  }

  const engenheiro = await prisma.user.findUnique({ where: { email: "engenheiro@awc.com.br" } });
  const cliente = await prisma.user.findUnique({ where: { email: "cliente@awc.com.br" } });

  // Create sample obras
  const obrasData = [
    {
      codigo: "AWC-2026-001",
      nome: "Galpao Industrial XYZ",
      tipo: "GALPAO" as const,
      endereco: "Rod. BR-101, km 45 - Itajai/SC",
      cidade: "Itajai",
      estado: "SC",
      latitude: -26.9078,
      longitude: -48.6608,
      valorContratado: 2850000,
      dataInicio: new Date("2026-01-15"),
      dataPrevisaoFim: new Date("2026-08-30"),
      status: "EM_ANDAMENTO" as const,
    },
    {
      codigo: "AWC-2026-002",
      nome: "Edificio Comercial Center",
      tipo: "EDIFICIO" as const,
      endereco: "Rua XV de Novembro, 200 - Blumenau/SC",
      cidade: "Blumenau",
      estado: "SC",
      latitude: -26.9166,
      longitude: -49.0657,
      valorContratado: 4200000,
      dataInicio: new Date("2026-03-01"),
      dataPrevisaoFim: new Date("2026-12-15"),
      status: "EM_ANDAMENTO" as const,
    },
    {
      codigo: "AWC-2026-003",
      nome: "Ponte Passarela Rodoviaria",
      tipo: "PONTE" as const,
      endereco: "Av. Beira Rio, s/n - Gaspar/SC",
      cidade: "Gaspar",
      estado: "SC",
      latitude: -26.9316,
      longitude: -48.9544,
      valorContratado: 1580000,
      dataInicio: new Date("2026-02-10"),
      dataPrevisaoFim: new Date("2026-07-20"),
      status: "EM_ANDAMENTO" as const,
    },
  ];

  const obras: any[] = [];
  for (const obraData of obrasData) {
    const obra = await prisma.obra.upsert({
      where: { codigo: obraData.codigo },
      update: {
        ...obraData,
        engenheiroId: engenheiro!.id,
        clienteId: cliente!.id,
        tenantId: tenant.id,
      } as any,
      create: {
        ...obraData,
        engenheiroId: engenheiro!.id,
        clienteId: cliente!.id,
        tenantId: tenant.id,
      } as any,
    });
    obras.push(obra);
    console.log(`Obra: ${obra.nome}`);
  }

  // Create default etapas for galpao
  const galpao = obras[0];
  const etapas = [
    { nome: "Fundacoes", ordem: 1, dataInicio: new Date("2026-01-15"), dataFim: new Date("2026-03-15"), percentualPrevisto: 100, percentualRealizado: 100 },
    { nome: "Montagem de Pilares", ordem: 2, dataInicio: new Date("2026-03-16"), dataFim: new Date("2026-04-30"), percentualPrevisto: 100, percentualRealizado: 85 },
    { nome: "Montagem de Vigas", ordem: 3, dataInicio: new Date("2026-05-01"), dataFim: new Date("2026-06-15"), percentualPrevisto: 60, percentualRealizado: 40 },
    { nome: "Laje Pree-Moldada", ordem: 4, dataInicio: new Date("2026-06-01"), dataFim: new Date("2026-07-15"), percentualPrevisto: 20, percentualRealizado: 0 },
    { nome: "Fechamento Telhas/Paineis", ordem: 5, dataInicio: new Date("2026-07-01"), dataFim: new Date("2026-08-15"), percentualPrevisto: 0, percentualRealizado: 0 },
    { nome: "Instalacoes", ordem: 6, dataInicio: new Date("2026-08-01"), dataFim: new Date("2026-08-25"), percentualPrevisto: 0, percentualRealizado: 0 },
    { nome: "Acabamento", ordem: 7, dataInicio: new Date("2026-08-20"), dataFim: new Date("2026-08-30"), percentualPrevisto: 0, percentualRealizado: 0 },
  ];

  for (const etapaData of etapas) {
    const existing = await prisma.etapa.findFirst({ where: { obraId: galpao.id, nome: etapaData.nome } });
    const data = {
      nome: etapaData.nome,
      ordem: etapaData.ordem,
      dataInicio: etapaData.dataInicio,
      dataFim: etapaData.dataFim,
      percentualPrevisto: etapaData.percentualPrevisto,
      percentualRealizado: etapaData.percentualRealizado,
      obraId: galpao.id,
    } as any;
    if (existing) await prisma.etapa.update({ where: { id: existing.id }, data });
    else await prisma.etapa.create({ data });
  }
  console.log("Etapas criadas para galpao");

  // Create fornecedores
  const fornecedores = [
    { razaoSocial: "Concreto Sul Ltda", nomeFantasia: "Concreto Sul", cnpj: "12.345.678/0001-90", telefone: "(47) 3333-4444", email: "contato@concretosul.com.br" },
    { razaoSocial: "Aco Nacional S.A.", nomeFantasia: "Aco Nacional", cnpj: "98.765.432/0001-10", telefone: "(47) 3333-5555", email: "vendas@aconacional.com.br" },
    { razaoSocial: "Formas e Escoramentos Ltda", nomeFantasia: "Formas & Escoramentos", cnpj: "11.222.333/0001-44", telefone: "(47) 3333-6666", email: "comercial@formas.com.br" },
  ];

  for (const fornData of fornecedores) {
    await prisma.fornecedor.upsert({
      where: { cnpj: fornData.cnpj },
      update: { ...fornData, tenantId: tenant.id } as any,
      create: { ...fornData, tenantId: tenant.id } as any,
    });
  }
  console.log("Fornecedores criados");

  // Create materiais
  const materiais = [
    { codigo: "MAT-001", descricao: "Cimento CP-V ARI 50kg", unidade: "saco", estoqueMinimo: 100, categoria: "AGREGADOS" },
    { codigo: "MAT-002", descricao: "Aco CA-50 10mm", unidade: "kg", estoqueMinimo: 5000, categoria: "ACO" },
    { codigo: "MAT-003", descricao: "Brita 19mm", unidade: "m3", estoqueMinimo: 50, categoria: "AGREGADOS" },
    { codigo: "MAT-004", descricao: "Areia Media", unidade: "m3", estoqueMinimo: 80, categoria: "AGREGADOS" },
    { codigo: "MAT-005", descricao: "Pilar Pree-Moldado 40x40", unidade: "un", estoqueMinimo: 10, categoria: "PRE_MOLDADO" },
    { codigo: "MAT-006", descricao: "Viga Pree-Moldada 30x60", unidade: "un", estoqueMinimo: 10, categoria: "PRE_MOLDADO" },
    { codigo: "MAT-007", descricao: "Laje Trelicada 8m", unidade: "un", estoqueMinimo: 20, categoria: "PRE_MOLDADO" },
    { codigo: "MAT-008", descricao: "Telha Termoacustica", unidade: "m2", estoqueMinimo: 500, categoria: "COBERTURA" },
  ];

  for (const matData of materiais) {
    await prisma.material.upsert({
      where: { codigo: matData.codigo },
      update: { ...matData, tenantId: tenant.id } as any,
      create: { ...matData, tenantId: tenant.id } as any,
    });
  }
  console.log("Materiais criados");

  // Create trabalhadores
  const trabalhadores = [
    { nome: "Jose da Silva", cpf: "123.456.789-00", funcao: "Pedreiro", vinculo: "CLT" as const },
    { nome: "Antonio Santos", cpf: "234.567.890-11", funcao: "Carpinteiro", vinculo: "CLT" as const },
    { nome: "Francisco Oliveira", cpf: "345.678.901-22", funcao: "Armador", vinculo: "CLT" as const },
    { nome: "Luis Ferreira", cpf: "456.789.012-33", funcao: "Operador de Guindaste", vinculo: "CLT" as const },
    { nome: "Paulo Mendes", cpf: "567.890.123-44", funcao: "Servente", vinculo: "TERCEIRIZADO" as const },
    { nome: "Roberto Lima", cpf: "678.901.234-55", funcao: "Eletricista", vinculo: "AUTONOMO" as const },
  ];

  for (const t of trabalhadores) {
    const existing = await prisma.trabalhador.findFirst({ where: { cpf: t.cpf, tenantId: tenant.id } });
    if (existing) await prisma.trabalhador.update({ where: { id: existing.id }, data: { ...t, tenantId: tenant.id } as any });
    else await prisma.trabalhador.create({ data: { ...t, tenantId: tenant.id } as any });
  }
  console.log("Trabalhadores criados");

  console.log("\n=== Seed completed! ===");
  console.log("Login credentials:");
  console.log("  Admin:       admin@awc.com.br / admin123");
  console.log("  Engenheiro:  engenheiro@awc.com.br / eng123");
  console.log("  Encarregado: encarregado@awc.com.br / enc123");
  console.log("  Financeiro:  financeiro@awc.com.br / fin123");
  console.log("  Almoxarife:  almoxarife@awc.com.br / alm123");
  console.log("  Cliente:     cliente@awc.com.br / cli123");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
