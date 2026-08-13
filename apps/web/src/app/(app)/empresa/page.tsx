'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import {
  Building2,
  Check,
  CreditCard,
  Loader2,
  Paintbrush,
  Save,
  Sparkles,
  Users,
} from 'lucide-react';
import { SAAS_PLANS, type SaasPlan } from '@/lib/saas';
import { BILLING_CYCLES, billingPriceCents, type BillingCycle } from '@/lib/billing';
import { cn } from '@/lib/utils';

type Workspace = {
  name: string;
  slug: string;
  document?: string;
  phone?: string;
  billingEmail?: string;
  primaryColor: string;
  plan: SaasPlan;
  subscriptionStatus: string;
  billingCycle?: BillingCycle;
  abacateSubscriptionId?: string;
  trialEndsAt?: string;
  _count: { users: number; obras: number };
};

export default function EmpresaPage() {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [cycle, setCycle] = useState<BillingCycle>('MONTHLY');
  const [loadedAt] = useState(() => Date.now());
  const load = useCallback(async () => {
    const res = await fetch('/api/workspace');
    if (res.ok) setWorkspace(await res.json());
    setLoading(false);
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function patch(data: Record<string, DynamicValue>) {
    setSaving(true);
    setMessage('');
    const res = await fetch('/api/workspace', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const body = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setMessage(body.error || 'Não foi possível salvar');
      return;
    }
    setMessage('Alterações salvas com sucesso.');
    await load();
  }

  function saveCompany(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    patch(Object.fromEntries(new FormData(event.currentTarget).entries()));
  }

  async function checkout(plan: SaasPlan) {
    setSaving(true);
    setMessage('');
    const res = await fetch('/api/billing/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan, cycle, acceptTerms: true }),
    });
    const body = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) return setMessage(body.error || 'Não foi possível iniciar o checkout');
    if (body.url) window.location.assign(body.url);
    else {
      setMessage('Alteração agendada para o próximo ciclo de cobrança.');
      await load();
    }
  }

  async function cancelSubscription() {
    if (!window.confirm('O cancelamento é imediato e encerra o acesso pago. Deseja continuar?')) return;
    setSaving(true);
    const res = await fetch('/api/billing/cancel', { method: 'POST' });
    const body = await res.json().catch(() => ({}));
    setSaving(false);
    setMessage(res.ok ? 'Cancelamento solicitado. O status será atualizado pela AbacatePay.' : body.error || 'Não foi possível cancelar');
  }

  if (loading)
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <Loader2 className="h-7 w-7 animate-spin text-[#ff5a00]" />
      </div>
    );
  if (!workspace) return <div className="rigor-card p-8">Não foi possível carregar sua empresa.</div>;
  const currentPlan = SAAS_PLANS[workspace.plan];
  const trialDays = workspace.trialEndsAt
    ? Math.max(0, Math.ceil((new Date(workspace.trialEndsAt).getTime() - loadedAt) / 86400000))
    : 0;

  return (
    <div className="mx-auto w-full max-w-[1380px] space-y-6 pb-10">
      <header className="relative overflow-hidden rounded-2xl bg-[#071018] px-7 py-8 text-white shadow-xl sm:px-9">
        <div className="absolute right-0 top-0 h-64 w-64 translate-x-1/3 -translate-y-1/3 rounded-full bg-[#ff5a00]/20 blur-3xl" />
        <div className="relative flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.24em] text-[#ff6a1a]">
              Workspace / {workspace.slug}
            </p>
            <h1 className="mt-3 text-3xl font-black tracking-[-.04em]">{workspace.name}</h1>
            <p className="mt-2 text-sm text-slate-400">
              Empresa, assinatura e capacidade da sua operação.
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Status da assinatura
            </p>
            <p className="mt-1 flex items-center gap-2 text-sm font-black text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              {workspace.subscriptionStatus === 'TRIAL'
                ? `Teste gratuito · ${trialDays} dias restantes`
                : workspace.subscriptionStatus}
            </p>
          </div>
        </div>
      </header>

      {message && (
        <div
          className={cn(
            'rounded-xl border px-4 py-3 text-sm font-bold',
            message.includes('sucesso')
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-red-200 bg-red-50 text-red-700'
          )}
        >
          {message}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[.78fr_1.22fr]">
        <div className="space-y-6">
          <section className="rigor-card p-6">
            <div className="mb-5 flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-orange-50 text-[#ff5a00]">
                <Building2 className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-lg font-black">Dados da empresa</h2>
                <p className="text-xs text-slate-500">Usados nos relatórios e documentos</p>
              </div>
            </div>
            <form onSubmit={saveCompany} className="space-y-4">
              <Field label="Razão social / Nome" name="name" defaultValue={workspace.name} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="CNPJ / CPF" name="document" defaultValue={workspace.document} />
                <Field label="Telefone" name="phone" defaultValue={workspace.phone} />
              </div>
              <Field
                label="E-mail de cobrança"
                name="billingEmail"
                type="email"
                defaultValue={workspace.billingEmail}
              />
              <label className="block text-xs font-bold text-slate-700">
                <span className="flex items-center gap-2">
                  <Paintbrush className="h-3.5 w-3.5" />
                  Cor da marca
                </span>
                <div className="mt-2 flex gap-2">
                  <input
                    name="primaryColor"
                    type="color"
                    defaultValue={workspace.primaryColor}
                    className="h-10 w-14 rounded-lg border border-slate-200 bg-white p-1"
                  />
                  <input
                    value={workspace.primaryColor}
                    readOnly
                    className="h-10 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 font-mono text-xs text-slate-500"
                  />
                </div>
              </label>
              <button
                disabled={saving}
                className="flex h-10 items-center justify-center rounded-lg bg-[#ff5a00] px-5 text-xs font-black text-white hover:bg-[#e85109] disabled:opacity-60"
              >
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Salvar empresa
              </button>
            </form>
          </section>
          <section className="rigor-card p-6">
            <h2 className="text-lg font-black">Uso do plano</h2>
            <div className="mt-5 space-y-5">
              <Usage
                icon={Building2}
                label="Obras"
                value={workspace._count.obras}
                limit={currentPlan.limits.obras}
              />
              <Usage
                icon={Users}
                label="Usuários"
                value={workspace._count.users}
                limit={currentPlan.limits.users}
              />
            </div>
          </section>
        </div>

        <section className="rigor-card p-6 sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.18em] text-[#ff5a00]">
                Assinatura
              </p>
              <h2 className="mt-1 text-2xl font-black tracking-tight">
                Escolha o ritmo da sua operação
              </h2>
            </div>
            <CreditCard className="h-6 w-6 text-slate-300" />
          </div>
          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            {(Object.keys(SAAS_PLANS) as SaasPlan[]).map((key) => {
              const plan = SAAS_PLANS[key];
              const active = workspace.plan === key && workspace.billingCycle === cycle && workspace.subscriptionStatus === 'ATIVA';
              const cycleConfig = BILLING_CYCLES[cycle];
              const total = billingPriceCents(key, cycle) / 100;
              const monthly = total / cycleConfig.months;
              return (
                <article
                  key={key}
                  className={cn(
                    'relative flex flex-col rounded-2xl border p-5',
                    active
                      ? 'border-[#ff5a00] bg-orange-50/40 ring-2 ring-orange-100'
                      : 'border-slate-200'
                  )}
                >
                  {active && (
                    <span className="absolute -top-3 left-4 rounded-full bg-[#ff5a00] px-3 py-1 text-[9px] font-black uppercase tracking-wide text-white">
                      Plano atual
                    </span>
                  )}
                  <h3 className="text-base font-black">{plan.name}</h3>
                  <p className="mt-1 min-h-10 text-[11px] leading-5 text-slate-500">
                    {plan.description}
                  </p>
                  <p className="mt-4 text-2xl font-black tracking-tight">
                    R$ {monthly.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    <span className="text-[10px] font-semibold text-slate-400">/mês</span>
                  </p>
                  <div className="my-5 h-px bg-slate-100" />
                  <ul className="flex-1 space-y-3">
                    {plan.features.map((feature) => (
                      <li
                        key={feature}
                        className="flex gap-2 text-[11px] font-semibold leading-4 text-slate-600"
                      >
                        <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <button
                    disabled={active || saving}
                    onClick={() => void checkout(key)}
                    className={cn(
                      'mt-6 h-10 rounded-lg text-xs font-black transition',
                      active
                        ? 'bg-slate-100 text-slate-400'
                        : 'border border-slate-200 bg-white text-slate-700 hover:border-[#ff5a00] hover:text-[#ff5a00]'
                    )}
                  >
                    {active ? 'Plano selecionado' : 'Selecionar plano'}
                  </button>
                </article>
              );
            })}
          </div>
          <div className="mt-6 flex flex-wrap gap-2" role="group" aria-label="Ciclo de cobrança">
            {(Object.keys(BILLING_CYCLES) as BillingCycle[]).map((item) => (
              <button key={item} type="button" onClick={() => setCycle(item)} className={cn('rounded-lg border px-4 py-2 text-xs font-black', cycle === item ? 'border-[#ff5a00] bg-orange-50 text-[#e85109]' : 'border-slate-200 text-slate-500')}>
                {BILLING_CYCLES[item].label}{BILLING_CYCLES[item].discount ? ` · -${BILLING_CYCLES[item].discount * 100}%` : ''}
              </button>
            ))}
          </div>
          <p className="mt-4 text-[11px] leading-5 text-slate-500">Ao contratar, você aceita os <a className="font-bold text-[#e85109]" href="/termos" target="_blank">Termos de Uso</a> e a <a className="font-bold text-[#e85109]" href="/privacidade" target="_blank">Política de Privacidade</a>. Pagamento recorrente processado pela AbacatePay.</p>
          {workspace.abacateSubscriptionId && workspace.subscriptionStatus === 'ATIVA' && (
            <button type="button" disabled={saving} onClick={() => void cancelSubscription()} className="mt-4 text-xs font-bold text-red-600 hover:underline">Cancelar assinatura</button>
          )}
          <div className="mt-6 flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50/50 p-4">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
            <p className="text-[11px] leading-5 text-blue-900">
              Durante o teste você pode explorar todos os recursos. A ativação do gateway de
              pagamento usa os identificadores de cobrança já preparados no workspace.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

function Field({
  label,
  name,
  type = 'text',
  defaultValue,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string | null;
}) {
  return (
    <label className="block text-xs font-bold text-slate-700">
      {label}
      <input
        name={name}
        type={type}
        defaultValue={defaultValue || ''}
        required={name === 'name' || name === 'billingEmail'}
        className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-slate-50/60 px-3 text-sm outline-none focus:border-[#ff5a00] focus:bg-white focus:ring-4 focus:ring-orange-100"
      />
    </label>
  );
}
function Usage({
  icon: Icon,
  label,
  value,
  limit,
}: {
  icon: typeof Building2;
  label: string;
  value: number;
  limit: number;
}) {
  const unlimited = !Number.isFinite(limit);
  const pct = unlimited ? 4 : Math.min(100, (value / limit) * 100);
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-xs">
        <span className="flex items-center gap-2 font-bold text-slate-600">
          <Icon className="h-4 w-4 text-slate-400" />
          {label}
        </span>
        <span className="font-black text-slate-800">
          {value}{' '}
          <span className="font-semibold text-slate-400">/ {unlimited ? 'ilimitado' : limit}</span>
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#ff5a00] to-[#ff9d3d]"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
