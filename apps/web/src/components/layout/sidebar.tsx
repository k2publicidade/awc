"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { sidebarNav } from "@/lib/navigation";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Settings } from "lucide-react";

const roleLabel: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Administrador",
  ENGENHEIRO: "Engenheiro",
  ENCARREGADO: "Encarregado",
  FINANCEIRO: "Financeiro",
  ALMOXARIFE: "Almoxarife",
  CLIENTE: "Cliente",
};

function initials(name?: string | null) {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || "") + (parts[parts.length - 1]?.[0] || "")).toUpperCase() || "U";
}

export function Sidebar({ mobile = false, onNavigate }: { mobile?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const userRole = (user as any)?.role || "SUPER_ADMIN";
  const filteredNav = sidebarNav.filter((item) => item.roles.includes(userRole));

  return (
    <aside className={cn("fixed left-0 top-0 z-40 flex h-screen w-[253px] flex-col overflow-hidden border-r border-white/10 bg-[#0b1a25] text-white shadow-[8px_0_28px_rgba(5,14,22,.16)]", mobile && "relative h-full")}>
      <div className="flex h-16 items-center border-b border-white/10 px-8">
        <div className="text-[28px] font-black leading-none tracking-[-.08em]"><span>Obras</span><span className="text-[#ff5a00]">AWC</span></div>
      </div>

      <div className="flex h-[96px] shrink-0 items-center px-8">
        <div>
          <div className="text-[42px] font-black leading-[.78] tracking-[-.08em] text-white">AWC</div>
          <div className="mt-2 text-[10px] font-black uppercase tracking-[.38em] text-white/80">Pré Moldados</div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-2 scrollbar-thin">
        {filteredNav.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.title}
              onClick={onNavigate}
              className={cn(
                "group relative flex h-[44px] items-center gap-4 px-6 text-[15px] font-medium transition",
                active ? "bg-white/[.055] text-[#ff5a00]" : "text-white/90 hover:bg-white/[.045] hover:text-white"
              )}
            >
              <span className={cn("absolute left-0 top-0 h-full w-1 bg-transparent", active && "bg-[#ff5a00]")} />
              <Icon className={cn("h-[21px] w-[21px] shrink-0 stroke-[1.8]", active ? "text-[#ff5a00]" : "text-white/92")} />
              <span className="truncate">{item.title}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-5">
        <Link href="/configuracoes" title="Minha conta e configurações" onClick={onNavigate} className="flex items-center gap-3 rounded-md p-1 transition hover:bg-white/[.06]">
          <Avatar className="h-11 w-11 border border-white/20">
            <AvatarImage src={(user as any)?.avatarUrl} />
            <AvatarFallback className="bg-[#ff5a00] text-[13px] font-bold text-white">{initials(user?.name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 text-left">
            <p className="truncate text-[14px] font-bold leading-tight">{user?.name || "Usuário"}</p>
            <p className="mt-1 truncate text-[12px] text-white/65">{roleLabel[userRole] || userRole}</p>
          </div>
          <Settings className="h-4 w-4 shrink-0 text-white/60" />
        </Link>
      </div>
    </aside>
  );
}
