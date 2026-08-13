import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft, Boxes, Building2, HardHat, PackageSearch, Users } from 'lucide-react';
import { TenantControlPanel } from '@/components/master/tenant-control-panel';
import { requireMasterSession } from '@/lib/master-auth';
import { getMasterTenant } from '@/lib/master-data';

export default async function MasterTenantPage({ params }: { params: Promise<{ id: string }> }) {
  const context = await requireMasterSession();
  if (!context) redirect('/login');
  const tenant = await getMasterTenant((await params).id);
  if (!tenant) notFound();

  const stats = [
    { label: 'Usuários', value: tenant._count.users, icon: Users },
    { label: 'Obras', value: tenant._count.obras, icon: HardHat },
    { label: 'Fornecedores', value: tenant._count.fornecedores, icon: Boxes },
    { label: 'Materiais', value: tenant._count.materiais, icon: PackageSearch },
  ];

  return (
    <div className="mx-auto max-w-[1680px] px-5 py-7 sm:px-7 lg:px-10 lg:py-9">
      <Link href="/master#empresas" className="mb-7 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[.13em] text-slate-600 hover:text-[#c7ff4a]"><ArrowLeft className="h-3.5 w-3.5" /> Voltar às empresas</Link>
      <header className="mb-7 flex flex-col gap-5 border-b border-white/8 pb-7 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex items-start gap-4">
          <div className="grid h-12 w-12 place-items-center rounded-md border border-[#c7ff4a]/15 bg-[#c7ff4a]/8 text-[#c7ff4a]"><Building2 className="h-5 w-5" /></div>
          <div>
            <p className="master-eyebrow">Workspace · {tenant.slug}</p>
            <h1 className="mt-2 text-4xl font-bold uppercase leading-none text-white">{tenant.name}</h1>
            <p className="mt-3 text-xs text-slate-600">Cliente desde {new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(tenant.createdAt)}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded border border-white/10 bg-white/[.03] px-3 py-2 text-[9px] font-black uppercase tracking-[.13em] text-slate-400">Plano {tenant.plan}</span>
          <span className={`rounded border px-3 py-2 text-[9px] font-black uppercase tracking-[.13em] ${tenant.isActive ? 'border-[#c7ff4a]/20 bg-[#c7ff4a]/8 text-[#c7ff4a]' : 'border-red-400/20 bg-red-400/8 text-red-300'}`}>{tenant.isActive ? tenant.subscriptionStatus : 'Suspensa'}</span>
        </div>
      </header>

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => { const Icon = stat.icon; return <div key={stat.label} className="master-panel flex items-center justify-between p-4"><div><p className="master-eyebrow">{stat.label}</p><p className="mt-2 text-2xl font-bold text-white">{stat.value}</p></div><Icon className="h-4 w-4 text-slate-600" /></div>; })}
      </div>

      <TenantControlPanel
        tenant={{
          id: tenant.id,
          name: tenant.name,
          document: tenant.document,
          phone: tenant.phone,
          billingEmail: tenant.billingEmail,
          plan: tenant.plan,
          subscriptionStatus: tenant.subscriptionStatus,
          isActive: tenant.isActive,
          users: tenant.users,
        }}
      />
    </div>
  );
}
