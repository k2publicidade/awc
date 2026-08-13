'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound, Loader2, ShieldCheck } from 'lucide-react';

export default function RequiredPasswordChangePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Não foi possível alterar a senha');
      router.push('/');
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível alterar a senha');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#071014] p-5 text-slate-100">
      <div className="w-full max-w-md rounded-lg border border-white/10 bg-[#0b171c] p-6 shadow-2xl sm:p-8">
        <div className="mb-7 grid h-12 w-12 place-items-center rounded-md border border-[#c7ff4a]/20 bg-[#c7ff4a]/10 text-[#c7ff4a]"><ShieldCheck className="h-5 w-5" /></div>
        <p className="text-[9px] font-black uppercase tracking-[.22em] text-[#c7ff4a]">Proteção da conta</p>
        <h1 className="mt-3 text-3xl font-bold uppercase text-white">Crie sua senha definitiva</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-500">Você entrou com uma senha temporária. Defina uma nova senha antes de acessar os dados da empresa.</p>
        {error && <div className="mt-5 rounded-md border border-red-400/20 bg-red-400/8 p-3 text-xs text-red-200">{error}</div>}
        <form onSubmit={submit} className="mt-6 space-y-4">
          <PasswordField label="Senha temporária atual" name="currentPassword" autoComplete="current-password" />
          <PasswordField label="Nova senha" name="newPassword" autoComplete="new-password" />
          <PasswordField label="Confirmar nova senha" name="confirmNewPassword" autoComplete="new-password" />
          <p className="text-[10px] leading-relaxed text-slate-600">Use pelo menos 10 caracteres, incluindo maiúscula, minúscula e número.</p>
          <button type="submit" disabled={loading} className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#c7ff4a] text-[10px] font-black uppercase tracking-[.12em] text-[#071014] transition hover:brightness-110 disabled:opacity-50">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />} Salvar e acessar o RIGOR
          </button>
        </form>
      </div>
    </main>
  );
}

function PasswordField({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return <label className="block"><span className="mb-2 block text-[9px] font-black uppercase tracking-[.12em] text-slate-500">{label}</span><input {...props} type="password" required minLength={10} className="h-11 w-full rounded-md border border-white/10 bg-white/[.035] px-3 text-sm text-white outline-none transition focus:border-[#c7ff4a]/50 focus:ring-3 focus:ring-[#c7ff4a]/5" /></label>;
}
