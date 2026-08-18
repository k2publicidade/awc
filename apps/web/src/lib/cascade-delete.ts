import prisma from '@/lib/prisma';

/**
 * Exclui uma Obra e todos os seus relacionamentos em uma transação atômica.
 */
export async function deleteObraCascade(obraId: string, tenantId: string) {
  return await prisma.$transaction(async (tx) => {
    // 1. Predecessores vinculados às etapas da obra
    await tx.predecessor.deleteMany({
      where: {
        OR: [
          { etapa: { obraId, obra: { tenantId } } },
          { predecessora: { obraId, obra: { tenantId } } },
        ],
      },
    });

    // 2. RDOs e sub-itens
    await tx.rDOClima.deleteMany({ where: { rdo: { obraId } } });
    await tx.rDOEfetivo.deleteMany({ where: { rdo: { obraId } } });
    await tx.rDOAtividade.deleteMany({ where: { rdo: { obraId } } });
    await tx.rDOOcorrencia.deleteMany({ where: { rdo: { obraId } } });
    await tx.rDOEquipamento.deleteMany({ where: { rdo: { obraId } } });
    await tx.rDO.deleteMany({ where: { obraId, obra: { tenantId } } });

    // 3. Orçamentos e itens/versões
    await tx.orcamentoItem.deleteMany({ where: { orcamento: { obraId } } });
    await tx.orcamentoVersao.deleteMany({ where: { orcamento: { obraId } } });
    await tx.orcamento.deleteMany({ where: { obraId, obra: { tenantId } } });

    // 4. Medições e itens
    await tx.medicaoItem.deleteMany({ where: { medicao: { obraId } } });
    await tx.medicao.deleteMany({ where: { obraId, obra: { tenantId } } });

    // 5. Inspeções, itens e não conformidades
    await tx.inspecaoItem.deleteMany({ where: { inspecao: { obraId } } });
    await tx.naoConformidade.deleteMany({ where: { obraId, obra: { tenantId } } });
    await tx.inspecao.deleteMany({ where: { obraId, obra: { tenantId } } });

    // 6. Contratos e pagamentos
    await tx.contratoPagamento.deleteMany({ where: { contrato: { obraId } } });
    await tx.contrato.deleteMany({ where: { obraId, obra: { tenantId } } });

    // 7. Equipes da obra e membros
    await tx.equipeMembro.deleteMany({ where: { equipe: { obraId } } });
    await tx.equipeObra.deleteMany({ where: { obraId, obra: { tenantId } } });

    // 8. Demais entidades vinculadas à obra
    await tx.foto.deleteMany({ where: { obraId, obra: { tenantId } } });
    await tx.documento.deleteMany({ where: { obraId, obra: { tenantId } } });
    await tx.ocorrencia.deleteMany({ where: { obraId, obra: { tenantId } } });
    await tx.lancamentoFinanceiro.deleteMany({ where: { obraId, obra: { tenantId } } });
    await tx.notaFiscal.deleteMany({ where: { obraId, obra: { tenantId } } });
    await tx.estoqueMovimento.deleteMany({ where: { obraId, obra: { tenantId } } });
    await tx.requisicaoCompra.deleteMany({ where: { obraId, obra: { tenantId } } });
    await tx.presenca.deleteMany({ where: { obraId, obra: { tenantId } } });
    await tx.pecaPreMoldada.deleteMany({ where: { obraId, obra: { tenantId } } });
    await tx.dDS.deleteMany({ where: { obraId, obra: { tenantId } } });
    await tx.acidente.deleteMany({ where: { obraId, obra: { tenantId } } });
    await tx.cronogramaVersao.deleteMany({ where: { obraId, obra: { tenantId } } });
    await tx.etapa.deleteMany({ where: { obraId, obra: { tenantId } } });

    // 9. Exclui a Obra
    return await tx.obra.delete({
      where: { id: obraId, tenantId },
    });
  });
}

/**
 * Exclui uma Etapa e seus relacionamentos.
 */
export async function deleteEtapaCascade(etapaId: string) {
  return await prisma.$transaction(async (tx) => {
    await tx.predecessor.deleteMany({
      where: { OR: [{ etapaId }, { predecessoraId: etapaId }] },
    });
    await tx.rDOAtividade.deleteMany({ where: { etapaId } });
    await tx.medicaoItem.deleteMany({ where: { etapaId } });
    await tx.inspecao.deleteMany({ where: { etapaId } });
    await tx.naoConformidade.deleteMany({ where: { etapaId } });
    await tx.ocorrencia.deleteMany({ where: { etapaId } });
    await tx.foto.updateMany({ where: { etapaId }, data: { etapaId: null } });
    await tx.estoqueMovimento.updateMany({ where: { etapaId }, data: { etapaId: null } });
    await tx.orcamentoItem.updateMany({ where: { etapaId }, data: { etapaId: null } });
    await tx.pecaPreMoldada.updateMany({ where: { etapaId }, data: { etapaId: null } });
    return await tx.etapa.delete({ where: { id: etapaId } });
  });
}

/**
 * Exclui um RDO e seus sub-itens.
 */
export async function deleteRdoCascade(rdoId: string) {
  return await prisma.$transaction(async (tx) => {
    await tx.rDOClima.deleteMany({ where: { rdoId } });
    await tx.rDOEfetivo.deleteMany({ where: { rdoId } });
    await tx.rDOAtividade.deleteMany({ where: { rdoId } });
    await tx.rDOOcorrencia.deleteMany({ where: { rdoId } });
    await tx.rDOEquipamento.deleteMany({ where: { rdoId } });
    await tx.foto.updateMany({ where: { rdoId }, data: { rdoId: null } });
    await tx.presenca.updateMany({ where: { rdoId }, data: { rdoId: null } });
    return await tx.rDO.delete({ where: { id: rdoId } });
  });
}

/**
 * Exclui um Orçamento e seus itens/versões.
 */
export async function deleteOrcamentoCascade(orcamentoId: string) {
  return await prisma.$transaction(async (tx) => {
    await tx.orcamentoItem.deleteMany({ where: { orcamentoId } });
    await tx.orcamentoVersao.deleteMany({ where: { orcamentoId } });
    return await tx.orcamento.delete({ where: { id: orcamentoId } });
  });
}

/**
 * Exclui uma Medição e seus itens.
 */
export async function deleteMedicaoCascade(medicaoId: string) {
  return await prisma.$transaction(async (tx) => {
    await tx.medicaoItem.deleteMany({ where: { medicaoId } });
    return await tx.medicao.delete({ where: { id: medicaoId } });
  });
}

/**
 * Exclui uma Inspeção e seus itens.
 */
export async function deleteInspecaoCascade(inspecaoId: string) {
  return await prisma.$transaction(async (tx) => {
    await tx.inspecaoItem.deleteMany({ where: { inspecaoId } });
    await tx.naoConformidade.updateMany({ where: { inspecaoId }, data: { inspecaoId: null } });
    return await tx.inspecao.delete({ where: { id: inspecaoId } });
  });
}

/**
 * Exclui um Contrato e seus pagamentos.
 */
export async function deleteContratoCascade(contratoId: string) {
  return await prisma.$transaction(async (tx) => {
    await tx.contratoPagamento.deleteMany({ where: { contratoId } });
    return await tx.contrato.delete({ where: { id: contratoId } });
  });
}

/**
 * Exclui uma Equipe e seus membros vinculados.
 */
export async function deleteEquipeCascade(equipeId: string) {
  return await prisma.$transaction(async (tx) => {
    await tx.equipeMembro.deleteMany({ where: { equipeId } });
    return await tx.equipeObra.delete({ where: { id: equipeId } });
  });
}
