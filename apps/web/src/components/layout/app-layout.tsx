'use client';
import { useState } from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { Topbar } from '@/components/layout/topbar';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { MobileDock } from '@/components/layout/mobile-dock';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800">
      <div className="hidden lg:block">
        <Sidebar />
      </div>
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[253px] border-0 bg-[#060c13] p-0">
          <SheetTitle className="sr-only">Menu de navegação</SheetTitle>
          <SheetDescription className="sr-only">Acesse os módulos do RIGOR</SheetDescription>
          <Sidebar mobile onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>
      <div className="lg:pl-[253px]">
        <Topbar onMenuClick={() => setMobileOpen(true)} />
        <main className="min-h-[calc(100vh-64px)] p-4 pb-28 sm:p-6 sm:pb-28 lg:p-8 lg:pb-8">
          {children}
        </main>
      </div>
      <MobileDock onMenuClick={() => setMobileOpen(true)} />
    </div>
  );
}
