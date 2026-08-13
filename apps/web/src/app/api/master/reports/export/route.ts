import { NextResponse } from 'next/server';
import { requireMasterSession } from '@/lib/master-auth';
import { getMasterDashboard, PLAN_MONTHLY_PRICE } from '@/lib/master-data';

function csvCell(value: unknown) {
  const text = String(value ?? '').replace(/"/g, '""');
  return `"${text}"`;
}

export async function GET() {
  const context = await requireMasterSession();
  if (!context) return NextResponse.json({ error: 'Acesso exclusivo do MASTER ADMIN' }, { status: 403 });
  const data = await getMasterDashboard();
  const rows = [
    ['Empresa', 'E-mail cobrança', 'Plano', 'Status', 'Acesso', 'Usuários', 'Obras', 'MRR estimado', 'Criada em'],
    ...data.tenants.map((tenant) => [
      tenant.name,
      tenant.billingEmail,
      tenant.plan,
      tenant.subscriptionStatus,
      tenant.isActive ? 'ATIVO' : 'SUSPENSO',
      tenant._count.users,
      tenant._count.obras,
      tenant.isActive && tenant.subscriptionStatus === 'ATIVA' ? PLAN_MONTHLY_PRICE[tenant.plan] : 0,
      tenant.createdAt.toISOString(),
    ]),
  ];
  const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(';')).join('\r\n')}`;
  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="rigor-relatorio-clientes-${date}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
