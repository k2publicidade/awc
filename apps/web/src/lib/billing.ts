import { SAAS_PLANS, type SaasPlan } from '@/lib/saas';

export const BILLING_CYCLES = {
  MONTHLY: { label: 'Mensal', months: 1, discount: 0 },
  SEMIANNUALLY: { label: 'Semestral', months: 6, discount: 0.05 },
  ANNUALLY: { label: 'Anual', months: 12, discount: 0.15 },
} as const;

export type BillingCycle = keyof typeof BILLING_CYCLES;

export const LEGAL_VERSION = '2026-08-12';

export function billingPriceCents(plan: SaasPlan, cycle: BillingCycle) {
  const config = BILLING_CYCLES[cycle];
  return Math.round(SAAS_PLANS[plan].price * config.months * (1 - config.discount) * 100);
}

export function billingExternalId(plan: SaasPlan, cycle: BillingCycle) {
  return `rigor-${plan.toLowerCase()}-${cycle.toLowerCase()}-v1`;
}

export function applicationUrl() {
  const configured = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL;
  return (configured || 'http://localhost:3000').replace(/\/$/, '');
}

export function abacateDevMode() {
  if (process.env.ABACATEPAY_DEV_MODE === 'true') return true;
  if (process.env.ABACATEPAY_DEV_MODE === 'false') return false;
  return process.env.NODE_ENV !== 'production';
}
