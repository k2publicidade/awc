import 'server-only';
import { AbacatePay } from '@abacatepay/sdk';

type ApiResult<T> = { data: T | null; error: string | null; success: boolean };

export type AbacateCustomer = { id: string; email: string };
export type AbacateCheckout = { id: string; url: string; externalId?: string | null };
export type AbacateProduct = { id: string; externalId: string; devMode: boolean };

function client() {
  const secret = process.env.ABACATEPAY_API_KEY;
  if (!secret) throw new Error('ABACATEPAY_API_KEY não configurada');
  return AbacatePay({ secret });
}

async function post<T>(route: string, body: unknown) {
  const result = await client().rest.post<ApiResult<T>>(route, { body });
  if (!result.success || !result.data) throw new Error(result.error || 'Falha na AbacatePay');
  return result.data;
}

export const abacatePay = {
  createCustomer(body: Record<string, unknown>) {
    return post<AbacateCustomer>('/customers/create', body);
  },
  createSubscriptionCheckout(body: Record<string, unknown>) {
    return post<AbacateCheckout>('/subscriptions/create', body);
  },
  changeSubscriptionPlan(id: string, productId: string) {
    return post('/subscriptions/change-plan', { id, productId, quantity: 1 });
  },
  cancelSubscription(id: string) {
    return post('/subscriptions/cancel', { id });
  },
  createProduct(body: Record<string, unknown>) {
    return post<AbacateProduct>('/products/create', body);
  },
};
