import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';

config({ path: 'packages/database/.env', quiet: true });

const prisma = new PrismaClient();
const stamp = Date.now();

async function main() {
  await prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({
      data: { name: `Smoke ${stamp}`, slug: `smoke-${stamp}` },
    });
    const user = await tx.user.create({
      data: {
        tenantId: tenant.id,
        name: 'Smoke User',
        email: `smoke-${stamp}@rigor.test`,
        role: 'ADMIN',
      },
    });
    const fornecedor = await tx.fornecedor.create({
      data: { tenantId: tenant.id, razaoSocial: 'Fornecedor Smoke', cnpj: `SMK-${stamp}` },
    });
    const obra = await tx.obra.create({
      data: {
        tenantId: tenant.id,
        nome: `Smoke Obra ${stamp}`,
        codigo: `SMK-${stamp}`,
        tipo: 'GALPAO',
        status: 'PLANEJAMENTO',
      },
    });
    const etapa = await tx.etapa.create({
      data: { obraId: obra.id, nome: 'Smoke Etapa', ordem: 99 },
    });
    const material = await tx.material.create({
      data: {
        tenantId: tenant.id,
        codigo: `SMK-MAT-${stamp}`,
        descricao: 'Smoke Material',
        unidade: 'un',
      },
    });
    const trabalhador = await tx.trabalhador.create({
      data: { tenantId: tenant.id, nome: 'Smoke Trabalhador', cpf: `SMK${stamp}`, funcao: 'Teste' },
    });
    const rdo = await tx.rDO.create({
      data: {
        obraId: obra.id,
        responsavelId: user.id,
        numero: stamp % 100000,
        data: new Date(),
        observacoes: 'Smoke',
      },
    });
    const financeiro = await tx.lancamentoFinanceiro.create({
      data: {
        obraId: obra.id,
        tipo: 'DESPESA',
        descricao: 'Smoke financeiro',
        valor: 1,
        dataVencimento: new Date(),
        createdBy: user.id,
      },
    });
    const documento = await tx.documento.create({
      data: { obraId: obra.id, nome: 'Smoke doc', categoria: 'OUTRO', createdBy: user.id },
    });
    const naoConformidade = await tx.naoConformidade.create({
      data: {
        obraId: obra.id,
        etapaId: etapa.id,
        descricao: 'Smoke NC',
        responsavelId: user.id,
      },
    });
    const dds = await tx.dDS.create({
      data: { obraId: obra.id, tema: 'Smoke DDS', responsavelId: user.id },
    });
    const foto = await tx.foto.create({
      data: { obraId: obra.id, etapaId: etapa.id, url: 'https://placehold.co/600x400' },
    });
    const orcamento = await tx.orcamento.create({ data: { obraId: obra.id, createdBy: user.id } });
    const contrato = await tx.contrato.create({
      data: {
        obraId: obra.id,
        fornecedorId: fornecedor.id,
        numero: `SMK-CTR-${stamp}`,
        objeto: 'Smoke contrato',
        tipo: 'SERVICO',
        dataInicio: new Date(),
        dataFim: new Date(Date.now() + 86_400_000),
        createdBy: user.id,
      },
    });
    const ocorrencia = await tx.ocorrencia.create({
      data: {
        obraId: obra.id,
        etapaId: etapa.id,
        tipo: 'OUTRO',
        descricao: 'Smoke ocorrencia',
        responsavelAberturaId: user.id,
      },
    });
    const notificacao = await tx.notificacao.create({
      data: {
        tenantId: tenant.id,
        userId: user.id,
        tipo: 'SMOKE',
        titulo: 'Smoke',
        mensagem: 'Smoke',
        canal: 'IN_APP',
      },
    });

    const obraEditada = await tx.obra.update({
      where: { id: obra.id },
      data: { nome: `Smoke Obra Editada ${stamp}` },
    });
    const materialEditado = await tx.material.update({
      where: { id: material.id },
      data: { descricao: 'Smoke Material Editado' },
    });
    if (!obraEditada.nome.includes('Editada') || !materialEditado.descricao.includes('Editado')) {
      throw new Error('As atualizações do smoke CRUD não foram persistidas');
    }

    await tx.notificacao.delete({ where: { id: notificacao.id } });
    await tx.ocorrencia.delete({ where: { id: ocorrencia.id } });
    await tx.contrato.delete({ where: { id: contrato.id } });
    await tx.orcamento.delete({ where: { id: orcamento.id } });
    await tx.foto.delete({ where: { id: foto.id } });
    await tx.dDS.delete({ where: { id: dds.id } });
    await tx.naoConformidade.delete({ where: { id: naoConformidade.id } });
    await tx.documento.delete({ where: { id: documento.id } });
    await tx.lancamentoFinanceiro.delete({ where: { id: financeiro.id } });
    await tx.rDO.delete({ where: { id: rdo.id } });
    await tx.trabalhador.delete({ where: { id: trabalhador.id } });
    await tx.material.delete({ where: { id: material.id } });
    await tx.etapa.delete({ where: { id: etapa.id } });
    await tx.obra.delete({ where: { id: obra.id } });
    await tx.fornecedor.delete({ where: { id: fornecedor.id } });
    await tx.user.delete({ where: { id: user.id } });
    await tx.tenant.delete({ where: { id: tenant.id } });
  }, { timeout: 30_000 });

  console.log(
    'SMOKE CRUD OK: obras, cronograma, RDO, financeiro, materiais, equipe, documentos, qualidade, segurança, galeria, orçamentos, contratos, ocorrências e notificações (isolado e limpo)',
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
