import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireSession } from '@/lib/session-context';
import { SAAS_PLANS } from '@/lib/saas';

export async function GET() {
  const context = await requireSession(['ADMIN', 'SUPER_ADMIN']);
  if (!context) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  const tenant = await prisma.tenant.findUnique({
    where: { id: context.tenantId },
    include: { _count: { select: { users: true, obras: true } } },
  });
  if (!tenant) return NextResponse.json({ error: 'Workspace não encontrado' }, { status: 404 });
  return NextResponse.json({ ...tenant, planDetails: SAAS_PLANS[tenant.plan] });
}

export async function PATCH(request: NextRequest) {
  const context = await requireSession(['ADMIN', 'SUPER_ADMIN']);
  if (!context) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
  const body = await request.json();
  const data: Record<string, DynamicValue> = {};
  if (typeof body.name === 'string' && body.name.trim().length >= 2) data.name = body.name.trim();
  if (typeof body.phone === 'string') data.phone = body.phone.trim() || null;
  if (typeof body.document === 'string') data.document = body.document.trim() || null;
  if (typeof body.billingEmail === 'string' && body.billingEmail.includes('@'))
    data.billingEmail = body.billingEmail.trim().toLowerCase();
  if (typeof body.primaryColor === 'string' && /^#[0-9a-f]{6}$/i.test(body.primaryColor))
    data.primaryColor = body.primaryColor;
  if (body.onboardingCompleted === true) data.onboardingCompleted = true;
  // Plan and subscription status are billing-controlled fields. They must only
  // be changed by a verified payment webhook, never by a workspace admin.
  if (body.plan !== undefined || body.subscriptionStatus !== undefined)
    return NextResponse.json({ error: 'Plano é gerenciado pelo faturamento' }, { status: 403 });
  const tenant = await prisma.tenant.update({ where: { id: context.tenantId }, data });
  return NextResponse.json(tenant);
}
