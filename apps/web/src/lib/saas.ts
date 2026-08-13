export const SAAS_PLANS = {
  STARTER: {
    name: 'Essencial',
    description: 'Para construtoras iniciando a gestão digital.',
    price: 249,
    limits: { obras: 3, users: 5, storageGb: 10 },
    features: ['Obras, cronograma e RDO', 'Financeiro e materiais', 'Relatórios essenciais'],
  },
  PRO: {
    name: 'Profissional',
    description: 'Operação completa para equipes em crescimento.',
    price: 599,
    limits: { obras: 15, users: 25, storageGb: 100 },
    features: [
      'Tudo do Essencial',
      'Qualidade e segurança',
      'Portal do cliente',
      'App de campo e relatórios avançados',
    ],
  },
  BUSINESS: {
    name: 'Empresarial',
    description: 'Governança e escala para grandes carteiras.',
    price: 1290,
    limits: { obras: Number.POSITIVE_INFINITY, users: Number.POSITIVE_INFINITY, storageGb: 500 },
    features: [
      'Tudo do Profissional',
      'Obras e usuários ilimitados',
      'Suporte prioritário',
      'Integrações e implantação assistida',
    ],
  },
} as const;

export type SaasPlan = keyof typeof SAAS_PLANS;

export function planLimit(plan: string | null | undefined, key: 'obras' | 'users' | 'storageGb') {
  return SAAS_PLANS[(plan as SaasPlan) || 'STARTER']?.limits[key] ?? SAAS_PLANS.STARTER.limits[key];
}

export function slugifyCompany(value: string) {
  return (
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 48) || 'empresa'
  );
}
