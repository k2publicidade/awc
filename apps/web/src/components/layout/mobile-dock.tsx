'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Building2, Camera, ClipboardPlus, LayoutDashboard, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';

const items = [
  { href: '/dashboard', label: 'Início', icon: LayoutDashboard },
  { href: '/obras', label: 'Obras', icon: Building2 },
  { href: '/rdo/novo', label: 'Novo RDO', icon: ClipboardPlus, primary: true },
  { href: '/galeria', label: 'Fotos', icon: Camera },
];

export function MobileDock({ onMenuClick }: { onMenuClick: () => void }) {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-3 bottom-3 z-40 grid h-[68px] grid-cols-5 items-center rounded-[22px] border border-white/10 bg-[#07131d]/95 px-2 pb-[env(safe-area-inset-bottom)] text-white shadow-[0_18px_55px_rgba(2,8,14,.42)] backdrop-blur-xl lg:hidden"
      aria-label="Ações principais"
    >
      {items.map((item) => {
        const active = pathname === item.href || (!item.primary && pathname.startsWith(`${item.href}/`));
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'relative flex h-14 flex-col items-center justify-center gap-1 rounded-2xl text-[9.5px] font-bold transition',
              item.primary
                ? '-mt-7 h-16 w-16 justify-self-center rounded-[20px] bg-gradient-to-br from-[#ff5a00] to-[#ff7a1a] text-white shadow-[0_10px_28px_rgba(255,90,0,.45)] ring-4 ring-[#f4f6f8]'
                : active
                  ? 'bg-white/10 text-white'
                  : 'text-slate-400 hover:bg-white/[.06] hover:text-white'
            )}
          >
            <Icon className={cn('h-5 w-5', item.primary && 'h-6 w-6')} />
            <span>{item.label}</span>
            {active && !item.primary && (
              <span className="absolute bottom-0.5 h-1 w-1 rounded-full bg-[#ff5a00]" />
            )}
          </Link>
        );
      })}
      <button
        type="button"
        onClick={onMenuClick}
        className="flex h-14 flex-col items-center justify-center gap-1 rounded-2xl text-[9.5px] font-bold text-slate-400 transition hover:bg-white/[.06] hover:text-white"
        aria-label="Abrir todos os módulos"
      >
        <Menu className="h-5 w-5" />
        <span>Mais</span>
      </button>
    </nav>
  );
}
