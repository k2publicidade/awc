'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { useAuth } from '@/hooks/use-auth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Bell, ChevronDown, KeyRound, LogOut, Menu, Search, Settings, X } from 'lucide-react';

import { ActiveObraSelector } from '@/components/layout/active-obra-selector';

function initials(name?: string | null) {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts[parts.length - 1]?.[0] || '')).toUpperCase() || 'U';
}

// Módulos cuja listagem aceita o parâmetro ?busca= (via CrudModule)
const searchableModules: Record<string, string> = {
  obras: 'obras',
  andamento: 'andamento',
  financeiro: 'financeiro',
  materiais: 'materiais',
  equipe: 'equipe',
  documentos: 'documentos',
  qualidade: 'qualidade',
  seguranca: 'segurança',
  contratos: 'contratos',
  ocorrencias: 'ocorrências',
  orcamentos: 'orçamentos',
};

export function Topbar({ onMenuClick }: { onMenuClick?: () => void }) {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [naoLidas, setNaoLidas] = useState(0);
  const [busca, setBusca] = useState('');
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  const currentModule = pathname.split('/')[1] || '';
  const targetModule = searchableModules[currentModule] ? currentModule : 'obras';
  const targetLabel = searchableModules[targetModule];

  useEffect(() => {
    let active = true;
    const load = () =>
      fetch('/api/notificacoes')
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (active && d) setNaoLidas(d.naoLidas || 0);
        })
        .catch(() => {});
    load();
    const t = setInterval(load, 60000);
    return () => {
      active = false;
      clearInterval(t);
    };
  }, []);

  function submitSearch() {
    const term = busca.trim();
    if (!term) return;
    router.push(`/${targetModule}?busca=${encodeURIComponent(term)}`);
    setBusca('');
    setMobileSearchOpen(false);
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[#AAB4BD]/30 bg-white/90 px-3 sm:px-6 lg:px-8 text-[#0B1F33] backdrop-blur-md shadow-[0_2px_12px_rgba(11,31,51,0.03)] gap-2 sm:gap-4">
      <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 shrink-0 text-[#354654] hover:bg-[#F5F7F6] hover:text-[#0B1F33] lg:hidden"
          onClick={onMenuClick}
          aria-label="Abrir menu"
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Seletor Global de Obra Ativa */}
        <ActiveObraSelector />

        <div className="relative hidden w-full max-w-[340px] xl:max-w-[400px] md:block">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#354654]" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submitSearch()}
            className="h-10 w-full rounded-xl border border-[#AAB4BD]/40 bg-[#F5F7F6]/70 pl-10 pr-4 text-[13px] text-[#0B1F33] placeholder:text-[#354654] outline-none transition-all focus:border-[#1687FF] focus:bg-white focus:ring-4 focus:ring-[#1687FF]/10"
            placeholder={`Buscar em ${targetLabel}... (Enter)`}
            aria-label={`Buscar em ${targetLabel}`}
          />
        </div>
      </div>
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => setMobileSearchOpen((open) => !open)}
          className="flex h-11 w-11 items-center justify-center rounded-lg text-[#354654] transition-colors hover:bg-[#F5F7F6] hover:text-[#0B1F33] md:hidden"
          aria-label={mobileSearchOpen ? 'Fechar busca' : 'Abrir busca'}
          aria-expanded={mobileSearchOpen}
        >
          {mobileSearchOpen ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
        </button>
        <Link
          href="/notificacoes"
          title="Notificações"
          className="relative flex h-11 w-11 items-center justify-center rounded-lg text-[#354654] hover:bg-[#F5F7F6] hover:text-[#0B1F33] transition-colors"
        >
          <Bell className="h-5 w-5 stroke-[2]" />
          {naoLidas > 0 && (
            <span className="absolute right-1 top-1 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-[#1687FF] text-[9px] font-black text-white ring-2 ring-white shadow-xs">
              {naoLidas > 9 ? '9+' : naoLidas}
            </span>
          )}
        </Link>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex h-10 items-center gap-2.5 border-l border-[#AAB4BD]/30 pl-4 cursor-pointer focus:outline-none"
              aria-label="Menu da conta"
            >
              <Avatar className="h-9 w-9 border border-[#AAB4BD]/40">
                <AvatarImage src={(user as DynamicValue)?.avatarUrl} />
                <AvatarFallback className="bg-gradient-to-br from-[#1687FF] to-[#0B1F33] text-[11px] font-black text-white">
                  {initials(user?.name)}
                </AvatarFallback>
              </Avatar>
              <div className="hidden text-left md:block">
                <p className="text-[13px] font-bold leading-none text-[#0B1F33]">
                  {user?.name || 'Usuário'}
                </p>
              </div>
              <ChevronDown className="h-4 w-4 text-[#AAB4BD]" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-56 mt-1 rounded-xl shadow-lg border-[#AAB4BD]/30 bg-white"
          >
            <DropdownMenuLabel className="truncate text-[#354654] font-semibold text-[11px] uppercase tracking-wider px-3 py-2">
              {user?.email || 'Minha conta'}
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-[#F5F7F6]" />
            <DropdownMenuItem
              asChild
              className="rounded-md cursor-pointer mx-1 my-0.5 px-3 py-2 text-[13px] hover:bg-[#F5F7F6]"
            >
              <Link href="/configuracoes">
                <Settings className="mr-2.5 h-4 w-4 text-[#354654]" />
                Configurações
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              asChild
              className="rounded-md cursor-pointer mx-1 my-0.5 px-3 py-2 text-[13px] hover:bg-[#F5F7F6]"
            >
              <Link href="/configuracoes">
                <KeyRound className="mr-2.5 h-4 w-4 text-[#354654]" />
                Alterar senha
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-[#F5F7F6]" />
            <DropdownMenuItem
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="rounded-md cursor-pointer mx-1 my-0.5 px-3 py-2 text-[13px] text-red-600 focus:bg-red-50 focus:text-red-700"
            >
              <LogOut className="mr-2.5 h-4 w-4 text-red-500" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {mobileSearchOpen && (
        <form
          className="absolute inset-x-3 top-[58px] rounded-2xl border border-[#AAB4BD]/30 bg-white p-3 shadow-xl md:hidden"
          onSubmit={(event) => {
            event.preventDefault();
            submitSearch();
          }}
        >
          <label htmlFor="mobile-global-search" className="mb-2 block text-[10px] font-black uppercase tracking-[.16em] text-[#354654]">
            Buscar em {targetLabel}
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#354654]" />
            <input
              id="mobile-global-search"
              autoFocus
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              className="h-11 w-full rounded-xl border border-[#AAB4BD]/40 bg-[#F5F7F6] pl-10 pr-20 text-sm outline-none focus:border-[#1687FF] focus:bg-white focus:ring-4 focus:ring-[#1687FF]/10 text-[#0B1F33]"
              placeholder="Nome, código ou documento"
            />
            <button type="submit" className="absolute right-1.5 top-1.5 h-8 rounded-lg bg-[#1687FF] px-3 text-[10px] font-black text-white">
              Buscar
            </button>
          </div>
        </form>
      )}
    </header>
  );
}
