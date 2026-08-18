'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { sidebarNav } from '@/lib/navigation';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Settings } from 'lucide-react';

const roleLabel: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Administrador',
  ENGENHEIRO: 'Engenheiro',
  ENCARREGADO: 'Encarregado',
  FINANCEIRO: 'Financeiro',
  ALMOXARIFE: 'Almoxarife',
  CLIENTE: 'Cliente',
};

function initials(name?: string | null) {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts[parts.length - 1]?.[0] || '')).toUpperCase() || 'U';
}

export function Sidebar({
  mobile = false,
  onNavigate,
}: {
  mobile?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const { user } = useAuth();
  const userRole = (user as DynamicValue)?.role || 'SUPER_ADMIN';
  const filteredNav = sidebarNav.filter((item) => item.roles.includes(userRole));

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 flex h-screen w-[253px] flex-col overflow-hidden border-r border-slate-900/50 bg-[#060c13] text-white shadow-[10px_0_30px_rgba(0,0,0,0.25)]',
        mobile && 'relative h-full'
      )}
    >
      <div className="flex h-16 items-center border-b border-slate-900/40 px-6">
        <div className="text-[25px] font-black leading-none tracking-[.12em]">
          <span className="text-[#ff5a00]">R</span>
          <span className="text-white">IGOR</span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5 scrollbar-thin">
        {filteredNav.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.title}
              onClick={onNavigate}
              className={cn(
                'group relative flex h-[42px] items-center gap-3.5 rounded-lg px-4 text-[14px] font-semibold transition-all duration-200',
                active
                  ? 'bg-gradient-to-r from-[#ff5a00]/12 to-[#ff5a00]/2 text-[#ff5a00]'
                  : 'text-slate-400 hover:bg-white/[0.04] hover:text-white'
              )}
            >
              {active && (
                <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-[#ff5a00]" />
              )}
              <Icon
                className={cn(
                  'h-[19px] w-[19px] shrink-0 stroke-[2] transition-colors',
                  active ? 'text-[#ff5a00]' : 'text-slate-400 group-hover:text-white'
                )}
              />
              <span className="truncate">{item.title}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-900/40 p-4 bg-[#04080d]/60">
        <Link
          href="/configuracoes"
          title="Minha conta e configurações"
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-xl p-2 transition-all duration-200 hover:bg-white/[0.05]"
        >
          <Avatar className="h-10 w-10 border border-slate-800 ring-2 ring-[#ff5a00]/10">
            <AvatarImage src={(user as DynamicValue)?.avatarUrl} />
            <AvatarFallback className="bg-gradient-to-br from-[#ff5a00] to-[#ff7a1a] text-[12px] font-black text-white">
              {initials(user?.name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 text-left">
            <p className="truncate text-[13px] font-bold leading-tight text-slate-100">
              {user?.name || 'Usuário'}
            </p>
            <p className="mt-0.5 truncate text-[11px] font-semibold text-slate-400">
              {roleLabel[userRole] || userRole}
            </p>
          </div>
          <Settings className="h-4 w-4 shrink-0 text-slate-500 transition-colors hover:text-slate-300" />
        </Link>
      </div>
    </aside>
  );
}
