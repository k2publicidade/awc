'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import {
  BarChart3,
  Building2,
  Command,
  LayoutDashboard,
  LogOut,
  Menu,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useState } from 'react';

const navigation = [
  { href: '/master', label: 'Visão geral', icon: LayoutDashboard, exact: true },
  { href: '/master#empresas', label: 'Empresas', icon: Building2 },
  { href: '/master/relatorios', label: 'Relatórios', icon: BarChart3 },
];

export function MasterShell({
  children,
  user,
}: {
  children: React.ReactNode;
  user: { name?: string | null; email?: string | null };
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const sidebar = (
    <>
      <div className="flex h-24 items-center border-b border-white/8 px-7">
        <div>
          <div className="flex items-center gap-2 text-xl font-black tracking-[.13em] text-white">
            <span className="text-[#c7ff4a]">R</span>IGOR
            <span className="rounded-sm border border-[#c7ff4a]/30 bg-[#c7ff4a]/10 px-1.5 py-0.5 text-[8px] tracking-[.18em] text-[#c7ff4a]">
              CONTROL
            </span>
          </div>
          <p className="mt-1 text-[9px] font-bold uppercase tracking-[.28em] text-slate-500">
            Plataforma SaaS
          </p>
        </div>
      </div>

      <div className="px-4 py-6">
        <div className="mb-3 px-3 text-[9px] font-black uppercase tracking-[.24em] text-slate-600">
          Comando
        </div>
        <nav className="space-y-1.5" aria-label="Navegação MASTER ADMIN">
          {navigation.map((item) => {
            const active = item.href.includes('#')
              ? false
              : item.exact
                ? pathname === item.href
                : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`group flex items-center gap-3 rounded-md px-3 py-3 text-[12px] font-bold uppercase tracking-[.08em] transition ${
                  active
                    ? 'bg-[#c7ff4a] text-[#071014] shadow-[0_0_24px_rgba(199,255,74,.12)]'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="mt-auto border-t border-white/8 p-4">
        <div className="mb-3 rounded-md border border-white/8 bg-white/[.025] p-3">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.12em] text-[#c7ff4a]">
            <ShieldCheck className="h-3.5 w-3.5" /> MASTER ADMIN
          </div>
          <p className="mt-2 truncate text-xs font-semibold text-slate-300">{user.name}</p>
          <p className="mt-0.5 truncate text-[10px] text-slate-600">{user.email}</p>
        </div>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-[11px] font-bold uppercase tracking-[.1em] text-slate-500 transition hover:bg-red-500/10 hover:text-red-300"
        >
          <LogOut className="h-4 w-4" /> Encerrar sessão
        </button>
      </div>
    </>
  );

  return (
    <div className="master-root min-h-screen bg-[#071014] text-slate-100">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[248px] flex-col border-r border-white/8 bg-[#091317] lg:flex">
        {sidebar}
      </aside>

      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-white/8 bg-[#071014]/90 px-5 backdrop-blur lg:hidden">
        <div className="flex items-center gap-2 text-base font-black tracking-[.14em] text-white">
          <Command className="h-4 w-4 text-[#c7ff4a]" /> RIGOR CONTROL
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-md border border-white/10 p-2 text-slate-300"
          aria-label="Abrir menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      </header>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            className="absolute inset-0 bg-black/75"
            onClick={() => setOpen(false)}
            aria-label="Fechar menu"
          />
          <aside className="relative flex h-full w-[280px] flex-col border-r border-white/10 bg-[#091317]">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-4 top-5 z-10 p-2 text-slate-400"
              aria-label="Fechar menu"
            >
              <X className="h-5 w-5" />
            </button>
            {sidebar}
          </aside>
        </div>
      )}

      <main className="min-h-screen lg:pl-[248px]">{children}</main>
    </div>
  );
}
