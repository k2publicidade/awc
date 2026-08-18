import Link from 'next/link';
import { Compass } from 'lucide-react';
import { RigorLogo } from '@/components/ui/rigor-logo';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#F5F7F6] px-6 text-center">
      <div className="mb-6">
        <RigorLogo markSize={36} theme="light" showTagline={true} taglineText="BUILT ON PRECISION" />
      </div>
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#1687FF]/10 text-[#1687FF] shadow-inner">
        <Compass className="h-8 w-8 text-[#1687FF]" />
      </div>
      <p className="mt-6 text-xs font-black uppercase tracking-[.25em] text-[#1687FF]">Erro 404</p>
      <h1 className="rigor-title mt-2 text-4xl text-[#0B1F33]">Página não encontrada</h1>
      <p className="mt-3 max-w-md text-sm text-[#354654]">
        O endereço que você acessou não existe ou foi movido. Volte ao painel para continuar a
        gestão das suas obras com precisão.
      </p>
      <Link
        href="/dashboard"
        className="rigor-btn-primary mt-7 inline-flex h-11 items-center rounded-xl px-6 text-xs font-bold uppercase tracking-wider text-white"
      >
        Ir para o Dashboard
      </Link>
    </div>
  );
}
