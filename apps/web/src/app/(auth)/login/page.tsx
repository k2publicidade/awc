'use client';
import { Suspense, useEffect, useState } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import Link from 'next/link';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginInput } from '@/lib/validations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Loader2, Lock, Mail, ShieldCheck } from 'lucide-react';
import { RigorLogo } from '@/components/ui/rigor-logo';

function LoginForm() {
  const publicSignupEnabled = process.env.NEXT_PUBLIC_ALLOW_PUBLIC_SIGNUP !== 'false';
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawCallback = searchParams.get('callbackUrl');
  const callbackUrl =
    rawCallback && rawCallback !== '/' && !rawCallback.startsWith('/login')
      ? rawCallback
      : '/dashboard';
  const error = searchParams.get('error');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState('');
  const [showForgotInfo, setShowForgotInfo] = useState(false);

  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      const dest =
        (session.user as DynamicValue)?.role === 'MASTER_ADMIN' ? '/master' : callbackUrl;
      router.replace(dest);
    }
  }, [status, session, router, callbackUrl]);

  const friendlyError = (e?: string | null) =>
    !e
      ? ''
      : e === 'CredentialsSignin'
        ? 'Email ou senha incorretos'
        : e === 'AccessDenied'
          ? 'Acesso negado para esta conta'
          : 'Não foi possível entrar agora. Verifique sua conexão e tente novamente.';
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });
  async function onSubmit(data: LoginInput) {
    setIsLoading(true);
    setServerError('');
    try {
      const result = await signIn('credentials', {
        email: data.email,
        password: data.password,
        redirect: false,
      });
      if (result?.error) {
        console.error('[auth] Falha de autenticação');
        setServerError(result.error);
        return;
      }
      router.push(callbackUrl);
      router.refresh();
    } catch (authError) {
      console.error('[auth] Falha inesperada no login', authError);
      setServerError('Não foi possível entrar agora. Verifique sua conexão e tente novamente.');
    } finally {
      setIsLoading(false);
    }
  }
  return (
    <div className="grid min-h-screen bg-[#F5F7F6] lg:grid-cols-[1.1fr_1fr]">
      <section className="relative hidden overflow-hidden bg-rigor-blueprint lg:block">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(22,135,255,0.22),transparent_35rem),radial-gradient(circle_at_20%_80%,rgba(11,31,51,0.8),transparent_30rem)]" />
        <div className="relative z-10 flex h-full flex-col justify-between p-16">
          <div>
            <RigorLogo markSize={42} theme="dark" showTagline={true} taglineText="BUILT ON PRECISION" />
            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-[#AAB4BD]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#1687FF] shadow-[0_0_6px_#1687FF]" />
              Gestão de obras de alta precisão
            </div>
          </div>
          <div className="max-w-md">
            <h2 className="rigor-title text-5xl leading-[1.1] text-[#F5F7F6] tracking-tight">
              Gestão completa da sua obra, do projeto à entrega.
            </h2>
            <p className="mt-6 text-[14.5px] leading-relaxed text-[#AAB4BD]">
              Controle de obras, RDO digital, cronogramas, financeiro, medições e conformidade
              integrados em uma plataforma moderna e confiável.
            </p>
            <div className="mt-8 flex items-center gap-6 border-t border-white/10 pt-6 text-xs text-[#AAB4BD]">
              <span className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-[#1687FF]" /> Dados isolados por empresa
              </span>
              <span>Ambiente criptografado</span>
            </div>
          </div>
          <div className="text-xs text-[#354654] font-semibold uppercase tracking-wider">
            RIGOR © {new Date().getFullYear()} · BUILT ON PRECISION
          </div>
        </div>
      </section>

      <section className="flex items-center justify-center p-6 bg-[#F5F7F6]">
        <div className="w-full max-w-[480px] bg-white rounded-2xl border border-[#AAB4BD]/30 p-8 sm:p-10 shadow-[0_12px_36px_rgba(11,31,51,0.06)]">
          <div className="mb-8 lg:hidden">
            <RigorLogo markSize={36} theme="light" showTagline={true} taglineText="GESTÃO DE OBRAS" />
          </div>
          <div className="mb-8">
            <h1 className="rigor-title text-3xl font-black leading-none text-[#0B1F33] tracking-tight">
              Entrar no RIGOR
            </h1>
            <p className="mt-2 text-xs font-semibold text-[#354654] uppercase tracking-wider">
              Painel administrativo de controle de obras
            </p>
          </div>
          {(error || serverError) && (
            <div role="alert" aria-live="polite" className="mb-5 rounded-xl border border-red-200 bg-red-50/70 px-4 py-3 text-xs font-semibold text-red-700">
              {friendlyError(serverError || error)}
            </div>
          )}
          {showForgotInfo && (
            <div role="status" aria-live="polite" className="mb-5 rounded-xl border border-[#1687FF]/30 bg-[#1687FF]/5 px-4 py-3 text-xs font-semibold text-[#0B1F33]">
              A redefinição de senha é feita pelo administrador da sua empresa ou suporte RIGOR.
            </div>
          )}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label
                htmlFor="email"
                className="text-[11px] font-bold text-[#0B1F33] uppercase tracking-wide"
              >
                E-mail
              </Label>
              <div className="relative mt-2">
                <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#354654]" />
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  {...register('email')}
                  className="h-11 rounded-lg border-[#AAB4BD]/40 bg-[#F5F7F6]/50 pl-11 text-[13.5px] text-[#0B1F33] transition-all focus-visible:ring-[#1687FF]/15 focus-visible:border-[#1687FF] focus-visible:bg-white"
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-xs text-red-500 font-medium">{errors.email.message}</p>
              )}
            </div>
            <div>
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="password"
                  className="text-[11px] font-bold text-[#0B1F33] uppercase tracking-wide"
                >
                  Senha
                </Label>
                <button
                  type="button"
                  onClick={() => setShowForgotInfo((v) => !v)}
                  className="min-h-11 rounded-lg px-2 text-[11px] font-bold text-[#1687FF] transition-colors hover:text-[#0F6ED4]"
                >
                  Esqueci minha senha
                </button>
              </div>
              <div className="relative mt-2">
                <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#354654]" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  {...register('password')}
                  className="h-11 rounded-lg border-[#AAB4BD]/40 bg-[#F5F7F6]/50 pl-11 pr-11 text-[13.5px] text-[#0B1F33] transition-all focus-visible:ring-[#1687FF]/15 focus-visible:border-[#1687FF] focus-visible:bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-0 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg text-[#354654] hover:bg-slate-100 hover:text-[#0B1F33]"
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPassword ? (
                    <EyeOff className="h-4.5 w-4.5" />
                  ) : (
                    <Eye className="h-4.5 w-4.5" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-red-500 font-medium">{errors.password.message}</p>
              )}
            </div>
            <Button
              type="submit"
              disabled={isLoading}
              className="rigor-btn-primary h-11 w-full text-xs font-bold uppercase tracking-wider rounded-lg mt-2"
            >
              {isLoading && <Loader2 className="mr-2 h-4.5 w-4.5 animate-spin" />}Acessar Painel
            </Button>
          </form>
          <div className="mt-8 text-center">
            <p className="text-[11px] font-medium text-[#354654] leading-relaxed">
              {publicSignupEnabled ? (
                <>
                  Ainda não usa o RIGOR?{' '}
                  <Link href="/register" className="font-black text-[#1687FF] hover:underline">
                    Crie sua empresa e teste por 10 dias
                  </Link>
                  .
                </>
              ) : (
                'Novos acessos são provisionados pela equipe RIGOR.'
              )}
            </p>
            <p className="mt-4 text-[10px] font-semibold text-[#AAB4BD] uppercase tracking-wider">
              Versão 2.2.0 · Built on Precision
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#F5F7F6]">
          <Loader2 className="h-8 w-8 animate-spin text-[#1687FF]" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
