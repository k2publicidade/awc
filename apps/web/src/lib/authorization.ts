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
  if (resource === 'notificacoes') {
    return ['ADMIN', 'SUPER_ADMIN'].includes(role || '') ? { tenantId } : { tenantId, userId };
  }
  if (['obras', 'materiais', 'equipe', 'equipes', 'fornecedores', 'notificacoes'].includes(resource)) {
    return { tenantId };
  }
  if (resource === 'equipeMembros') return { equipe: { tenantId } };
  if (['epis', 'treinamentos'].includes(resource)) return { trabalhador: { tenantId } };
  return { obra: { tenantId } };
}

export function scopedWhere(scope: DynamicValue, where: DynamicValue = {}) {
  return Object.keys(where).length ? { AND: [scope, where] } : scope;
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

export async function tenantOwnsObra(obraId: string, tenantId: string) {
  return prisma.obra.findFirst({ where: { id: obraId, tenantId }, select: { id: true } });
}
