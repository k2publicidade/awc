import 'server-only';
import prisma from '@/lib/prisma';

export const PLAN_MONTHLY_PRICE = {
  STARTER: 249,
  PRO: 599,
  BUSINESS: 1290,
} as const;

function monthKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function lastMonths(quantity: number) {
  const current = new Date();
  current.setUTCDate(1);
  current.setUTCHours(0, 0, 0, 0);
  return Array.from({ length: quantity }, (_, index) => {
    const date = new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth() - (quantity - 1 - index), 1));
    return {
      key: monthKey(date),
      label: new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(date).replace('.', ''),
      empresas: 0,
      usuarios: 0,
      obras: 0,
    };
  });
}

export async function getMasterDashboard() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setUTCMonth(twelveMonthsAgo.getUTCMonth() - 11, 1);
  twelveMonthsAgo.setUTCHours(0, 0, 0, 0);
  const customerTenant = { isInternal: false } as const;

  const [
    tenants,
    totalUsers,
    activeUsers,
    totalObras,
    activeObras,
    rdosLast30Days,
    recentAudits,
    tenantDates,
    userDates,
    obraDates,
  ] = await Promise.all([
    prisma.tenant.findMany({
      where: customerTenant,
      select: {
        id: true,
        name: true,
        slug: true,
        plan: true,
        subscriptionStatus: true,
        trialEndsAt: true,
        isActive: true,
        billingEmail: true,
        createdAt: true,
        _count: { select: { users: true, obras: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.count({ where: { tenant: customerTenant } }),
    prisma.user.count({ where: { tenant: customerTenant, isActive: true } }),
    prisma.obra.count({ where: { tenant: customerTenant } }),
    prisma.obra.count({ where: { tenant: customerTenant, status: 'EM_ANDAMENTO' } }),
    prisma.rDO.count({ where: { obra: { tenant: customerTenant }, createdAt: { gte: thirtyDaysAgo } } }),
    prisma.auditLog.findMany({
      take: 8,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        action: true,
        targetType: true,
        createdAt: true,
        actor: { select: { name: true } },
        tenant: { select: { name: true } },
      },
    }),
    prisma.tenant.findMany({ where: { ...customerTenant, createdAt: { gte: twelveMonthsAgo } }, select: { createdAt: true } }),
    prisma.user.findMany({ where: { tenant: customerTenant, createdAt: { gte: twelveMonthsAgo } }, select: { createdAt: true } }),
    prisma.obra.findMany({ where: { tenant: customerTenant, createdAt: { gte: twelveMonthsAgo } }, select: { createdAt: true } }),
  ]);

  const activeSubscriptions = tenants.filter(
    (tenant) => tenant.isActive && tenant.subscriptionStatus === 'ATIVA'
  );
  const mrr = activeSubscriptions.reduce((total, tenant) => total + PLAN_MONTHLY_PRICE[tenant.plan], 0);
  const metrics = {
    tenants: tenants.length,
    activeTenants: tenants.filter((tenant) => tenant.isActive).length,
    trials: tenants.filter((tenant) => tenant.subscriptionStatus === 'TRIAL').length,
    delinquent: tenants.filter((tenant) => tenant.subscriptionStatus === 'INADIMPLENTE').length,
    mrr,
    totalUsers,
    activeUsers,
    totalObras,
    activeObras,
    rdosLast30Days,
  };

  const monthly = lastMonths(12);
  const monthlyMap = new Map(monthly.map((item) => [item.key, item]));
  for (const item of tenantDates) {
    const bucket = monthlyMap.get(monthKey(item.createdAt));
    if (bucket) bucket.empresas += 1;
  }
  for (const item of userDates) {
    const bucket = monthlyMap.get(monthKey(item.createdAt));
    if (bucket) bucket.usuarios += 1;
  }
  for (const item of obraDates) {
    const bucket = monthlyMap.get(monthKey(item.createdAt));
    if (bucket) bucket.obras += 1;
  }

  const planDistribution = (['STARTER', 'PRO', 'BUSINESS'] as const).map((plan) => ({
    plan,
    count: tenants.filter((tenant) => tenant.plan === plan).length,
  }));

  return { metrics, tenants, recentAudits, monthly, planDistribution };
}

export async function getMasterTenant(tenantId: string) {
  return prisma.tenant.findFirst({
    where: { id: tenantId, isInternal: false },
    select: {
      id: true,
      name: true,
      slug: true,
      logoUrl: true,
      document: true,
      phone: true,
      billingEmail: true,
      plan: true,
      subscriptionStatus: true,
      trialEndsAt: true,
      isActive: true,
      onboardingCompleted: true,
      createdAt: true,
      updatedAt: true,
      users: {
        orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          phone: true,
          isActive: true,
          mustChangePassword: true,
          lastLoginAt: true,
          createdAt: true,
        },
      },
      obras: {
        orderBy: { updatedAt: 'desc' },
        take: 12,
        select: {
          id: true,
          nome: true,
          codigo: true,
          status: true,
          valorContratado: true,
          updatedAt: true,
        },
      },
      auditLogs: {
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true,
          action: true,
          targetType: true,
          targetId: true,
          metadata: true,
          createdAt: true,
          actor: { select: { name: true } },
        },
      },
      _count: {
        select: {
          users: true,
          obras: true,
          fornecedores: true,
          materiais: true,
          trabalhadores: true,
        },
      },
    },
  });
}
