'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
export function CookieNotice() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(
      () => setVisible(localStorage.getItem('rigor-cookie-notice') !== 'seen'),
      0
    );
    return () => window.clearTimeout(timer);
  }, []);
  if (!visible) return null;
  return <aside className="fixed bottom-4 left-4 right-4 z-[100] mx-auto flex max-w-3xl flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600 shadow-2xl sm:flex-row sm:items-center">
    <p className="flex-1 leading-6">Usamos somente tecnologias necessárias para autenticação, segurança e funcionamento. <Link className="font-bold text-[#e85109]" href="/cookies">Saiba mais</Link>.</p>
    <button onClick={() => { localStorage.setItem('rigor-cookie-notice', 'seen'); setVisible(false); }} className="h-10 rounded-lg bg-[#071018] px-5 text-xs font-black text-white">Entendi</button>
  </aside>;
}
