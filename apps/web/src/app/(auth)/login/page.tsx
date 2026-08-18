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
import { Eye, EyeOff, Loader2, Lock, Mail } from 'lucide-react';

function LoginForm() {
  const publicSignupEnabled =
    process.env.NEXT_PUBLIC_ALLOW_PUBLIC_SIGNUP === 'true' || process.env.NODE_ENV !== 'production';
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
    <div className="grid min-h-screen bg-slate-50 lg:grid-cols-[1.1fr_1fr]">
      <section className="relative hidden overflow-hidden bg-[#04080e] lg:block">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(255,90,0,0.22),transparent_35rem),radial-gradient(circle_at_20%_80%,rgba(13,110,253,0.1),transparent_30rem)]" />
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              'linear-gradient(135deg, rgba(255,255,255,.05) 0 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />
        <div className="relative z-10 flex h-full flex-col justify-between p-16">
          <div>
            <div className="text-5xl font-black leading-none tracking-[.08em] text-white">
              <span className="text-[#ff5a00]">R</span>IGOR
            </div>
            <div className="mt-2 text-[9px] font-black uppercase tracking-[0.4em] text-slate-400">
              Gestão de obras com controle total
            </div>
          </div>
          <div className="max-w-md">
            <h2 className="rigor-title text-5xl leading-[1.1] text-white tracking-tight">
              Gestão completa da sua obra, do projeto à entrega.
            </h2>
            <p className="mt-6 text-[14.5px] leading-relaxed text-slate-400">
              Controle de obras, RDO, cronogramas, financeiro, segurança, materiais e databooks
              integrados em um painel executivo inteligente.
            </p>
          </div>
          <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
            RIGOR © 2026
          </div>
        </div>
      </section>
      <section className="flex items-center justify-center p-6 bg-slate-50">
        <div className="w-full max-w-[480px] bg-white rounded-2xl border border-slate-200/50 p-8 sm:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
          <div className="mb-8 lg:hidden">
            <div className="text-3xl font-black tracking-[.08em] text-slate-900">
              <span className="text-[#ff5a00]">R</span>IGOR
            </div>
          </div>
          <div className="mb-8">
            <h1 className="rigor-title text-3xl font-black leading-none text-slate-900 tracking-tight">
              Entrar no RIGOR
            </h1>
            <p className="mt-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Painel administrativo de controle de obras
            </p>
          </div>
          {(error || serverError) && (
            <div role="alert" aria-live="polite" className="mb-5 rounded-xl border border-red-200 bg-red-50/50 px-4 py-3 text-xs font-semibold text-red-700">
              {friendlyError(serverError || error)}
            </div>
          )}
          {showForgotInfo && (
            <div role="status" aria-live="polite" className="mb-5 rounded-xl border border-blue-200 bg-blue-50/50 px-4 py-3 text-xs font-semibold text-blue-800">
              A redefinição de senha é feita pelo administrador do sistema. Solicite uma nova senha
              e depois altere-a em Configurações.
            </div>
          )}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label
                htmlFor="email"
                className="text-[11px] font-bold text-slate-700 uppercase tracking-wide"
              >
                E-mail
              </Label>
              <div className="relative mt-2">
                <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  {...register('email')}
                  className="h-11 rounded-lg border-slate-200 bg-slate-50/50 pl-11 text-[13.5px] transition-all focus-visible:ring-[#ff5a00]/10 focus-visible:border-[#ff5a00] focus-visible:bg-white"
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
                  className="text-[11px] font-bold text-slate-700 uppercase tracking-wide"
                >
                  Senha
                </Label>
                <button
                  type="button"
                  onClick={() => setShowForgotInfo((v) => !v)}
                  className="min-h-11 rounded-lg px-2 text-[11px] font-bold text-[#ff5a00] transition-colors hover:bg-orange-50 hover:text-[#ef5200]"
                >
                  Esqueci minha senha
                </button>
              </div>
              <div className="relative mt-2">
                <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  {...register('password')}
                  className="h-11 rounded-lg border-slate-200 bg-slate-50/50 pl-11 pr-11 text-[13.5px] transition-all focus-visible:ring-[#ff5a00]/10 focus-visible:border-[#ff5a00] focus-visible:bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-0 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
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
            <p className="text-[11px] font-medium text-slate-500 leading-relaxed">
              {publicSignupEnabled ? (
                <>
                  Ainda não usa o RIGOR?{' '}
                  <Link href="/register" className="font-black text-[#ff5a00] hover:underline">
                    Crie sua empresa e teste por 14 dias
                  </Link>
                  .
                </>
              ) : (
                'Novos acessos são provisionados pela equipe RIGOR.'
              )}
            </p>
            <p className="mt-4 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              Versão 2.2.0
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
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-rigor-orange" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
