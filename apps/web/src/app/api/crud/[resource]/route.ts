import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { resourceConfig } from '@/lib/crud-config';
import { friendlyError } from '@/lib/crud-errors';
import { isManagedUploadUrl } from '@/lib/storage';
import { requireSession } from '@/lib/session-context';
import {
  assertTenantRelations,
  canAccessResource,
  resourceTenantWhere,
  scopedWhere,
} from '@/lib/authorization';

const prismaAny = prisma as DynamicValue;

function delegate(model: string) {
  const d = prismaAny[model];
  if (!d) throw new Error(`Modelo Prisma não encontrado: ${model}`);
  return d;
}

async function firstId(model: string, where?: DynamicValue) {
  const d = delegate(model);
  const row = await d
    .findFirst({ where, orderBy: { createdAt: 'asc' } })
    .catch(() => d.findFirst({ where }));
  return row?.id;
}

async function addDefaults(
  resourceKey: string,
  data: DynamicValue,
  opts: { tenantId: string; userId: string }
) {
  const { tenantId, userId } = opts;
  const userObraWhere = tenantId
    ? {
        tenantId,
        OR: [
          { engenheiroId: userId },
          { clienteId: userId },
        ],
      }
    : undefined;
  const obraId = data.obraId || (await firstId('obra', userObraWhere));
  if (
    ['obras', 'materiais', 'equipe', 'equipes', 'fornecedores', 'notificacoes'].includes(
      resourceKey
    ) &&
    tenantId
  )
    data.tenantId = data.tenantId || tenantId;
  if (resourceKey === 'obras') {
    data.nome ||= 'Nova obra';
    data.codigo ||= `OBR-${Date.now()}`;
    data.tipo ||= 'GALPAO';
    data.status ||= 'PLANEJAMENTO';
    data.engenheiroId ||= userId;
  }
  if (resourceKey === 'etapas') {
    data.obraId ||= obraId;
    data.nome ||= 'Nova etapa';
    data.percentualPrevisto ??= 0;
    data.percentualRealizado ??= 0;
    data.valorFinanceiro ??= 0;
    data.ordem ??= 1;
  }
  if (resourceKey === 'rdos') {
    data.obraId ||= obraId;
    data.responsavelId ||= userId;
    data.data ||= new Date();
    data.numero ||= Math.floor(Date.now() / 1000) % 100000;
    data.status ||= 'RASCUNHO';
  }
  if (resourceKey === 'financeiro') {
    data.obraId ||= obraId;
    data.tipo ||= 'DESPESA';
    data.descricao ||= 'Novo lançamento';
    data.valor ??= 0;
    data.dataVencimento ||= new Date();
    data.status ||= 'ABERTO';
    data.createdBy ||= userId;
  }
  if (resourceKey === 'medicoes') {
    data.obraId ||= obraId;
    data.numero ||= Math.floor(Date.now() / 1000) % 100000;
    data.periodoInicio ||= new Date();
    data.periodoFim ||= new Date();
    data.valorTotal ??= 0;
    data.status ||= 'EM_ELABORACAO';
    data.createdBy ||= userId;
  }
  if (resourceKey === 'materiais') {
    data.codigo ||= `MAT-${Date.now()}`;
    data.descricao ||= 'Novo material';
    data.unidade ||= 'un';
    data.estoqueMinimo ??= 0;
    data.precoMedio ??= 0;
  }
  if (resourceKey === 'estoqueMovimentos') {
    data.obraId ||= obraId;
    data.materialId ||= await firstId('material', tenantId ? { tenantId } : undefined);
    data.tipo ||= 'ENTRADA';
    data.quantidade ??= 0;
    data.precoUnitario ??= 0;
    data.data ||= new Date();
    data.responsavelId ||= userId;
  }
  if (resourceKey === 'requisicoes') {
    data.obraId ||= obraId;
    data.materialId ||= await firstId('material', tenantId ? { tenantId } : undefined);
    data.solicitanteId ||= userId;
    data.quantidade ??= 1;
    data.status ||= 'PENDENTE';
    data.dataSolicitacao ||= new Date();
  }
  if (resourceKey === 'fornecedores') {
    data.razaoSocial ||= 'Novo fornecedor';
    data.cnpj ||= `${Date.now()}`.slice(-14);
    data.isActive ??= true;
  }
  if (resourceKey === 'equipe') {
    data.nome ||= 'Novo trabalhador';
    data.cpf ||= `${Date.now()}`.slice(-11);
    data.funcao ||= 'Operador';
    data.vinculo ||= 'CLT';
    data.isActive ??= true;
  }
  if (resourceKey === 'equipes') {
    data.obraId ||= obraId;
    data.nome ||= 'Nova equipe';
    data.status ||= 'ATIVA';
  }
  if (resourceKey === 'equipeMembros') {
    data.equipeId ||= await firstId('equipeObra', tenantId ? { tenantId } : undefined);
    data.trabalhadorId ||= await firstId('trabalhador', tenantId ? { tenantId } : undefined);
    data.dataEntrada ||= new Date();
    data.ativo ??= true;
  }
  if (resourceKey === 'presencas') {
    data.obraId ||= obraId;
    data.trabalhadorId ||= await firstId('trabalhador', tenantId ? { tenantId } : undefined);
    data.data ||= new Date();
    data.presente ??= true;
    data.horasTrabalhadas ??= 8;
    data.horasExtras ??= 0;
  }
  if (resourceKey === 'epis') {
    data.trabalhadorId ||= await firstId('trabalhador', tenantId ? { tenantId } : undefined);
    data.tipo ||= 'Capacete';
    data.descricao ||= 'EPI';
    data.quantidade ??= 1;
    data.dataEntrega ||= new Date();
  }
  if (resourceKey === 'treinamentos') {
    data.trabalhadorId ||= await firstId('trabalhador', tenantId ? { tenantId } : undefined);
    data.nr ||= 'NR_18';
    data.descricao ||= 'Treinamento';
    data.dataRealizacao ||= new Date();
  }
  if (resourceKey === 'documentos') {
    data.obraId ||= obraId;
    data.nome ||= 'Novo documento';
    data.categoria ||= 'OUTRO';
    data.status ||= 'PENDENTE';
    data.createdBy ||= userId;
  }
  if (resourceKey === 'qualidade') {
    data.obraId ||= obraId;
    data.descricao ||= 'Nova não conformidade';
    data.severidade ||= 'MEDIO';
    data.status ||= 'ABERTA';
    data.responsavelId ||= userId;
  }
  if (resourceKey === 'inspecoes') {
    data.obraId ||= obraId;
    data.etapaId ||= await firstId('etapa', obraId ? { obraId } : undefined);
    data.tipo ||= 'ESTRUTURA';
    data.responsavelId ||= userId;
    data.data ||= new Date();
    data.resultado ||= 'CONFORME';
  }
  if (resourceKey === 'seguranca') {
    data.obraId ||= obraId;
    data.tema ||= 'Novo DDS';
    data.responsavelId ||= userId;
    data.data ||= new Date();
  }
  if (resourceKey === 'acidentes') {
    data.obraId ||= obraId;
    data.tipo ||= 'INCIDENTE';
    data.dataHora ||= new Date();
    data.descricao ||= 'Novo incidente';
    data.catAberto ??= false;
  }
  if (resourceKey === 'galeria') {
    data.obraId ||= obraId;
    data.data ||= new Date();
  }
  if (resourceKey === 'orcamentos') {
    data.obraId ||= obraId;
    data.status ||= 'EM_ELABORACAO';
    data.valorTotal ??= 0;
    data.versao ||= 1;
    data.bdi ??= 30;
    data.encargosSociais ??= 38.5;
    data.createdBy ||= userId;
  }
  if (resourceKey === 'contratos') {
    data.obraId ||= obraId;
    data.fornecedorId ||= await firstId('fornecedor', tenantId ? { tenantId } : undefined);
    data.numero ||= `CTR-${Date.now()}`;
    data.objeto ||= 'Novo contrato';
    data.tipo ||= 'SERVICO';
    data.valor ??= 0;
    data.valorAditivo ??= 0;
    data.dataInicio ||= new Date();
    data.dataFim ||= new Date(Date.now() + 86400000 * 30);
    data.status ||= 'EM_NEGOCIACAO';
    data.createdBy ||= userId;
  }
  if (resourceKey === 'ocorrencias') {
    data.obraId ||= obraId;
    data.tipo ||= 'OUTRO';
    data.descricao ||= 'Nova ocorrência';
    data.status ||= 'ABERTO';
    data.responsavelAberturaId ||= userId;
  }
  if (resourceKey === 'notificacoes') {
    data.userId ||= userId;
    data.tipo ||= 'INFO';
    data.titulo ||= 'Nova notificação';
    data.mensagem ||= 'Mensagem';
    data.canal ||= 'IN_APP';
    data.lida ??= false;
    if (tenantId) data.tenantId ||= tenantId;
  }
}

async function cleanData(
  resourceKey: string,
  raw: DynamicValue,
  opts: { tenantId: string; userId: string; isUpdate?: boolean }
) {
  const cfg = resourceConfig[resourceKey];
  const data: DynamicValue = {};
  for (const field of cfg.fields) {
    if (!(field.name in raw)) continue;
    const value = raw[field.name];
    if (value === '' || value === undefined) {
      if (field.relation || !opts.isUpdate) continue;
      data[field.name] = null;
      continue;
    }
    if (field.type === 'file') {
      if (!isManagedUploadUrl(value, opts.tenantId)) throw new Error('Envie o arquivo pelo seletor do sistema');
      data[field.name] = value;
    }
    else if (field.type === 'number' || field.type === 'currency') data[field.name] = Number(value) || 0;
    else if (field.type === 'date') data[field.name] = value ? new Date(value) : null;
    else if (field.type === 'boolean')
      data[field.name] = value === true || value === 'true' || value === 'on';
    else data[field.name] = value;
  }
  if (!opts.isUpdate) await addDefaults(resourceKey, data, opts);
  return data;
}

function serialize(row: DynamicValue) {
  return JSON.parse(
    JSON.stringify(row, (_key, value) => (typeof value === 'bigint' ? value.toString() : value))
  );
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ resource: string }> }) {
  try {
    const { resource } = await params;
    const cfg = resourceConfig[resource];
    if (!cfg) return NextResponse.json({ error: 'Recurso inválido' }, { status: 404 });
    const ctx = await requireSession();
    if (!ctx) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    if (!canAccessResource(ctx.role, resource))
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    const { tenantId } = ctx;
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const filters: DynamicValue = {};
    if (search && cfg.searchFields.length)
      filters.OR = cfg.searchFields.map((f) => ({ [f]: { contains: search, mode: 'insensitive' } }));
    for (const field of cfg.fields) {
      const value = searchParams.get(field.name);
      if (!value || value === 'all') continue;
      if (field.type === 'boolean') filters[field.name] = value === 'true';
      else if (field.type === 'number' || field.type === 'currency')
        filters[field.name] = Number(value);
      else filters[field.name] = value;
    }
    const where = scopedWhere(
      resourceTenantWhere(resource, tenantId, ctx.userId, ctx.role),
      filters
    );
    const page = Number(searchParams.get('page'));
    if (Number.isInteger(page) && page > 0) {
      const pageSize = Math.min(Math.max(Number(searchParams.get('pageSize')) || 25, 1), 100);
      const d = delegate(cfg.model);
      const hasField = (n: string) => cfg.fields.some((f) => f.name === n);
      const statusField = hasField('status')
        ? 'status'
        : hasField('resultado')
          ? 'resultado'
          : null;
      const sumField = ['valor', 'valorTotal', 'precoMedio'].find(hasField) || null;
      const [rows, total, groups, sumAgg, activeCount] = await Promise.all([
        d.findMany({
          where,
          include: cfg.include as DynamicValue,
          orderBy: cfg.orderBy as DynamicValue,
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        d.count({ where }),
        statusField
          ? d.groupBy({ by: [statusField], where, _count: { _all: true } })
          : Promise.resolve(null),
        sumField ? d.aggregate({ where, _sum: { [sumField]: true } }) : Promise.resolve(null),
        hasField('isActive')
          ? d.count({ where: { ...where, isActive: true } })
          : Promise.resolve(null),
      ]);
      const statusCounts: Record<string, number> = {};
      for (const g of groups || []) statusCounts[String(g[statusField!])] = g._count._all;
      const stats = { sum: Number(sumAgg?._sum?.[sumField!] ?? 0), statusCounts, activeCount };
      return NextResponse.json({
        rows: serialize(rows),
        total,
        page,
        pageSize,
        stats,
        config: cfg,
      });
    }
    const rows = await delegate(cfg.model).findMany({
      where,
      include: cfg.include as DynamicValue,
      orderBy: cfg.orderBy as DynamicValue,
      take: 500,
    });
    return NextResponse.json({ rows: serialize(rows), total: rows.length, config: cfg });
  } catch (error: DynamicValue) {
    return NextResponse.json({ error: error.message || 'Erro ao listar' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ resource: string }> }
) {
  try {
    const { resource } = await params;
    const cfg = resourceConfig[resource];
    if (!cfg) return NextResponse.json({ error: 'Recurso inválido' }, { status: 404 });
    const ctx = await requireSession();
    if (!ctx) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    if (!canAccessResource(ctx.role, resource, true))
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    const raw = await req.json().catch(() => ({}));
    const data = await cleanData(resource, raw, ctx);
    await assertTenantRelations(data, ctx.tenantId);
    const created = await delegate(cfg.model).create({ data });
    return NextResponse.json(serialize(created), { status: 201 });
  } catch (error: DynamicValue) {
    return NextResponse.json({ error: friendlyError(error, 'Erro ao criar') }, { status: 400 });
  }
}
