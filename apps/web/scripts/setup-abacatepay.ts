import { loadEnvConfig } from '@next/env';
import { AbacatePay } from '@abacatepay/sdk';
import { PrismaClient, type CicloCobranca, type PlanoSaas } from '@prisma/client';

loadEnvConfig(process.cwd());

const apiKey = process.env.ABACATEPAY_API_KEY;
if (!apiKey) throw new Error('Defina ABACATEPAY_API_KEY antes de executar o provisionamento.');

const appUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || '').replace(/\/$/, '');
const devMode = process.env.ABACATEPAY_DEV_MODE !== 'false';
const webhookSecret = process.env.ABACATEPAY_WEBHOOK_SECRET;
if (!webhookSecret) throw new Error('Defina ABACATEPAY_WEBHOOK_SECRET antes do provisionamento.');
const prisma = new PrismaClient();
const api = AbacatePay({ secret: apiKey });

const plans: Array<{ plan: PlanoSaas; name: string; monthly: number }> = [
  { plan: 'STARTER', name: 'RIGOR Essencial', monthly: 24900 },
  { plan: 'PRO', name: 'RIGOR Profissional', monthly: 59900 },
  { plan: 'BUSINESS', name: 'RIGOR Empresarial', monthly: 129000 },
];
const cycles: Array<{ cycle: CicloCobranca; months: number; discount: number }> = [
  { cycle: 'MONTHLY', months: 1, discount: 0 },
  { cycle: 'SEMIANNUALLY', months: 6, discount: 0.05 },
  { cycle: 'ANNUALLY', months: 12, discount: 0.15 },
];

type ApiResponse<T> = { success: boolean; error: string | null; data: T | null };
type Product = { id: string; externalId: string; devMode: boolean };
type Webhook = { id: string; name: string; endpoint: string };

async function getProduct(externalId: string) {
  const response = await api.rest.get<ApiResponse<Product>>('/products/get', { query: { externalId } });
  return response.success ? response.data : null;
}

async function createProduct(body: Record<string, unknown>) {
  const response = await api.rest.post<ApiResponse<Product>>('/products/create', { body });
  if (!response.success || !response.data) throw new Error(response.error || 'Falha ao criar produto');
  return response.data;
}

async function main() {
  for (const plan of plans) {
    for (const cycle of cycles) {
      const externalId = `rigor-${plan.plan.toLowerCase()}-${cycle.cycle.toLowerCase()}-v1`;
      const priceCents = Math.round(plan.monthly * cycle.months * (1 - cycle.discount));
      const product = (await getProduct(externalId)) || (await createProduct({
        externalId,
        name: `${plan.name} · ${cycle.cycle}`,
        description: `Licença recorrente ${cycle.cycle.toLowerCase()} da plataforma RIGOR`,
        price: priceCents,
        currency: 'BRL',
        cycle: cycle.cycle,
      }));
      if (product.devMode !== devMode) throw new Error(`Ambiente divergente para ${externalId}`);
      await prisma.billingProduct.upsert({
        where: { plan_cycle_devMode: { plan: plan.plan, cycle: cycle.cycle, devMode } },
        create: { providerProductId: product.id, externalId, plan: plan.plan, cycle: cycle.cycle, priceCents, devMode },
        update: { providerProductId: product.id, externalId, priceCents, active: true },
      });
      console.log(`Produto sincronizado: ${externalId}`);
    }
  }

  if (!appUrl.startsWith('https://')) {
    console.log('Webhook não criado: NEXT_PUBLIC_APP_URL precisa ser HTTPS.');
    return;
  }
  const endpoint = `${appUrl}/api/webhooks/abacatepay`;
  const list = await api.rest.get<ApiResponse<Webhook[]>>('/webhooks/list', { query: { search: 'RIGOR SaaS v2' } });
  const existing = list.data?.find((item) => item.name === 'RIGOR SaaS v2' && item.endpoint.startsWith(endpoint));
  if (!existing) {
    const created = await api.rest.post<ApiResponse<Webhook>>('/webhooks/create', {
      body: {
        name: 'RIGOR SaaS v2', endpoint, secret: webhookSecret,
        events: ['subscription.trial_started', 'subscription.completed', 'subscription.renewed', 'subscription.payment_failed', 'subscription.cancelled', 'subscription.plan_changed'],
      },
    });
    if (!created.success) throw new Error(created.error || 'Falha ao criar webhook');
    console.log('Webhook RIGOR SaaS v2 criado.');
  } else console.log('Webhook RIGOR SaaS v2 já existe.');
}

main().finally(() => prisma.$disconnect());
