import Link from 'next/link';
import { RigorLogo } from '@/components/ui/rigor-logo';

export function LegalPage({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[#F5F7F6] text-[#0B1F33]">
      <header className="border-b border-white/10 bg-[#0B1F33] text-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <Link href="/" className="flex items-center">
            <RigorLogo markSize={32} theme="dark" showTagline={true} taglineText="GESTÃO DE OBRAS" />
          </Link>
          <Link
            href="/"
            className="text-xs font-bold text-[#AAB4BD] hover:text-white transition-colors"
          >
            Voltar ao site
          </Link>
        </div>
      </header>
      <article className="mx-auto max-w-5xl px-6 py-12 sm:py-16">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#1687FF]/30 bg-[#1687FF]/10 px-3 py-1 text-xs font-black uppercase tracking-[0.2em] text-[#1687FF]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#1687FF]" />
          RIGOR LEGAL
        </div>
        <h1 className="mt-4 text-4xl font-black tracking-[-.03em] text-[#0B1F33] sm:text-5xl">
          {title}
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-[#354654]">{description}</p>
        <p className="mt-4 text-xs font-bold text-[#AAB4BD]">
          Última atualização: Agosto de {new Date().getFullYear()} · Versão 2.2
        </p>
        <div className="mt-10 space-y-8 rounded-2xl border border-[#AAB4BD]/30 bg-white p-6 shadow-sm sm:p-10 [&_h2]:text-xl [&_h2]:font-black [&_h2]:text-[#0B1F33] [&_li]:leading-7 [&_li]:text-[#354654] [&_p]:leading-7 [&_p]:text-[#354654] [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6">
          {children}
        </div>
      </article>
    </main>
  );
}
