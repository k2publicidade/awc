import Link from "next/link";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#f4f6f8] px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-orange-50">
        <Compass className="h-8 w-8 text-awc-orange" />
      </div>
      <p className="mt-6 text-sm font-black uppercase tracking-[.3em] text-awc-orange">Erro 404</p>
      <h1 className="awc-title mt-2 text-4xl text-slate-900">Página não encontrada</h1>
      <p className="mt-3 max-w-md text-sm text-slate-500">
        O endereço que você acessou não existe ou foi movido. Volte ao painel para continuar a gestão das suas obras.
      </p>
      <Link
        href="/dashboard"
        className="mt-7 inline-flex h-11 items-center rounded-md bg-gradient-to-br from-[#ff4d00] to-[#ff7a1a] px-6 text-sm font-bold text-white shadow-[0_10px_22px_rgba(255,77,0,.22)] transition hover:brightness-95"
      >
        Ir para o Dashboard
      </Link>
    </div>
  );
}
