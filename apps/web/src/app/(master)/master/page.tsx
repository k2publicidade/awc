import {
  Activity,
  Banknote,
  Building2,
  CircleAlert,
  HardHat,
  Radio,
  Users,
} from 'lucide-react';
import { redirect } from 'next/navigation';
import { TenantManager } from '@/components/master/tenant-manager';
import { requireMasterSession } from '@/lib/master-auth';
import { getMasterDashboard } from '@/lib/master-data';

const actionLabels: Record<string, string> = {
  TENANT_CREATED: 'Empresa criada',
  TENANT_UPDATED: 'Empresa atualizada',
  USER_ACTIVATED: 'Usuário ativado',
  USER_DEACTIVATED: 'Usuário desativado',
  USER_PASSWORD_RESET: 'Senha redefinida',
};

export default async function MasterDashboardPage() {
  const context = await requireMasterSession();
  if (!context) redirect('/login');
  const data = await getMasterDashboard();
  const maxMonthly = Math.max(...data.monthly.map((month) => month.empresas + month.usuarios), 1);
  const today = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  }).format(new Date());

  const metrics = [
    { label: 'Empresas ativas', value: data.metrics.activeTenants, detail: `${data.metrics.tenants} cadastradas`, icon: Building2, accent: '#c7ff4a' },
    { label: 'Receita recorrente', value: data.metrics.mrr.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }), detail: 'MRR estimado', icon: Banknote, accent: '#63e6d5' },
    { label: 'Usuários ativos', value: data.metrics.activeUsers, detail: `${data.metrics.totalUsers} contas totais`, icon: Users, accent: '#77a8ff' },
    { label: 'Obras monitoradas', value: data.metrics.totalObras, detail: `${data.metrics.activeObras} em andamento`, icon: HardHat, accent: '#ffbd5c' },
  ];

  return (
    <div className="mx-auto max-w-[1680px] px-5 py-7 sm:px-7 lg:px-10 lg:py-9">
      <header className="mb-8 flex flex-col gap-5 border-b border-white/8 pb-7 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-3 flex items-center gap-2 text-[9px] font-black uppercase tracking-[.23em] text-[#c7ff4a]">
            <Radio className="h-3 w-3 animate-pulse" /> Plataforma operacional
          </div>
          <h1 className="text-4xl font-bold uppercase leading-none text-white sm:text-5xl">
            Central de comando
          </h1>
          <p className="mt-3 text-sm text-slate-500">Visão consolidada de clientes, uso e receita do RIGOR.</p>
        </div>
        <div className="text-left md:text-right">
          <p className="text-[9px] font-black uppercase tracking-[.18em] text-slate-600">Status do sistema</p>
          <div className="mt-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[.08em] text-slate-300">
            <span className="h-2 w-2 rounded-full bg-[#c7ff4a] shadow-[0_0_12px_#c7ff4a]" /> Operacional
          </div>
          <p className="mt-1 text-[10px] capitalize text-slate-600">{today}</p>
        </div>
      </header>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <article key={metric.label} className="master-metric-card">
              <div className="flex items-start justify-between">
                <p className="master-eyebrow">{metric.label}</p>
                <Icon className="h-4 w-4" style={{ color: metric.accent }} />
              </div>
              <div className="mt-6 text-3xl font-bold leading-none text-white">{metric.value}</div>
              <div className="mt-3 font-mono text-[10px] text-slate-600">{metric.detail}</div>
            </article>
          );
        })}
      </div>

      <div className="mb-6 grid gap-4 xl:grid-cols-[1.55fr_.8fr]">
        <section className="master-panel p-5 lg:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="master-eyebrow">Crescimento · 12 meses</p>
              <h2 className="mt-2 text-xl font-bold uppercase text-white">Novos acessos à plataforma</h2>
            </div>
            <Activity className="h-5 w-5 text-[#63e6d5]" />
          </div>
          <div className="mt-8 flex h-52 items-end gap-2 sm:gap-3">
            {data.monthly.map((month) => {
              const total = month.empresas + month.usuarios;
              return (
                <div key={month.key} className="flex h-full min-w-0 flex-1 flex-col justify-end gap-2">
                  <div className="group relative flex flex-1 items-end overflow-hidden rounded-t-sm bg-white/[.025]">
                    <div
                      className="w-full bg-gradient-to-t from-[#2fc7b0]/40 to-[#c7ff4a] transition-all duration-500 group-hover:brightness-125"
                      style={{ height: `${Math.max((total / maxMonthly) * 100, total ? 8 : 1)}%` }}
                      title={`${total} novos registros`}
                    />
                  </div>
                  <span className="truncate text-center font-mono text-[8px] uppercase text-slate-600">{month.label}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex gap-5 border-t border-white/8 pt-4 text-[9px] uppercase tracking-[.12em] text-slate-600">
            <span><b className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-[#c7ff4a]" />Empresas + usuários</span>
            <span>{data.metrics.rdosLast30Days} RDOs nos últimos 30 dias</span>
          </div>
        </section>

        <section className="master-panel p-5 lg:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="master-eyebrow">Trilha segura</p>
              <h2 className="mt-2 text-xl font-bold uppercase text-white">Atividade recente</h2>
            </div>
            <CircleAlert className="h-5 w-5 text-amber-300" />
          </div>
          <div className="mt-5 divide-y divide-white/6">
            {data.recentAudits.map((audit) => (
              <div key={audit.id} className="py-3.5 first:pt-0">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-slate-300">{actionLabels[audit.action] || audit.action}</p>
                    <p className="mt-1 text-[10px] text-slate-600">{audit.tenant?.name || audit.targetType} · {audit.actor?.name || 'Sistema'}</p>
                  </div>
                  <time className="shrink-0 font-mono text-[8px] text-slate-700">{new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(audit.createdAt)}</time>
                </div>
              </div>
            ))}
            {data.recentAudits.length === 0 && <p className="py-8 text-center text-xs text-slate-600">A auditoria começa na primeira ação do painel.</p>}
          </div>
        </section>
      </div>

      <TenantManager tenants={data.tenants} />
    </div>
  );
}
