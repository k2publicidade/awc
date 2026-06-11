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
  return <div className="grid min-h-screen bg-white lg:grid-cols-[1.15fr_1fr]">
    <section className="relative hidden overflow-hidden bg-awc-dark lg:block">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(255,122,26,.35),transparent_28rem),linear-gradient(180deg,rgba(7,22,34,.62),rgba(7,22,34,.95))]" />
      <div className="absolute inset-0 opacity-65" style={{backgroundImage:"linear-gradient(135deg, rgba(255,255,255,.08) 0 1px, transparent 1px)", backgroundSize:"36px 36px"}} />
      <div className="relative z-10 flex h-full flex-col justify-between p-12">
        <div><div className="awc-title text-7xl leading-none text-white">AWC</div><div className="mt-1 text-sm font-bold uppercase tracking-[.45em] text-white">Pré Moldados</div></div>
        <div className="max-w-xl"><h2 className="awc-title text-5xl leading-tight text-white">Gestão completa da sua obra, do projeto à entrega.</h2><p className="mt-5 max-w-lg text-lg text-white/70">Controle de obras, RDO, cronograma, financeiro, segurança, materiais e documentos em um único painel executivo.</p></div>
      </div>
    </section>
    <section className="flex items-center justify-center px-6 py-10"><div className="w-full max-w-[520px]">
      <div className="mb-10 lg:hidden"><div className="text-4xl font-black">Obras<span className="text-awc-orange">AWC</span></div></div>
      <div className="mb-9"><h1 className="awc-title text-5xl leading-none text-slate-900">Entrar no ObrasAWC</h1><p className="mt-2 text-lg text-slate-500">Acesse com sua conta cadastrada</p></div>
      {(error || serverError) && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{friendlyError(serverError || error)}</div>}
      {showForgotInfo && <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">A redefinição de senha é feita pelo administrador do sistema. Solicite uma nova senha a ele e depois altere-a em Configurações.</div>}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div><Label htmlFor="email" className="font-bold text-slate-800">E-mail</Label><div className="relative mt-2"><Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500"/><Input id="email" type="email" placeholder="seu@email.com" {...register("email")} className="h-14 pl-12 text-base" /></div>{errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}</div>
        <div><div className="flex items-center justify-between"><Label htmlFor="password" className="font-bold text-slate-800">Senha</Label><button type="button" onClick={() => setShowForgotInfo((v) => !v)} className="text-sm font-semibold text-awc-orange hover:underline">Esqueci minha senha</button></div><div className="relative mt-2"><Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500"/><Input id="password" type={showPassword ? "text" : "password"} placeholder="••••••••" {...register("password")} className="h-14 pl-12 pr-12 text-base"/><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500">{showPassword ? <EyeOff className="h-5 w-5"/> : <Eye className="h-5 w-5"/>}</button></div>{errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}</div>
        <Button type="submit" disabled={isLoading} className="awc-btn-primary h-14 w-full text-lg font-bold">{isLoading && <Loader2 className="mr-2 h-5 w-5 animate-spin"/>}Entrar</Button>
      </form>
      <p className="mt-8 text-sm text-slate-500">Acesso restrito. Não tem conta? Solicite ao administrador do sistema.</p><p className="fixed bottom-7 right-8 text-sm text-slate-400">v2.1.0</p>
    </div></section>
  </div>;
}
export default function LoginPage(){return <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-awc-orange"/></div>}><LoginForm/></Suspense>}
