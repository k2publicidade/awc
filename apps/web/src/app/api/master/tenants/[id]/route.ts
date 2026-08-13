import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireMasterSession, writeMasterAudit } from '@/lib/master-auth';
import { getMasterTenant } from '@/lib/master-data';
import { updateTenantSchema, validationMessage } from '@/lib/master-validation';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const context = await requireMasterSession();
  if (!context) return NextResponse.json({ error: 'Acesso exclusivo do MASTER ADMIN' }, { status: 403 });
  const tenant = await getMasterTenant((await params).id);
  if (!tenant) return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 });
  return NextResponse.json(tenant);
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const context = await requireMasterSession();
  if (!context) return NextResponse.json({ error: 'Acesso exclusivo do MASTER ADMIN' }, { status: 403 });
  const tenantId = (await params).id;
  const current = await prisma.tenant.findFirst({
    where: { id: tenantId, isInternal: false },
    select: { id: true, name: true, isActive: true, plan: true, subscriptionStatus: true },
  });
  if (!current) return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 });

  const parsed = updateTenantSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: validationMessage(parsed.error) }, { status: 400 });
  }
  if (Object.keys(parsed.data).length === 0) {
    return NextResponse.json({ error: 'Nenhuma alteração enviada' }, { status: 400 });
  }

  const nextData = {
    ...parsed.data,
    billingEmail: parsed.data.billingEmail?.toLowerCase() ?? parsed.data.billingEmail,
    trialEndsAt:
      parsed.data.trialEndsAt === undefined
        ? undefined
        : parsed.data.trialEndsAt
          ? new Date(parsed.data.trialEndsAt)
          : null,
  };
  const updated = await prisma.tenant.update({ where: { id: tenantId }, data: nextData });
  await writeMasterAudit(request, context.userId, {
    tenantId,
    action: 'TENANT_UPDATED',
    targetType: 'Tenant',
    targetId: tenantId,
    metadata: {
      changedFields: Object.keys(parsed.data),
      previousStatus: current.subscriptionStatus,
      previousPlan: current.plan,
      previousActive: current.isActive,
    },
  }).catch((error) => console.error('Falha ao gravar auditoria', error));
  return NextResponse.json(updated);
}
