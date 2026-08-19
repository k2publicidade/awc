'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useObra, type ObraItem } from '@/hooks/use-obra';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import {
  Building2,
  Check,
  ChevronDown,
  Globe,
  HardHat,
  MapPin,
  Plus,
  Search,
  Sparkles,
} from 'lucide-react';

const statusDotColors: Record<string, string> = {
  EM_ANDAMENTO: 'bg-emerald-500 ring-emerald-500/20',
  PLANEJAMENTO: 'bg-blue-500 ring-blue-500/20',
  PAUSADO: 'bg-amber-500 ring-amber-500/20',
  CONCLUIDO: 'bg-slate-400 ring-slate-400/20',
  CANCELADO: 'bg-red-500 ring-red-500/20',
};

const statusLabels: Record<string, string> = {
  EM_ANDAMENTO: 'Em Andamento',
  PLANEJAMENTO: 'Planejamento',
  PAUSADO: 'Pausado',
  CONCLUIDO: 'Concluído',
  CANCELADO: 'Cancelado',
};

export function ActiveObraSelector({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  const { obras, activeObraId, activeObra, isAllObras, selectObra, isLoading } = useObra();
  const [searchTerm, setSearchTerm] = useState('');
  const [open, setOpen] = useState(false);

  const filteredObras = useMemo(() => {
    if (!searchTerm.trim()) return obras;
    const term = searchTerm.toLowerCase().trim();
    return obras.filter(
      (o) =>
        o.nome.toLowerCase().includes(term) ||
        o.codigo.toLowerCase().includes(term) ||
        (o.cidade && o.cidade.toLowerCase().includes(term))
    );
  }, [obras, searchTerm]);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            'group flex h-10 items-center gap-2.5 rounded-xl border border-[#AAB4BD]/40 bg-[#F5F7F6]/90 px-3 text-left transition-all duration-150',
            'hover:border-[#1687FF]/50 hover:bg-white hover:shadow-xs focus:outline-none focus:ring-2 focus:ring-[#1687FF]/20',
            activeObra && 'border-[#1687FF]/30 bg-blue-50/40',
            className
          )}
          aria-label="Selecionar obra ativa"
        >
          <div
            className={cn(
              'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border transition-colors',
              isAllObras
                ? 'border-slate-200 bg-slate-100 text-slate-600 group-hover:border-[#1687FF]/40 group-hover:text-[#1687FF]'
                : 'border-[#1687FF]/30 bg-[#1687FF]/10 text-[#1687FF]'
            )}
          >
            {isAllObras ? (
              <Globe className="h-4 w-4" />
            ) : (
              <Building2 className="h-4 w-4" />
            )}
          </div>

          <div className="flex min-w-0 flex-col justify-center">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#354654]/80 flex items-center gap-1">
              Obra Ativa
              {!isAllObras && activeObra?.status && (
                <span
                  className={cn(
                    'h-1.5 w-1.5 rounded-full ring-2',
                    statusDotColors[activeObra.status] || 'bg-slate-400'
                  )}
                />
              )}
            </span>
            <span
              className={cn(
                'truncate font-bold leading-none text-[#0B1F33]',
                compact ? 'max-w-[130px] text-[12px]' : 'max-w-[170px] sm:max-w-[220px] text-[13px]'
              )}
            >
              {isLoading
                ? 'Carregando...'
                : isAllObras
                  ? 'Todas as Obras (Visão Global)'
                  : activeObra?.nome || 'Selecionar Obra'}
            </span>
          </div>

          <ChevronDown className="ml-auto h-4 w-4 shrink-0 text-[#AAB4BD] transition-transform group-hover:text-[#0B1F33]" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        className="w-80 sm:w-96 rounded-2xl border-[#AAB4BD]/30 bg-white p-2 shadow-2xl z-50 animate-in fade-in-50 zoom-in-95"
      >
        <DropdownMenuLabel className="px-2 py-1.5 text-xs font-black uppercase tracking-wider text-[#354654]">
          Gerenciar Obra Ativa
        </DropdownMenuLabel>

        {/* Input de Busca Rápida */}
        <div className="relative px-1 pb-2">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#AAB4BD]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filtrar por nome, código ou cidade..."
            className="h-8 w-full rounded-lg border border-[#AAB4BD]/40 bg-[#F5F7F6] pl-8 pr-3 text-xs text-[#0B1F33] placeholder:text-[#AAB4BD] outline-none transition focus:border-[#1687FF] focus:bg-white focus:ring-2 focus:ring-[#1687FF]/10"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          />
        </div>

        <DropdownMenuSeparator className="bg-[#F5F7F6]" />

        {/* Opção Todas as Obras */}
        <DropdownMenuItem
          onClick={() => {
            selectObra('all');
            setOpen(false);
          }}
          className={cn(
            'flex items-center justify-between rounded-xl px-3 py-2.5 cursor-pointer text-xs font-semibold transition-colors',
            isAllObras
              ? 'bg-[#1687FF]/10 text-[#1687FF]'
              : 'text-[#0B1F33] hover:bg-[#F5F7F6]'
          )}
        >
          <div className="flex items-center gap-2.5">
            <div
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded-lg border',
                isAllObras
                  ? 'border-[#1687FF]/40 bg-white text-[#1687FF]'
                  : 'border-slate-200 bg-slate-50 text-slate-500'
              )}
            >
              <Globe className="h-4 w-4" />
            </div>
            <div>
              <p className="font-bold leading-tight">Todas as Obras</p>
              <p className="text-[11px] font-normal text-slate-500">
                Visão consolidada do portfólio ({obras.length} obras)
              </p>
            </div>
          </div>
          {isAllObras && <Check className="h-4 w-4 text-[#1687FF]" />}
        </DropdownMenuItem>

        <DropdownMenuSeparator className="bg-[#F5F7F6]" />

        {/* Lista de Obras com Scroll */}
        <div className="max-h-64 overflow-y-auto space-y-1 py-1 pr-1 scrollbar-thin">
          {filteredObras.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-500">
              {searchTerm
                ? `Nenhuma obra encontrada para "${searchTerm}"`
                : 'Nenhuma obra cadastrada'}
            </div>
          ) : (
            filteredObras.map((obra) => {
              const isCurrent = activeObraId === obra.id;
              return (
                <DropdownMenuItem
                  key={obra.id}
                  onClick={() => {
                    selectObra(obra);
                    setOpen(false);
                  }}
                  className={cn(
                    'flex items-center justify-between rounded-xl px-3 py-2 cursor-pointer text-xs transition-colors',
                    isCurrent
                      ? 'bg-[#1687FF]/10 text-[#1687FF]'
                      : 'text-[#0B1F33] hover:bg-[#F5F7F6]'
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div
                      className={cn(
                        'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border',
                        isCurrent
                          ? 'border-[#1687FF]/40 bg-white text-[#1687FF]'
                          : 'border-slate-200 bg-slate-50 text-slate-500'
                      )}
                    >
                      <HardHat className="h-4 w-4" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p
                          className={cn(
                            'truncate font-bold leading-tight',
                            isCurrent ? 'text-[#1687FF]' : 'text-slate-900'
                          )}
                        >
                          {obra.nome}
                        </p>
                        {obra.status && (
                          <span
                            className={cn(
                              'h-1.5 w-1.5 shrink-0 rounded-full ring-1',
                              statusDotColors[obra.status] || 'bg-slate-400'
                            )}
                            title={statusLabels[obra.status] || obra.status}
                          />
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-0.5 text-[10.5px] text-slate-500 font-medium">
                        <span className="font-mono">{obra.codigo}</span>
                        {obra.cidade && (
                          <span className="flex items-center gap-0.5 truncate">
                            <MapPin className="h-2.5 w-2.5" />
                            {obra.cidade}
                            {obra.estado ? `/${obra.estado}` : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {isCurrent && <Check className="h-4 w-4 text-[#1687FF] shrink-0 ml-2" />}
                </DropdownMenuItem>
              );
            })
          )}
        </div>

        <DropdownMenuSeparator className="bg-[#F5F7F6]" />

        {/* Rodapé com atalhos */}
        <div className="flex items-center justify-between p-1.5 pt-1">
          <Link
            href="/obras"
            onClick={() => setOpen(false)}
            className="text-[11px] font-bold text-slate-500 hover:text-[#1687FF] transition-colors px-2 py-1 rounded"
          >
            Ver todas ({obras.length})
          </Link>
          <Link
            href="/obras/novo"
            onClick={() => setOpen(false)}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-[#1687FF] hover:bg-[#1687FF]/10 px-2.5 py-1 rounded-lg transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Nova obra
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
