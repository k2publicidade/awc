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
      className="fixed inset-x-3 bottom-3 z-40 grid h-[68px] grid-cols-5 items-center rounded-[22px] border border-white/10 bg-[#0B1F33]/95 px-2 pb-[env(safe-area-inset-bottom)] text-white shadow-[0_18px_55px_rgba(11,31,51,0.5)] backdrop-blur-xl lg:hidden"
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
                ? '-mt-7 h-16 w-16 justify-self-center rounded-[20px] bg-gradient-to-br from-[#1687FF] to-[#0B1F33] text-white shadow-[0_10px_28px_rgba(22,135,255,0.45)] ring-4 ring-[#F5F7F6]'
                : active
                  ? 'bg-white/10 text-[#1687FF]'
                  : 'text-[#AAB4BD] hover:bg-white/[.06] hover:text-white'
            )}
          >
            <Icon className={cn('h-5 w-5', item.primary && 'h-6 w-6')} />
            <span>{item.label}</span>
            {active && !item.primary && (
              <span className="absolute bottom-0.5 h-1 w-1 rounded-full bg-[#1687FF] shadow-[0_0_6px_#1687FF]" />
            )}
          </Link>
        );
      })}
      <button
        type="button"
        onClick={onMenuClick}
        className="flex h-14 flex-col items-center justify-center gap-1 rounded-2xl text-[9.5px] font-bold text-[#AAB4BD] transition hover:bg-white/[.06] hover:text-white"
        aria-label="Abrir todos os módulos"
      >
        <Menu className="h-5 w-5" />
        <span>Mais</span>
      </button>
    </nav>
  );
}
