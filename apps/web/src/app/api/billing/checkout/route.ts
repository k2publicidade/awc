import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { requireSession } from '@/lib/session-context';
import { abacatePay } from '@/lib/abacatepay';
import { abacateDevMode, applicationUrl, LEGAL_VERSION } from '@/lib/billing';

const checkoutSchema = z.object({
  plan: z.enum(['STARTER', 'PRO', 'BUSINESS']),
  cycle: z.enum(['MONTHLY', 'SEMIANNUALLY', 'ANNUALLY']),
  acceptTerms: z.literal(true),
});

export async function POST(request: NextRequest) {
  const context = await requireSession(['ADMIN', 'SUPER_ADMIN']);
  if (!context) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });

  try {
    const input = checkoutSchema.parse(await request.json());
    const devMode = abacateDevMode();
    const [tenant, user, product] = await Promise.all([
      prisma.tenant.findUnique({ where: { id: context.tenantId } }),
      prisma.user.findUnique({ where: { id: context.userId }, select: { name: true, email: true } }),
      prisma.billingProduct.findUnique({
        where: { plan_cycle_devMode: { plan: input.plan, cycle: input.cycle, devMode } },
      }),
    ]);
    if (!tenant || !user) return NextResponse.json({ error: 'Conta não encontrada' }, { status: 404 });
    if (!product?.active)
      return NextResponse.json(
        { error: 'Este plano ainda não foi publicado no catálogo de cobrança.' },
        { status: 503 }
      );

    const acceptedAt = new Date();
    await prisma.user.update({
      where: { id: context.userId },
      data: {
        termsAcceptedAt: acceptedAt,
        termsVersion: LEGAL_VERSION,
        privacyAcceptedAt: acceptedAt,
        privacyVersion: LEGAL_VERSION,
      },
    });

    if (tenant.abacateSubscriptionId && tenant.subscriptionStatus === 'ATIVA') {
      await abacatePay.changeSubscriptionPlan(tenant.abacateSubscriptionId, product.providerProductId);
      await prisma.auditLog.create({
        data: {
          actorId: context.userId,
          tenantId: tenant.id,
          action: 'billing.plan_change_requested',
          targetType: 'Tenant',
          targetId: tenant.id,
          metadata: { plan: input.plan, cycle: input.cycle },
        },
      });
      return NextResponse.json({ scheduled: true });
    }

    let customerId = tenant.abacateCustomerId;
    if (!customerId) {
      const customer = await abacatePay.createCustomer({
        email: tenant.billingEmail || user.email,
        name: tenant.name || user.name,
        ...(tenant.phone ? { cellphone: tenant.phone } : {}),
        ...(tenant.document ? { taxId: tenant.document } : {}),
        metadata: { tenantId: tenant.id },
      });
      customerId = customer.id;
      await prisma.tenant.update({ where: { id: tenant.id }, data: { abacateCustomerId: customerId } });
    }

    const reusable = await prisma.billingCheckout.findFirst({
      where: {
        tenantId: tenant.id,
        plan: input.plan,
        cycle: input.cycle,
        status: 'PENDING',
        createdAt: { gte: new Date(Date.now() - 15 * 60_000) },
        checkoutUrl: { not: null },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (reusable?.checkoutUrl) return NextResponse.json({ url: reusable.checkoutUrl, reused: true });

    const localCheckout = await prisma.billingCheckout.create({
      data: { tenantId: tenant.id, plan: input.plan, cycle: input.cycle },
    });
    const baseUrl = applicationUrl();
    const checkout = await abacatePay.createSubscriptionCheckout({
      items: [{ id: product.providerProductId, quantity: 1 }],
      customerId,
      methods: ['CARD'],
      externalId: localCheckout.id,
      returnUrl: `${baseUrl}/empresa`,
      completionUrl: `${baseUrl}/empresa?checkout=sucesso`,
      metadata: { tenantId: tenant.id, plan: input.plan, cycle: input.cycle },
      retryPolicy: { maxRetry: 3, retryEvery: 2 },
    });
    await prisma.billingCheckout.update({
      where: { id: localCheckout.id },
      data: { providerCheckoutId: checkout.id, checkoutUrl: checkout.url },
    });
    return NextResponse.json({ url: checkout.url });
  } catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json({ error: 'Selecione o plano, o ciclo e aceite os termos.' }, { status: 400 });
    console.error('abacatepay checkout error', error);
    return NextResponse.json({ error: 'Não foi possível iniciar o checkout.' }, { status: 502 });
  }
}
