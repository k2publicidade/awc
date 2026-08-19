'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { sidebarNav } from '@/lib/navigation';
import { useAuth } from '@/hooks/use-auth';
import { useObra } from '@/hooks/use-obra';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Building2, Globe, HardHat, Settings, SlidersHorizontal } from 'lucide-react';
import { RigorLogo } from '@/components/ui/rigor-logo';

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
  const { activeObra, isAllObras } = useObra();
  const userRole = (user as DynamicValue)?.role || 'SUPER_ADMIN';
  const filteredNav = sidebarNav.filter((item) => item.roles.includes(userRole));

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 flex h-screen w-[253px] flex-col overflow-hidden border-r border-[#354654]/30 bg-[#0B1F33] text-white shadow-[10px_0_30px_rgba(11,31,51,0.35)]',
        mobile && 'relative h-full'
      )}
    >
      <div className="flex h-16 items-center border-b border-[#354654]/40 px-5">
        <Link href="/dashboard" className="flex items-center">
          <RigorLogo markSize={30} theme="dark" showTagline={true} taglineText="GESTÃO DE OBRAS" />
        </Link>
      </div>

      {/* Widget de Obra em Foco no Sidebar */}
      <div className="border-b border-[#354654]/40 px-3 py-2.5 bg-[#071524]/50">
        <div className="flex items-center justify-between px-1 mb-1">
          <span className="text-[10px] font-black uppercase tracking-[0.14em] text-[#AAB4BD]">
            Obra Ativa
          </span>
          <Link
            href="/obras"
            onClick={onNavigate}
            title="Gerenciar Obras"
            className="text-[10px] font-bold text-[#1687FF] hover:underline"
          >
            Obras
          </Link>
        </div>

        <Link
          href={activeObra ? `/obras/${activeObra.id}` : '/obras'}
          onClick={onNavigate}
          className="group flex items-center gap-2.5 rounded-xl bg-white/[0.04] p-2 hover:bg-white/[0.08] transition-all border border-white/5 hover:border-[#1687FF]/30"
        >
          <div
            className={cn(
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-colors',
              isAllObras
                ? 'border-white/10 bg-white/5 text-[#AAB4BD] group-hover:text-white'
                : 'border-[#1687FF]/40 bg-[#1687FF]/10 text-[#1687FF]'
            )}
          >
            {isAllObras ? (
              <Globe className="h-4 w-4" />
            ) : (
              <Building2 className="h-4 w-4" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12.5px] font-bold text-white group-hover:text-[#1687FF] transition-colors leading-tight">
              {isAllObras ? 'Todas as Obras' : activeObra?.nome}
            </p>
            <p className="truncate text-[10.5px] font-semibold text-[#AAB4BD]">
              {isAllObras
                ? 'Visão Global'
                : `${activeObra?.codigo || 'OBR'} ${activeObra?.cidade ? `· ${activeObra.cidade}` : ''}`}
            </p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1.5 scrollbar-thin">
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
                  ? 'bg-gradient-to-r from-[#1687FF]/20 to-[#1687FF]/5 text-[#1687FF] shadow-xs'
                  : 'text-[#AAB4BD] hover:bg-white/[0.06] hover:text-white'
              )}
            >
              {active && (
                <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-[#1687FF] shadow-[0_0_8px_#1687FF]" />
              )}
              <Icon
                className={cn(
                  'h-[19px] w-[19px] shrink-0 stroke-[2] transition-colors',
                  active ? 'text-[#1687FF]' : 'text-[#AAB4BD] group-hover:text-white'
                )}
              />
              <span className="truncate">{item.title}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-[#354654]/40 p-4 bg-[#071524]/70">
        <Link
          href="/configuracoes"
          title="Minha conta e configurações"
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-xl p-2 transition-all duration-200 hover:bg-white/[0.06]"
        >
          <Avatar className="h-10 w-10 border border-[#354654] ring-2 ring-[#1687FF]/20">
            <AvatarImage src={(user as DynamicValue)?.avatarUrl} />
            <AvatarFallback className="bg-gradient-to-br from-[#1687FF] to-[#0B1F33] text-[12px] font-black text-white">
              {initials(user?.name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 text-left">
            <p className="truncate text-[13px] font-bold leading-tight text-white">
              {user?.name || 'Usuário'}
            </p>
            <p className="mt-0.5 truncate text-[11px] font-semibold text-[#AAB4BD]">
              {roleLabel[userRole] || userRole}
            </p>
          </div>
          <Settings className="h-4 w-4 shrink-0 text-[#AAB4BD] transition-colors hover:text-white" />
        </Link>
      </div>
    </aside>
  );
}
