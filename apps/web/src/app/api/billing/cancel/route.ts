import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireSession } from '@/lib/session-context';
import { abacatePay } from '@/lib/abacatepay';

export async function POST() {
  const context = await requireSession(['ADMIN', 'SUPER_ADMIN']);
  if (!context) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
  const tenant = await prisma.tenant.findUnique({ where: { id: context.tenantId } });
  if (!tenant?.abacateSubscriptionId)
    return NextResponse.json({ error: 'Assinatura ativa não encontrada.' }, { status: 404 });
  try {
    await abacatePay.cancelSubscription(tenant.abacateSubscriptionId);
    await prisma.auditLog.create({
      data: {
        actorId: context.userId,
        tenantId: tenant.id,
        action: 'billing.cancellation_requested',
        targetType: 'Tenant',
        targetId: tenant.id,
      },
    });
    return NextResponse.json({ cancelled: true });
  } catch (error) {
    console.error('abacatepay cancellation error', error);
    return NextResponse.json({ error: 'Não foi possível cancelar a assinatura.' }, { status: 502 });
  }
}
