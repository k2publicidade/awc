import Link from 'next/link';
import { HardHat } from 'lucide-react';

export function LegalPage({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[#f4f6f8] text-slate-800">
      <header className="border-b border-white/10 bg-[#071018] text-white"><div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <Link href="/" className="flex items-center gap-3 font-black tracking-[.08em]"><span className="grid h-9 w-9 place-items-center rounded-lg bg-[#ff5a00]"><HardHat className="h-4 w-4" /></span>RIGOR</Link>
        <Link href="/" className="text-xs font-bold text-slate-300 hover:text-white">Voltar ao site</Link>
      </div></header>
      <article className="mx-auto max-w-5xl px-6 py-12 sm:py-16">
        <p className="text-xs font-black uppercase tracking-[.2em] text-[#e85109]">RIGOR OBRAS</p>
        <h1 className="mt-3 text-4xl font-black tracking-[-.04em] text-slate-950 sm:text-5xl">{title}</h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">{description}</p>
        <p className="mt-4 text-xs font-bold text-slate-400">Versão de 12 de agosto de 2026</p>
        <div className="mt-10 space-y-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10 [&_h2]:text-xl [&_h2]:font-black [&_h2]:text-slate-950 [&_li]:leading-7 [&_p]:leading-7 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6">{children}</div>
      </article>
    </main>
  );
}
