"use client";
import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginInput } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const error = searchParams.get("error");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState("");
  const [showForgotInfo, setShowForgotInfo] = useState(false);
  const friendlyError = (e?: string | null) =>
    !e ? "" : e === "CredentialsSignin" ? "Email ou senha incorretos" : e === "AccessDenied" ? "Acesso negado para esta conta" : e;
  const { register, handleSubmit, formState: { errors } } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });
  async function onSubmit(data: LoginInput) {
    setIsLoading(true); setServerError("");
    const result = await signIn("credentials", { email: data.email, password: data.password, redirect: false });
    if (result?.error) { setServerError(result.error); setIsLoading(false); return; }
    router.push(callbackUrl); router.refresh();
  }
  return (
    <div className="grid min-h-screen bg-slate-50 lg:grid-cols-[1.1fr_1fr]">
      <section className="relative hidden overflow-hidden bg-[#04080e] lg:block">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(255,90,0,0.22),transparent_35rem),radial-gradient(circle_at_20%_80%,rgba(13,110,253,0.1),transparent_30rem)]" />
        <div className="absolute inset-0 opacity-20" style={{backgroundImage:"linear-gradient(135deg, rgba(255,255,255,.05) 0 1px, transparent 1px)", backgroundSize:"24px 24px"}} />
        <div className="relative z-10 flex h-full flex-col justify-between p-16">
          <div>
            <div className="text-5xl font-black leading-none text-white tracking-[-0.05em]">AWC</div>
            <div className="mt-1 text-[9px] font-black uppercase tracking-[0.55em] text-[#ff5a00]">Pré Moldados</div>
          </div>
          <div className="max-w-md">
            <h2 className="awc-title text-5xl leading-[1.1] text-white tracking-tight">Gestão completa da sua obra, do projeto à entrega.</h2>
            <p className="mt-6 text-[14.5px] leading-relaxed text-slate-400">Controle de obras, RDO, cronogramas, financeiro, segurança, materiais e databooks integrados em um painel executivo inteligente.</p>
          </div>
          <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">AWC Pré Moldados © 2026</div>
        </div>
      </section>
      <section className="flex items-center justify-center p-6 bg-slate-50">
        <div className="w-full max-w-[480px] bg-white rounded-2xl border border-slate-200/50 p-8 sm:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
          <div className="mb-8 lg:hidden">
            <div className="text-3xl font-black tracking-tighter">Obras<span className="text-[#ff5a00]">AWC</span></div>
          </div>
          <div className="mb-8">
            <h1 className="awc-title text-3xl font-black leading-none text-slate-900 tracking-tight">Entrar no ObrasAWC</h1>
            <p className="mt-2 text-xs font-semibold text-slate-450 uppercase tracking-wider">Painel administrativo de controle de obras</p>
          </div>
          {(error || serverError) && (
            <div className="mb-5 rounded-xl border border-red-200 bg-red-50/50 px-4 py-3 text-xs font-semibold text-red-700">{friendlyError(serverError || error)}</div>
          )}
          {showForgotInfo && (
            <div className="mb-5 rounded-xl border border-blue-200 bg-blue-50/50 px-4 py-3 text-xs font-semibold text-blue-800">A redefinição de senha é feita pelo administrador do sistema. Solicite uma nova senha e depois altere-a em Configurações.</div>
          )}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="email" className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">E-mail</Label>
              <div className="relative mt-2">
                <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input id="email" type="email" placeholder="seu@email.com" {...register("email")} className="h-11 rounded-lg border-slate-200 bg-slate-50/50 pl-11 text-[13.5px] transition-all focus-visible:ring-[#ff5a00]/10 focus-visible:border-[#ff5a00] focus-visible:bg-white" />
              </div>
              {errors.email && <p className="mt-1 text-xs text-red-500 font-medium">{errors.email.message}</p>}
            </div>
            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">Senha</Label>
                <button type="button" onClick={() => setShowForgotInfo((v) => !v)} className="text-[11px] font-bold text-[#ff5a00] hover:text-[#ef5200] transition-colors">Esqueci minha senha</button>
              </div>
              <div className="relative mt-2">
                <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input id="password" type={showPassword ? "text" : "password"} placeholder="••••••••" {...register("password")} className="h-11 rounded-lg border-slate-200 bg-slate-50/50 pl-11 pr-11 text-[13.5px] transition-all focus-visible:ring-[#ff5a00]/10 focus-visible:border-[#ff5a00] focus-visible:bg-white" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">{showPassword ? <EyeOff className="h-4.5 w-4.5"/> : <Eye className="h-4.5 w-4.5"/>}</button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-red-500 font-medium">{errors.password.message}</p>}
            </div>
            <Button type="submit" disabled={isLoading} className="awc-btn-primary h-11 w-full text-xs font-bold uppercase tracking-wider rounded-lg mt-2">{isLoading && <Loader2 className="mr-2 h-4.5 w-4.5 animate-spin"/>}Acessar Painel</Button>
          </form>
          <div className="mt-8 text-center">
            <p className="text-[11px] font-medium text-slate-450 leading-relaxed">Acesso restrito. Não possui cadastro? Contate o gerente de obras ou o administrador local.</p>
            <p className="mt-4 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Versão 2.2.0</p>
          </div>
        </div>
      </section>
    </div>
  );
}
export default function LoginPage(){return <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-awc-orange"/></div>}><LoginForm/></Suspense>}
