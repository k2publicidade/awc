'use client';

import Link from 'next/link';
import { FormEvent, Suspense, useEffect, useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Building2, Check, Loader2, ShieldCheck, ArrowRight } from 'lucide-react';
import { SAAS_PLANS, type SaasPlan } from '@/lib/saas';
import { RigorLogo } from '@/components/ui/rigor-logo';

function RegisterForm() {
  const publicSignupEnabled = process.env.NEXT_PUBLIC_ALLOW_PUBLIC_SIGNUP !== 'false';
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialPlanParam = searchParams.get('plan')?.toUpperCase() as SaasPlan | undefined;
  const initialPlan = (initialPlanParam && initialPlanParam in SAAS_PLANS) ? initialPlanParam : 'PRO';

  const [plan, setPlan] = useState<SaasPlan>(initialPlan);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialPlanParam && initialPlanParam in SAAS_PLANS) {
      setPlan(initialPlanParam);
    }
  }, [initialPlanParam]);

  if (!publicSignupEnabled) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#0B1F33] p-6 text-[#F5F7F6]">
        <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#071524]/90 p-8 shadow-2xl sm:p-10 text-center">
          <div className="mx-auto mb-6 flex justify-center">
            <RigorLogo markSize={40} theme="dark" showTagline={true} taglineText="BUILT ON PRECISION" />
          </div>
          <p className="mt-4 text-[11px] font-black uppercase tracking-[.22em] text-[#1687FF]">
            Onboarding Assistido
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-[-.03em] text-white">
            Novas empresas entram por convite ou validação técnica.
          </h1>
          <p className="mt-4 text-sm leading-7 text-[#AAB4BD]">
            Acompanhamos cada implantação do RIGOR de perto. Solicite seu acesso à nossa equipe
            ou acesse com uma conta já provisionada.
          </p>
          <Link
            href="/login"
            className="rigor-btn-primary mt-8 flex h-12 items-center justify-center rounded-xl text-xs font-black uppercase tracking-wider text-white"
          >
            Ir para o Login
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
      body: JSON.stringify({
        ...payload,
        plan,
        acceptTerms: payload.acceptTerms === 'true' || payload.acceptTerms === 'on',
      }),
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
    <main className="min-h-screen bg-[#0B1F33] text-[#F5F7F6]">
      <div className="absolute inset-0 opacity-25 [background-image:linear-gradient(rgba(170,180,189,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(170,180,189,.08)_1px,transparent_1px)] [background-size:36px_36px]" />
      <div className="relative mx-auto grid min-h-screen max-w-[1480px] lg:grid-cols-[.82fr_1.18fr]">
        <section className="flex flex-col justify-between border-b border-white/10 p-7 lg:border-b-0 lg:border-r lg:p-12 xl:p-16">
          <Link href="/login" className="inline-flex items-center">
            <RigorLogo markSize={36} theme="dark" showTagline={true} taglineText="BUILT ON PRECISION" />
          </Link>

          <div className="my-12 max-w-lg lg:my-0">
            <p className="mb-4 text-[11px] font-black uppercase tracking-[.24em] text-[#1687FF]">
              Gestão que sai do escritório e chega ao canteiro
            </p>
            <h1 className="text-4xl font-black leading-[1.04] tracking-[-.035em] text-white sm:text-5xl">
              Toda obra sob controle. Todos na mesma página.
            </h1>
            <p className="mt-6 max-w-md text-sm leading-7 text-[#AAB4BD]">
              Planejamento, diário de obra, custos, suprimentos, qualidade e segurança conectados em
              uma única operação técnica.
            </p>
            <div className="mt-8 grid gap-3 text-sm text-slate-300 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              {[
                '10 dias grátis',
                'Sem cartão de crédito',
                'App para o campo',
                'Dados isolados por empresa',
              ].map((item) => (
                <div key={item} className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-[#1687FF]" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-[#AAB4BD]">
            <ShieldCheck className="h-4 w-4 text-[#1687FF]" />
            Ambiente protegido e isolado · LGPD Compliance
          </div>
        </section>

        <section className="flex items-center justify-center bg-[#F5F7F6] p-5 text-[#0B1F33] sm:p-10 xl:p-14">
          <div className="w-full max-w-3xl">
            <div className="mb-7 flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[.18em] text-[#1687FF]">
                  Comece agora
                </p>
                <h2 className="mt-2 text-3xl font-black tracking-[-.03em] text-[#0B1F33]">
                  Crie seu workspace
                </h2>
              </div>
              <Link href="/login" className="text-sm font-bold text-[#354654] hover:text-[#1687FF] transition-colors">
                Já tenho conta
              </Link>
            </div>
            <form
              onSubmit={submit}
              className="rounded-2xl border border-[#AAB4BD]/30 bg-white p-6 shadow-[0_24px_80px_rgba(11,31,51,.06)] sm:p-8"
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
                <p className="mb-3 text-[11px] font-black uppercase tracking-wider text-[#354654]">
                  Plano após o período de teste de 10 dias
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
                        className={`relative rounded-xl border p-4 text-left transition-all ${
                          selected
                            ? 'border-[#1687FF] bg-[#1687FF]/5 ring-2 ring-[#1687FF]/20 shadow-xs'
                            : 'border-[#AAB4BD]/40 hover:border-[#AAB4BD]'
                        }`}
                      >
                        {key === 'PRO' && (
                          <span className="absolute -top-2.5 right-3 rounded-full bg-[#1687FF] px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-white">
                            Recomendado
                          </span>
                        )}
                        <p className="text-sm font-black text-[#0B1F33]">{item.name}</p>
                        <p className="mt-1 text-lg font-black text-[#0B1F33]">
                          R$ {item.price}
                          <span className="text-[10px] font-semibold text-[#AAB4BD]">/mês</span>
                        </p>
                        <p className="mt-2 text-[10px] leading-4 text-[#354654]">
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
              <label className="mt-5 flex items-start gap-3 text-xs leading-5 text-[#354654]">
                <input
                  required
                  name="acceptTerms"
                  value="true"
                  type="checkbox"
                  className="mt-1 h-4 w-4 accent-[#1687FF]"
                />
                <span>
                  Li e aceito os{' '}
                  <Link className="font-bold text-[#1687FF] hover:underline" href="/termos" target="_blank">
                    Termos de Uso
                  </Link>{' '}
                  e a{' '}
                  <Link className="font-bold text-[#1687FF] hover:underline" href="/privacidade" target="_blank">
                    Política de Privacidade
                  </Link>
                  .
                </span>
              </label>
              <button
                disabled={loading}
                className="rigor-btn-primary mt-6 flex h-12 w-full items-center justify-center rounded-xl text-xs font-black uppercase tracking-wider text-white disabled:opacity-60"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Criar Workspace e Iniciar Teste <ArrowRight className="ml-2 h-4 w-4" />
              </button>
              <p className="mt-4 text-center text-[10px] leading-4 text-[#AAB4BD]">
                Seu aceite é registrado com a versão vigente dos documentos em auditoria segura.
              </p>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="grid min-h-screen place-items-center bg-[#0B1F33] text-white">
          <Loader2 className="h-8 w-8 animate-spin text-[#1687FF]" />
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
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
    <label className="text-xs font-bold text-[#0B1F33]">
      {label}
      <div className="relative mt-2">
        {icon && (
          <span className="absolute left-3 top-1/2 [&>svg]:h-4 [&>svg]:w-4 -translate-y-1/2 text-[#354654]">
            {icon}
          </span>
        )}
        <input
          required={name !== 'phone'}
          name={name}
          type={type}
          placeholder={placeholder}
          minLength={type === 'password' ? 8 : undefined}
          className={`h-11 w-full rounded-lg border border-[#AAB4BD]/40 bg-[#F5F7F6]/60 px-3 text-sm text-[#0B1F33] outline-none transition focus:border-[#1687FF] focus:bg-white focus:ring-4 focus:ring-[#1687FF]/10 ${
            icon ? 'pl-10' : ''
          }`}
        />
      </div>
    </label>
  );
}
