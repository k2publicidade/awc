import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { resourceConfig } from '@/lib/crud-config';
import { friendlyError } from '@/lib/crud-errors';
import { requireSession } from '@/lib/session-context';
import {
  assertTenantRelations,
  canAccessResource,
  tenantOwnsResource,
} from '@/lib/authorization';
import { isManagedUploadUrl } from '@/lib/storage';
import {
  deleteContratoCascade,
  deleteEquipeCascade,
  deleteEtapaCascade,
  deleteInspecaoCascade,
  deleteMedicaoCascade,
  deleteObraCascade,
  deleteOrcamentoCascade,
  deleteRdoCascade,
} from '@/lib/cascade-delete';

const prismaAny = prisma as DynamicValue;

function delegate(model: string) {
  const d = prismaAny[model];
  if (!d) throw new Error(`Modelo Prisma não encontrado: ${model}`);
  return d;
}

async function cleanData(resourceKey: string, raw: DynamicValue, tenantId: string) {
  const cfg = resourceConfig[resourceKey];
  const data: DynamicValue = {};
  for (const field of cfg.fields) {
    if (!(field.name in raw)) continue;
    const value = raw[field.name];
    if (value === '' || value === undefined) {
      if (field.relation) continue;
      data[field.name] = null;
      continue;
    }
    if (field.type === 'file') {
      if (!isManagedUploadUrl(value, tenantId)) throw new Error('Envie o arquivo pelo seletor do sistema');
      data[field.name] = value;
    }
    else if (field.type === 'number' || field.type === 'currency') data[field.name] = Number(value) || 0;
    else if (field.type === 'date') data[field.name] = value ? new Date(value) : null;
    else if (field.type === 'boolean')
      data[field.name] = value === true || value === 'true' || value === 'on';
    else data[field.name] = value;
  }
  return data;
}

function serialize(row: DynamicValue) {
  return JSON.parse(
    JSON.stringify(row, (_key, value) => (typeof value === 'bigint' ? value.toString() : value))
  );
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ resource: string; id: string }> }
) {
  try {
    const { resource, id } = await params;
    const cfg = resourceConfig[resource];
    if (!cfg) return NextResponse.json({ error: 'Recurso inválido' }, { status: 404 });
    const ctx = await requireSession();
    if (!ctx) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    if (!canAccessResource(ctx.role, resource))
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    const owned = await tenantOwnsResource(
      resource, cfg.model, id, ctx.tenantId, ctx.userId, ctx.role
    );
    if (!owned) return NextResponse.json({ error: 'Registro não encontrado' }, { status: 404 });
    const row = await delegate(cfg.model).findUnique({
      where: { id },
      include: cfg.include as DynamicValue,
    });
    return NextResponse.json(serialize(row));
  } catch (error: DynamicValue) {
    return NextResponse.json({ error: error.message || 'Erro ao buscar' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ resource: string; id: string }> }
) {
  try {
    const { resource, id } = await params;
    const cfg = resourceConfig[resource];
    if (!cfg) return NextResponse.json({ error: 'Recurso inválido' }, { status: 404 });
    const ctx = await requireSession();
    if (!ctx) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    if (!canAccessResource(ctx.role, resource, true))
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    const owned = await tenantOwnsResource(
      resource, cfg.model, id, ctx.tenantId, ctx.userId, ctx.role
    );
    if (!owned) return NextResponse.json({ error: 'Registro não encontrado' }, { status: 404 });
    const raw = await req.json();
    const data = await cleanData(resource, raw, ctx.tenantId);
    await assertTenantRelations(data, ctx.tenantId);
    const updated = await delegate(cfg.model).update({ where: { id }, data });
    return NextResponse.json(serialize(updated));
  } catch (error: DynamicValue) {
    return NextResponse.json({ error: friendlyError(error, 'Erro ao atualizar') }, { status: 400 });
  }
}

export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<{ resource: string; id: string }> }
) {
  return PATCH(req, ctx);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ resource: string; id: string }> }
) {
  try {
    const { resource, id } = await params;
    const cfg = resourceConfig[resource];
    if (!cfg) return NextResponse.json({ error: 'Recurso inválido' }, { status: 404 });
    const ctx = await requireSession();
    if (!ctx) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    if (!canAccessResource(ctx.role, resource, true))
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    const owned = await tenantOwnsResource(
      resource, cfg.model, id, ctx.tenantId, ctx.userId, ctx.role
    );
    if (!owned) return NextResponse.json({ error: 'Registro não encontrado' }, { status: 404 });

    // Exclusões com relacionamentos em cascata atômica
    if (resource === 'obras') {
      await deleteObraCascade(id, ctx.tenantId);
      return NextResponse.json({ ok: true, deleted: true });
    }
    if (resource === 'etapas') {
      await deleteEtapaCascade(id);
      return NextResponse.json({ ok: true, deleted: true });
    }
    if (resource === 'rdos') {
      await deleteRdoCascade(id);
      return NextResponse.json({ ok: true, deleted: true });
    }
    if (resource === 'orcamentos') {
      await deleteOrcamentoCascade(id);
      return NextResponse.json({ ok: true, deleted: true });
    }
    if (resource === 'medicoes') {
      await deleteMedicaoCascade(id);
      return NextResponse.json({ ok: true, deleted: true });
    }
    if (resource === 'inspecoes') {
      await deleteInspecaoCascade(id);
      return NextResponse.json({ ok: true, deleted: true });
    }
    if (resource === 'contratos') {
      await deleteContratoCascade(id);
      return NextResponse.json({ ok: true, deleted: true });
    }
    if (resource === 'equipes') {
      await deleteEquipeCascade(id);
      return NextResponse.json({ ok: true, deleted: true });
    }

    try {
      await delegate(cfg.model).delete({ where: { id } });
      return NextResponse.json({ ok: true, deleted: true });
    } catch (e) {
      if (resource === 'equipe' || resource === 'fornecedores') {
        const row = await delegate(cfg.model).update({ where: { id }, data: { isActive: false } });
        return NextResponse.json({ ok: true, archived: true, row: serialize(row) });
      }
      throw e;
    }
  } catch (error: DynamicValue) {
    return NextResponse.json({ error: friendlyError(error, 'Erro ao excluir') }, { status: 400 });
  }
}
