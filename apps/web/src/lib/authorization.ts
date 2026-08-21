import 'server-only';
import prisma from '@/lib/prisma';

const prismaDynamic = prisma as DynamicValue;

const allResources = [
  'obras', 'etapas', 'rdos', 'financeiro', 'medicoes', 'materiais', 'estoqueMovimentos',
  'requisicoes', 'fornecedores', 'equipe', 'equipes', 'equipeMembros', 'presencas', 'epis',
  'treinamentos', 'documentos', 'qualidade', 'inspecoes', 'seguranca', 'acidentes', 'galeria',
  'orcamentos', 'contratos', 'ocorrencias', 'notificacoes',
] as const;

const readResources: Record<string, readonly string[]> = {
  SUPER_ADMIN: allResources,
  ADMIN: allResources,
  ENGENHEIRO: [
    'obras', 'etapas', 'rdos', 'medicoes', 'materiais', 'estoqueMovimentos', 'requisicoes',
    'fornecedores', 'equipe', 'equipes', 'equipeMembros', 'presencas', 'epis', 'treinamentos',
    'documentos', 'qualidade', 'inspecoes', 'seguranca', 'acidentes', 'galeria',
    'ocorrencias', 'notificacoes',
  ],
  ENCARREGADO: [
    'obras', 'etapas', 'rdos', 'materiais', 'estoqueMovimentos', 'requisicoes', 'equipe',
    'equipes', 'equipeMembros', 'presencas', 'epis', 'treinamentos', 'seguranca',
    'acidentes', 'galeria', 'ocorrencias', 'notificacoes',
  ],
  FINANCEIRO: [
    'obras', 'financeiro', 'medicoes', 'orcamentos', 'contratos', 'fornecedores', 'notificacoes',
  ],
  ALMOXARIFE: ['obras', 'materiais', 'estoqueMovimentos', 'requisicoes', 'fornecedores', 'notificacoes'],
  CLIENTE: ['obras', 'rdos', 'medicoes', 'documentos', 'galeria', 'notificacoes'],
};

const writeResources: Record<string, readonly string[]> = {
  SUPER_ADMIN: allResources,
  ADMIN: allResources,
  ENGENHEIRO: [
    'obras', 'etapas', 'rdos', 'medicoes', 'materiais', 'estoqueMovimentos', 'requisicoes',
    'equipe', 'equipes', 'equipeMembros', 'presencas', 'epis', 'treinamentos', 'documentos',
    'qualidade', 'inspecoes', 'seguranca', 'acidentes', 'galeria', 'ocorrencias',
  ],
  ENCARREGADO: [
    'etapas', 'rdos', 'estoqueMovimentos', 'requisicoes', 'presencas', 'seguranca',
    'acidentes', 'galeria', 'ocorrencias',
  ],
  FINANCEIRO: ['financeiro', 'medicoes', 'orcamentos', 'contratos', 'fornecedores'],
  ALMOXARIFE: ['materiais', 'estoqueMovimentos', 'requisicoes', 'fornecedores'],
  CLIENTE: [],
};

export function canAccessResource(role: string, resource: string, write = false) {
  const permissions = write ? writeResources : readResources;
  return Boolean(permissions[role]?.includes(resource));
}

export function resourceTenantWhere(
  resource: string,
  tenantId: string,
  userId?: string,
  role?: string
): DynamicValue {
  if (role === 'MASTER_ADMIN') {
    if (['obras', 'materiais', 'equipe', 'equipes', 'fornecedores', 'notificacoes'].includes(resource)) {
      return { tenantId };
    }
    if (resource === 'equipeMembros') return { equipe: { tenantId } };
    if (['epis', 'treinamentos'].includes(resource)) return { trabalhador: { tenantId } };
    return { obra: { tenantId } };
  }

  const userObraScope = userObraWhere(role || '', tenantId, userId);

  if (resource === 'notificacoes') {
    return { tenantId, userId };
  }

  if (resource === 'obras') {
    return userObraScope;
  }

  if (resource === 'equipeMembros') {
    return { equipe: { obra: userObraScope } };
  }

  if (resource === 'equipes') {
    return { obra: userObraScope };
  }

  if (['epis', 'treinamentos'].includes(resource)) {
    return { trabalhador: { tenantId } };
  }

  if (['materiais', 'fornecedores', 'equipe'].includes(resource)) {
    return { tenantId };
  }

  return { obra: userObraScope };
}

export function scopedWhere(scope: DynamicValue, where: DynamicValue = {}) {
  return Object.keys(where).length ? { AND: [scope, where] } : scope;
}

/**
 * Escopo de obras por usuário. Apenas papéis de campo (ENGENHEIRO, CLIENTE)
 * enxergam exclusivamente as obras às quais estão vinculados. Papéis de
 * gestão/operação (SUPER_ADMIN, ADMIN, ENCARREGADO, FINANCEIRO, ALMOXARIFE)
 * enxergam todas as obras do tenant — sem isso, cadastrar RDO, medir serviços
 * ou lançar financeiro fica impossível para quem não é engenheiro da obra.
 */
export function userObraWhere(role: string, tenantId: string, userId?: string) {
  if (role === 'ENGENHEIRO' || role === 'CLIENTE') {
    return {
      tenantId,
      OR: [
        { engenheiroId: userId },
        { clienteId: userId },
      ],
    };
  }
  return { tenantId };
}

const relationChecks: Record<string, { model: string; where: (id: string, tenantId: string) => DynamicValue }> = {
  obraId: { model: 'obra', where: (id, tenantId) => ({ id, tenantId }) },
  engenheiroId: { model: 'user', where: (id, tenantId) => ({ id, tenantId }) },
  clienteId: { model: 'user', where: (id, tenantId) => ({ id, tenantId }) },
  responsavelId: { model: 'user', where: (id, tenantId) => ({ id, tenantId }) },
  responsavelAberturaId: { model: 'user', where: (id, tenantId) => ({ id, tenantId }) },
  responsavelEncerramentoId: { model: 'user', where: (id, tenantId) => ({ id, tenantId }) },
  solicitanteId: { model: 'user', where: (id, tenantId) => ({ id, tenantId }) },
  aprovadorId: { model: 'user', where: (id, tenantId) => ({ id, tenantId }) },
  createdBy: { model: 'user', where: (id, tenantId) => ({ id, tenantId }) },
  userId: { model: 'user', where: (id, tenantId) => ({ id, tenantId }) },
  materialId: { model: 'material', where: (id, tenantId) => ({ id, tenantId }) },
  fornecedorId: { model: 'fornecedor', where: (id, tenantId) => ({ id, tenantId }) },
  trabalhadorId: { model: 'trabalhador', where: (id, tenantId) => ({ id, tenantId }) },
  vitimaId: { model: 'trabalhador', where: (id, tenantId) => ({ id, tenantId }) },
  equipeId: { model: 'equipeObra', where: (id, tenantId) => ({ id, tenantId }) },
  etapaId: { model: 'etapa', where: (id, tenantId) => ({ id, obra: { tenantId } }) },
  contratoId: { model: 'contrato', where: (id, tenantId) => ({ id, obra: { tenantId } }) },
  medicaoId: { model: 'medicao', where: (id, tenantId) => ({ id, obra: { tenantId } }) },
  inspecaoId: { model: 'inspecao', where: (id, tenantId) => ({ id, obra: { tenantId } }) },
  rdoId: { model: 'rDO', where: (id, tenantId) => ({ id, obra: { tenantId } }) },
};

export async function assertTenantRelations(data: DynamicValue, tenantId: string) {
  for (const [field, check] of Object.entries(relationChecks)) {
    const id = data[field];
    if (typeof id !== 'string' || !id) continue;
    const exists = await prismaDynamic[check.model].findFirst({
      where: check.where(id, tenantId),
      select: { id: true },
    });
    if (!exists) throw new Error(`Relação inválida ou fora do workspace: ${field}`);
  }
}

export async function tenantOwnsResource(
  resource: string,
  model: string,
  id: string,
  tenantId: string,
  userId?: string,
  role?: string
) {
  return prismaDynamic[model].findFirst({
    where: scopedWhere(resourceTenantWhere(resource, tenantId, userId, role), { id }),
    select: { id: true },
  });
}

export async function tenantOwnsObra(
  obraId: string,
  tenantId: string,
  userId?: string,
  role?: string
) {
  return prisma.obra.findFirst({
    where: {
      ...userObraWhere(role || '', tenantId, userId),
      id: obraId,
    },
    select: { id: true },
  });
}
