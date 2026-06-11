import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { resourceConfig } from "@/lib/crud-config";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { friendlyError } from "@/lib/crud-errors";

const prismaAny = prisma as any;

async function context() {
  const session = await getServerSession(authOptions);
  let userId = (session?.user as any)?.id as string | undefined;
  let tenantId = (session?.user as any)?.tenantId as string | undefined;
  if (!tenantId) tenantId = (await prisma.tenant.findFirst({ orderBy: { createdAt: "asc" } }))?.id;
  if (!userId) {
    const user = await prisma.user.findFirst({ where: tenantId ? { tenantId } : undefined, orderBy: { createdAt: "asc" } });
    userId = user?.id;
    tenantId = tenantId || user?.tenantId;
  }
  return { session, userId, tenantId };
}

function delegate(model: string) {
  const d = prismaAny[model];
  if (!d) throw new Error(`Modelo Prisma não encontrado: ${model}`);
  return d;
}

async function cleanData(resourceKey: string, raw: any) {
  const cfg = resourceConfig[resourceKey];
  const data: any = {};
  for (const field of cfg.fields) {
    if (!(field.name in raw)) continue;
    const value = raw[field.name];
    if (value === "" || value === undefined) {
      if (field.relation) continue;
      data[field.name] = null;
      continue;
    }
    if (field.type === "number" || field.type === "currency") data[field.name] = Number(value) || 0;
    else if (field.type === "date") data[field.name] = value ? new Date(value) : null;
    else if (field.type === "boolean") data[field.name] = value === true || value === "true" || value === "on";
    else data[field.name] = value;
  }
  return data;
}

function serialize(row: any) {
  return JSON.parse(JSON.stringify(row, (_key, value) => typeof value === "bigint" ? value.toString() : value));
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ resource: string; id: string }> }) {
  try {
    const { resource, id } = await params;
    const cfg = resourceConfig[resource];
    if (!cfg) return NextResponse.json({ error: "Recurso inválido" }, { status: 404 });
    const row = await delegate(cfg.model).findUnique({ where: { id }, include: cfg.include as any });
    return NextResponse.json(serialize(row));
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Erro ao buscar" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ resource: string; id: string }> }) {
  try {
    const { resource, id } = await params;
    const cfg = resourceConfig[resource];
    if (!cfg) return NextResponse.json({ error: "Recurso inválido" }, { status: 404 });
    await context();
    const raw = await req.json();
    const data = await cleanData(resource, raw);
    const updated = await delegate(cfg.model).update({ where: { id }, data });
    return NextResponse.json(serialize(updated));
  } catch (error: any) {
    return NextResponse.json({ error: friendlyError(error, "Erro ao atualizar") }, { status: 400 });
  }
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ resource: string; id: string }> }) {
  return PATCH(req, ctx);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ resource: string; id: string }> }) {
  try {
    const { resource, id } = await params;
    const cfg = resourceConfig[resource];
    if (!cfg) return NextResponse.json({ error: "Recurso inválido" }, { status: 404 });
    try {
      await delegate(cfg.model).delete({ where: { id } });
      return NextResponse.json({ ok: true, deleted: true });
    } catch (e) {
      if (resource === "obras") {
        const row = await delegate(cfg.model).update({ where: { id }, data: { status: "CANCELADO" } });
        return NextResponse.json({ ok: true, archived: true, row: serialize(row) });
      }
      if (resource === "equipe" || resource === "fornecedores") {
        const row = await delegate(cfg.model).update({ where: { id }, data: { isActive: false } });
        return NextResponse.json({ ok: true, archived: true, row: serialize(row) });
      }
      throw e;
    }
  } catch (error: any) {
    return NextResponse.json({ error: friendlyError(error, "Erro ao excluir") }, { status: 400 });
  }
}
