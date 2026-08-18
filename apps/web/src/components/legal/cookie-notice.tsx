'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
export function CookieNotice() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(
      () => setVisible(localStorage.getItem('rigor-cookie-notice') !== 'seen'),
      0
    );
    return () => window.clearTimeout(timer);
  }, []);
  const publicRoutes = ['/', '/login', '/register', '/privacidade', '/termos', '/cookies'];
  if (!visible || !publicRoutes.includes(pathname)) return null;
  return <aside aria-label="Aviso de cookies" className="fixed bottom-3 left-3 right-3 z-50 mx-auto flex max-w-2xl flex-col gap-3 rounded-2xl border border-slate-200 bg-white/95 p-4 text-xs text-slate-600 shadow-2xl backdrop-blur sm:bottom-4 sm:flex-row sm:items-center">
    <p className="flex-1 leading-6">Usamos somente tecnologias necessárias para autenticação, segurança e funcionamento. <Link className="font-bold text-[#e85109]" href="/cookies">Saiba mais</Link>.</p>
    <button onClick={() => { localStorage.setItem('rigor-cookie-notice', 'seen'); setVisible(false); }} className="min-h-11 rounded-lg bg-[#071018] px-5 text-xs font-black text-white">Entendi</button>
  </aside>;
}
