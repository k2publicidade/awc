import { redirect } from 'next/navigation';
import { Activity, Building2, Download, HardHat, Radio, Users } from 'lucide-react';
import { requireMasterSession } from '@/lib/master-auth';
import { getMasterDashboard, PLAN_MONTHLY_PRICE } from '@/lib/master-data';

const statusLabels = {
  TRIAL: 'Em avaliação',
  ATIVA: 'Ativas',
  INADIMPLENTE: 'Inadimplentes',
  CANCELADA: 'Canceladas',
} as const;

export default async function MasterReportsPage() {
  const context = await requireMasterSession();
  if (!context) redirect('/login');
  const data = await getMasterDashboard();
  const maxGrowth = Math.max(...data.monthly.map((month) => month.empresas + month.usuarios + month.obras), 1);
  const statuses = (Object.keys(statusLabels) as Array<keyof typeof statusLabels>).map((status) => ({
    status,
    label: statusLabels[status],
    count: data.tenants.filter((tenant) => tenant.subscriptionStatus === status).length,
  }));

  return (
    <div className="mx-auto max-w-[1680px] px-5 py-7 sm:px-7 lg:px-10 lg:py-9">
      <header className="mb-8 flex flex-col gap-5 border-b border-white/8 pb-7 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-3 flex items-center gap-2 text-[9px] font-black uppercase tracking-[.23em] text-[#c7ff4a]"><Radio className="h-3 w-3" /> Business intelligence</div>
          <h1 className="text-4xl font-bold uppercase leading-none text-white sm:text-5xl">Relatórios da plataforma</h1>
          <p className="mt-3 text-sm text-slate-500">Receita, aquisição, uso e saúde da base de clientes em uma única visão.</p>
        </div>
        <a href="/api/master/reports/export" className="master-primary-button"><Download className="h-4 w-4" /> Exportar clientes CSV</a>
      </header>

      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <ReportMetric icon={Building2} label="Base total" value={data.metrics.tenants} detail={`${data.metrics.activeTenants} com acesso liberado`} />
        <ReportMetric icon={Users} label="Adoção" value={data.metrics.activeUsers} detail={`${data.metrics.totalUsers} usuários cadastrados`} />
        <ReportMetric icon={HardHat} label="Operação" value={data.metrics.totalObras} detail={`${data.metrics.activeObras} obras em andamento`} />
        <ReportMetric icon={Activity} label="Uso recente" value={data.metrics.rdosLast30Days} detail="RDOs emitidos em 30 dias" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.4fr_.8fr]">
        <section className="master-panel p-5 lg:p-6">
          <p className="master-eyebrow">Aquisição e ativação</p>
          <h2 className="mt-2 text-2xl font-bold uppercase text-white">Crescimento mensal</h2>
          <div className="mt-8 space-y-4">
            {data.monthly.map((month) => {
              const total = month.empresas + month.usuarios + month.obras;
              return (
                <div key={month.key} className="grid grid-cols-[42px_1fr_44px] items-center gap-3">
                  <span className="font-mono text-[9px] uppercase text-slate-600">{month.label}</span>
                  <div className="flex h-6 overflow-hidden rounded-sm bg-white/[.025]">
                    <div className="bg-[#c7ff4a]" style={{ width: `${(month.empresas / maxGrowth) * 100}%` }} title={`${month.empresas} empresas`} />
                    <div className="bg-[#2fc7b0]" style={{ width: `${(month.usuarios / maxGrowth) * 100}%` }} title={`${month.usuarios} usuários`} />
                    <div className="bg-[#527fcb]" style={{ width: `${(month.obras / maxGrowth) * 100}%` }} title={`${month.obras} obras`} />
                  </div>
                  <span className="text-right font-mono text-[10px] text-slate-500">{total}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-6 flex flex-wrap gap-5 border-t border-white/8 pt-4 text-[9px] uppercase tracking-[.1em] text-slate-600">
            <Legend color="#c7ff4a" label="Empresas" /><Legend color="#2fc7b0" label="Usuários" /><Legend color="#527fcb" label="Obras" />
          </div>
        </section>

        <section className="master-panel p-5 lg:p-6">
          <p className="master-eyebrow">Receita recorrente</p>
          <div className="mt-3 text-4xl font-bold text-white">{data.metrics.mrr.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}</div>
          <p className="mt-2 text-[10px] uppercase tracking-[.12em] text-slate-600">MRR estimado de assinaturas ativas</p>
          <div className="mt-7 space-y-3">
            {data.planDistribution.map((item) => {
              const planMrr = data.tenants.filter((tenant) => tenant.plan === item.plan && tenant.isActive && tenant.subscriptionStatus === 'ATIVA').length * PLAN_MONTHLY_PRICE[item.plan];
              return (
                <div key={item.plan} className="rounded-md border border-white/7 bg-white/[.02] p-4">
                  <div className="flex items-center justify-between"><span className="text-[10px] font-black tracking-[.12em] text-slate-400">{item.plan}</span><span className="font-mono text-xs text-white">{planMrr.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}</span></div>
                  <p className="mt-2 text-[9px] text-slate-600">{item.count} empresa{item.count === 1 ? '' : 's'} na base</p>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <section className="master-panel p-5 lg:p-6">
          <p className="master-eyebrow">Saúde comercial</p>
          <h2 className="mt-2 text-2xl font-bold uppercase text-white">Assinaturas</h2>
          <div className="mt-6 grid grid-cols-2 gap-3">
            {statuses.map((item) => <div key={item.status} className="rounded-md border border-white/7 bg-white/[.02] p-4"><p className="text-2xl font-bold text-white">{item.count}</p><p className="mt-1 text-[9px] font-black uppercase tracking-[.1em] text-slate-600">{item.label}</p></div>)}
          </div>
          {data.metrics.delinquent > 0 && <div className="mt-4 rounded-md border border-amber-400/15 bg-amber-400/5 p-4 text-xs text-amber-200">{data.metrics.delinquent} conta(s) precisam de acompanhamento financeiro.</div>}
        </section>

        <section className="master-panel overflow-hidden">
          <div className="border-b border-white/8 p-5 lg:p-6"><p className="master-eyebrow">Densidade por cliente</p><h2 className="mt-2 text-2xl font-bold uppercase text-white">Maiores operações</h2></div>
          <div className="divide-y divide-white/6">
            {[...data.tenants].sort((a, b) => (b._count.obras + b._count.users) - (a._count.obras + a._count.users)).slice(0, 6).map((tenant, index) => (
              <div key={tenant.id} className="flex items-center gap-4 px-5 py-4 lg:px-6"><span className="font-mono text-[10px] text-slate-700">{String(index + 1).padStart(2, '0')}</span><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-slate-300">{tenant.name}</p><p className="mt-1 text-[9px] text-slate-600">{tenant.plan} · {tenant.subscriptionStatus}</p></div><div className="text-right font-mono text-[10px] text-slate-500">{tenant._count.obras} obras<br />{tenant._count.users} usuários</div></div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function ReportMetric({ icon: Icon, label, value, detail }: { icon: typeof Building2; label: string; value: number; detail: string }) {
  return <div className="master-panel flex items-center justify-between p-5"><div><p className="master-eyebrow">{label}</p><p className="mt-3 text-3xl font-bold text-white">{value}</p><p className="mt-2 text-[10px] text-slate-600">{detail}</p></div><Icon className="h-5 w-5 text-[#c7ff4a]" /></div>;
}

function Legend({ color, label }: { color: string; label: string }) {
  return <span><b className="mr-2 inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />{label}</span>;
}
