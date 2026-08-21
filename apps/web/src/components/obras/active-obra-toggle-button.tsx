'use client';

import React from 'react';
import { useObra } from '@/hooks/use-obra';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { Sparkles, Star } from 'lucide-react';

export function ActiveObraToggleButton({
  obraId,
  obraNome,
  className,
}: {
  obraId: string;
  obraNome: string;
  className?: string;
}) {
  const { activeObraId, setActiveObraId } = useObra();
  const isActive = activeObraId === obraId;

  function handleToggle() {
    if (isActive) return;
    setActiveObraId(obraId);
    toast({
      title: 'Obra Ativa Definida',
      description: `"${obraNome}" foi selecionada como sua obra ativa no painel.`,
    });
  }

  if (isActive) {
    return (
      <div
        className={cn(
          'inline-flex h-10 items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50/80 px-4 text-xs font-bold text-emerald-800 shadow-xs ring-2 ring-emerald-500/10',
          className
        )}
      >
        <span className="flex h-2 w-2 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20" />
        <Star className="h-4 w-4 fill-emerald-500 text-emerald-600" />
        <span>Obra Ativa no Momento</span>
      </div>
    );
  }

  return (
    <Button
      type="button"
      onClick={handleToggle}
      className={cn(
        'inline-flex h-10 items-center gap-2 rounded-xl border border-[#1687FF]/30 bg-blue-50/70 px-4 text-xs font-bold text-[#1687FF] shadow-xs transition-all hover:bg-[#1687FF] hover:text-white',
        className
      )}
    >
      <Sparkles className="h-4 w-4" />
      <span>Definir como Obra Ativa</span>
    </Button>
  );
}
