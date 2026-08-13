'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Building2, Check, HardHat, Loader2, ShieldCheck } from 'lucide-react';
import { SAAS_PLANS, type SaasPlan } from '@/lib/saas';

export default function RegisterPage() {
  const publicSignupEnabled =
    process.env.NEXT_PUBLIC_ALLOW_PUBLIC_SIGNUP === 'true' || process.env.NODE_ENV !== 'production';
  const router = useRouter();
  const [plan, setPlan] = useState<SaasPlan>('PRO');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!publicSignupEnabled) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#071018] p-6 text-slate-100">
        <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-white/[.045] p-8 shadow-2xl sm:p-10">
          <span className="grid h-12 w-12 place-items-center rounded-xl bg-[#ff5a00] text-white">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <p className="mt-7 text-[11px] font-black uppercase tracking-[.22em] text-[#ff6a1a]">
            Onboarding assistido
          </p>
          <h1 className="mt-3 text-4xl font-black tracking-[-.04em] text-white">
            Novas empresas entram por convite.
          </h1>
          <p className="mt-5 text-sm leading-7 text-slate-400">
            Estamos acompanhando cada implantação do RIGOR de perto. Solicite seu acesso à equipe
            comercial ou entre com uma conta já provisionada.
          </p>
          <Link
            href="/login"
            className="mt-8 flex h-12 items-center justify-center rounded-xl bg-[#ff5a00] text-sm font-black text-white transition hover:bg-[#e85109]"
          >
            Voltar para o login
          </Link>
        </div>
      </main>
    );
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries());
    const response = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, plan }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(body.error || 'Não foi possível criar sua conta');
      setLoading(false);
      return;
    }
    const login = await signIn('credentials', {
      email: payload.email,
      password: payload.password,
      redirect: false,
    });
    if (login?.error) {
      router.push('/login');
      return;
    }
    router.push('/dashboard?welcome=1');
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-[#071018] text-slate-100">
      <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(255,255,255,.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.035)_1px,transparent_1px)] [background-size:36px_36px]" />
      <div className="relative mx-auto grid min-h-screen max-w-[1480px] lg:grid-cols-[.82fr_1.18fr]">
        <section className="flex flex-col justify-between border-b border-white/10 p-7 lg:border-b-0 lg:border-r lg:p-12 xl:p-16">
          <Link href="/login" className="flex items-center gap-3 text-xl font-black tracking-tight">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#ff5a00] text-white">
              <HardHat className="h-5 w-5" />
            </span>
            <span className="tracking-[.08em]"><span className="text-[#ff6a1a]">R</span>IGOR</span>
          </Link>
          <div className="my-12 max-w-lg lg:my-0">
            <p className="mb-5 text-[11px] font-black uppercase tracking-[.28em] text-[#ff6a1a]">
              Gestão que sai do escritório e chega ao canteiro
            </p>
            <h1 className="text-4xl font-black leading-[1.04] tracking-[-.045em] text-white sm:text-5xl xl:text-6xl">
              Toda obra sob controle. Todos na mesma página.
            </h1>
            <p className="mt-6 max-w-md text-sm leading-7 text-slate-400">
              Planejamento, diário de obra, custos, suprimentos, qualidade e segurança conectados em
              uma única operação.
            </p>
            <div className="mt-9 grid gap-3 text-sm text-slate-300 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              {[
                '14 dias grátis',
                'Sem cartão de crédito',
                'App para o campo',
                'Dados isolados por empresa',
              ].map((item) => (
                <div key={item} className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-[#ff6a1a]" />
                  {item}
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <ShieldCheck className="h-4 w-4" />
            Ambiente protegido e acesso por função
          </div>
        </section>

        <section className="flex items-center justify-center bg-[#f4f6f8] p-5 text-slate-900 sm:p-10 xl:p-14">
          <div className="w-full max-w-3xl">
            <div className="mb-7 flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[.18em] text-[#f05a13]">
                  Comece agora
                </p>
                <h2 className="mt-2 text-3xl font-black tracking-[-.035em]">Crie seu workspace</h2>
              </div>
              <Link href="/login" className="text-sm font-bold text-slate-500 hover:text-[#f05a13]">
                Já tenho conta
              </Link>
            </div>
            <form
              onSubmit={submit}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,.08)] sm:p-8"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Empresa"
                  name="companyName"
                  placeholder="Construtora Horizonte"
                  icon={<Building2 />}
                />
                <Field label="Seu nome" name="name" placeholder="João Silva" />
                <Field
                  label="E-mail profissional"
                  name="email"
                  type="email"
                  placeholder="joao@empresa.com.br"
                />
                <Field label="Telefone" name="phone" type="tel" placeholder="(11) 99999-9999" />
                <Field
                  label="Senha"
                  name="password"
                  type="password"
                  placeholder="Mínimo 8 caracteres"
                />
                <Field
                  label="Confirmar senha"
                  name="confirmPassword"
                  type="password"
                  placeholder="Repita a senha"
                />
              </div>
              <div className="mt-6">
                <p className="mb-3 text-[11px] font-black uppercase tracking-wider text-slate-500">
                  Plano após o período de teste
                </p>
                <div className="grid gap-3 sm:grid-cols-3">
                  {(Object.keys(SAAS_PLANS) as SaasPlan[]).map((key) => {
                    const item = SAAS_PLANS[key];
                    const selected = plan === key;
                    return (
                      <button
                        type="button"
                        key={key}
                        onClick={() => setPlan(key)}
                        className={`relative rounded-xl border p-4 text-left transition-all ${selected ? 'border-[#ff5a00] bg-orange-50/60 ring-2 ring-[#ff5a00]/10' : 'border-slate-200 hover:border-slate-300'}`}
                      >
                        {key === 'PRO' && (
                          <span className="absolute -top-2.5 right-3 rounded-full bg-[#ff5a00] px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-white">
                            Recomendado
                          </span>
                        )}
                        <p className="text-sm font-black">{item.name}</p>
                        <p className="mt-1 text-lg font-black">
                          R$ {item.price}
                          <span className="text-[10px] font-semibold text-slate-400">/mês</span>
                        </p>
                        <p className="mt-2 text-[10px] leading-4 text-slate-500">
                          {Number.isFinite(item.limits.obras)
                            ? `${item.limits.obras} obras · ${item.limits.users} usuários`
                            : 'Obras e usuários ilimitados'}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
              {error && (
                <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                  {error}
                </div>
              )}
              <label className="mt-5 flex items-start gap-3 text-xs leading-5 text-slate-600">
                <input required name="acceptTerms" value="true" type="checkbox" className="mt-1 h-4 w-4 accent-[#f05a13]" />
                <span>Li e aceito os <Link className="font-bold text-[#d94c09]" href="/termos" target="_blank">Termos de Uso</Link> e a <Link className="font-bold text-[#d94c09]" href="/privacidade" target="_blank">Política de Privacidade</Link>.</span>
              </label>
              <button
                disabled={loading}
                className="mt-6 flex h-12 w-full items-center justify-center rounded-xl bg-[#f05a13] text-sm font-black text-white shadow-lg shadow-orange-600/20 transition hover:bg-[#d94c09] disabled:opacity-60"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Criar workspace e
                iniciar teste
              </button>
              <p className="mt-4 text-center text-[10px] leading-4 text-slate-400">
                Seu aceite é registrado com a versão vigente dos documentos.
              </p>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}

function Field({
  label,
  name,
  type = 'text',
  placeholder,
  icon,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder: string;
  icon?: React.ReactNode;
}) {
  return (
    <label className="text-xs font-bold text-slate-700">
      {label}
      <div className="relative mt-2">
        {icon && (
          <span className="absolute left-3 top-1/2 [&>svg]:h-4 [&>svg]:w-4 -translate-y-1/2 text-slate-400">
            {icon}
          </span>
        )}
        <input
          required={name !== 'phone'}
          name={name}
          type={type}
          placeholder={placeholder}
          minLength={type === 'password' ? 8 : undefined}
          className={`h-11 w-full rounded-lg border border-slate-200 bg-slate-50/60 px-3 text-sm outline-none transition focus:border-[#ff5a00] focus:bg-white focus:ring-4 focus:ring-orange-100 ${icon ? 'pl-10' : ''}`}
        />
      </div>
    </label>
  );
}
