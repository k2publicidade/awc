import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { abacateDevMode } from '@/lib/billing';

const ABACATEPAY_PUBLIC_KEY =
  process.env.ABACATEPAY_PUBLIC_KEY ||
  't9dXRhHHo3yDEj5pVDYz0frf7q6bMKyMRmxxCPIPp3RCplBfXRxqlC6ZpiWmOqj4L63qEaeUOtrCI8P0VMUgo6iIga2ri9ogaHFs0WIIywSMg0q7RmBfybe1E5XJcfC4IW3alNqym0tXoAKkzvfEjZxV6bE0oG2zJrNNYmUCKZyV0KZ3JS8Votf9EAWWYdiDkMkpbMdPggfh1EqHlVkMiTady6jOR3hyzGEHrIz2Ret0xHKMbiqkr9HS1JhNHDX9';

type WebhookPayload = {
  id?: unknown;
  event?: unknown;
  apiVersion?: unknown;
  devMode?: unknown;
  data?: Record<string, unknown>;
};

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function stringValue(value: unknown) {
  return typeof value === 'string' && value ? value : undefined;
}

export async function POST(request: NextRequest) {
  const configuredSecret = process.env.ABACATEPAY_WEBHOOK_SECRET;
  const receivedSecret = request.nextUrl.searchParams.get('webhookSecret') || '';
  if (!configuredSecret || !safeEqual(configuredSecret, receivedSecret))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rawBody = await request.text();
  const signature = request.headers.get('x-webhook-signature') || '';
  const expected = crypto
    .createHmac('sha256', ABACATEPAY_PUBLIC_KEY)
    .update(Buffer.from(rawBody, 'utf8'))
    .digest('base64');
  if (!signature || !safeEqual(expected, signature))
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });

  let payload: WebhookPayload;
  try {
    payload = JSON.parse(rawBody) as WebhookPayload;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const eventId = stringValue(payload.id);
  const eventType = stringValue(payload.event);
  if (!eventId || !eventType || payload.apiVersion !== 2 || typeof payload.devMode !== 'boolean')
    return NextResponse.json({ error: 'Invalid event envelope' }, { status: 400 });
  if (payload.devMode !== abacateDevMode())
    return NextResponse.json({ error: 'Environment mismatch' }, { status: 400 });

  const data = record(payload.data);
  const subscription = record(data.subscription);
  const customer = record(data.customer);
  const checkout = record(data.checkout);
  const providerSubscriptionId = stringValue(subscription.id);
  const customerId = stringValue(customer.id) || stringValue(checkout.customerId);
  const providerCheckoutId = stringValue(checkout.id);
  const externalCheckoutId = stringValue(checkout.externalId);
  const items = Array.isArray(checkout.items) ? checkout.items.map(record) : [];
  const providerProductId = stringValue(items[0]?.id) || stringValue(record(data.planChange).productId);

  try {
    await prisma.$transaction(async (tx) => {
      await tx.billingWebhookEvent.create({
        data: { id: eventId, eventType, providerSubscriptionId, devMode: payload.devMode as boolean },
      });

      const localCheckout = externalCheckoutId
        ? await tx.billingCheckout.findUnique({ where: { id: externalCheckoutId } })
        : providerCheckoutId
          ? await tx.billingCheckout.findUnique({ where: { providerCheckoutId } })
          : null;
      const tenant = providerSubscriptionId
        ? await tx.tenant.findUnique({ where: { abacateSubscriptionId: providerSubscriptionId } })
        : customerId
          ? await tx.tenant.findUnique({ where: { abacateCustomerId: customerId } })
          : localCheckout
            ? await tx.tenant.findUnique({ where: { id: localCheckout.tenantId } })
            : null;
      const product = providerProductId
        ? await tx.billingProduct.findUnique({ where: { providerProductId } })
        : null;

      if (tenant) {
        if (['subscription.completed', 'subscription.renewed', 'subscription.trial_started'].includes(eventType)) {
          await tx.tenant.update({
            where: { id: tenant.id },
            data: {
              subscriptionStatus: eventType === 'subscription.trial_started' ? 'TRIAL' : 'ATIVA',
              ...(providerSubscriptionId ? { abacateSubscriptionId: providerSubscriptionId } : {}),
              ...(product ? { plan: product.plan, billingCycle: product.cycle } : {}),
            },
          });
          if (localCheckout)
            await tx.billingCheckout.update({ where: { id: localCheckout.id }, data: { status: 'COMPLETED' } });
        } else if (eventType === 'subscription.payment_failed') {
          await tx.tenant.update({ where: { id: tenant.id }, data: { subscriptionStatus: 'INADIMPLENTE' } });
        } else if (eventType === 'subscription.cancelled') {
          await tx.tenant.update({ where: { id: tenant.id }, data: { subscriptionStatus: 'CANCELADA' } });
        } else if (eventType === 'subscription.plan_changed' && product) {
          await tx.tenant.update({
            where: { id: tenant.id },
            data: { plan: product.plan, billingCycle: product.cycle },
          });
        }
        await tx.billingWebhookEvent.update({ where: { id: eventId }, data: { tenantId: tenant.id } });
      }
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')
      return NextResponse.json({ ok: true, duplicate: true });
    console.error('abacatepay webhook processing error', error);
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
