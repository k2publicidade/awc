"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Bell, ChevronDown, KeyRound, LogOut, Menu, Search, Settings } from "lucide-react";

function initials(name?: string | null) {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || "") + (parts[parts.length - 1]?.[0] || "")).toUpperCase() || "U";
}

// Módulos cuja listagem aceita o parâmetro ?busca= (via CrudModule)
const searchableModules: Record<string, string> = {
  obras: "obras", andamento: "andamento", financeiro: "financeiro", materiais: "materiais",
  equipe: "equipe", documentos: "documentos", qualidade: "qualidade", seguranca: "segurança",
  contratos: "contratos", ocorrencias: "ocorrências", orcamentos: "orçamentos",
};

export function Topbar({ onMenuClick }: { onMenuClick?: () => void }) {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [naoLidas, setNaoLidas] = useState(0);
  const [busca, setBusca] = useState("");

  const currentModule = pathname.split("/")[1] || "";
  const targetModule = searchableModules[currentModule] ? currentModule : "obras";
  const targetLabel = searchableModules[targetModule];

  useEffect(() => {
    let active = true;
    const load = () =>
      fetch("/api/notificacoes")
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => { if (active && d) setNaoLidas(d.naoLidas || 0); })
        .catch(() => {});
    load();
    const t = setInterval(load, 60000);
    return () => { active = false; clearInterval(t); };
  }, []);

  function submitSearch() {
    const term = busca.trim();
    if (!term) return;
    router.push(`/${targetModule}?busca=${encodeURIComponent(term)}`);
    setBusca("");
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200/80 bg-white/80 px-4 text-slate-850 backdrop-blur-md shadow-[0_2px_12px_rgba(0,0,0,0.015)] sm:px-8">
      <div className="flex min-w-0 flex-1 items-center gap-6">
        <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-655 hover:bg-slate-100 hover:text-slate-900 lg:hidden" onClick={onMenuClick} aria-label="Abrir menu"><Menu className="h-5 w-5" /></Button>
        <div className="relative hidden w-full max-w-[440px] md:block">
          <Search className="absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitSearch()}
            className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50/50 pl-11 pr-4 text-[13.5px] text-slate-800 placeholder:text-slate-400 outline-none transition-all focus:border-[#ff5a00] focus:bg-white focus:ring-4 focus:ring-[#ff5a00]/10"
            placeholder={`Buscar em ${targetLabel}... (Enter)`}
            aria-label={`Buscar em ${targetLabel}`}
          />
        </div>
      </div>
      <div className="flex items-center gap-4">
        <Link href="/notificacoes" title="Notificações" className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-850 transition-colors">
          <Bell className="h-5 w-5 stroke-[2]" />
          {naoLidas > 0 && (
            <span className="absolute right-1 top-1 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-[#ff5a00] text-[9px] font-black text-white ring-2 ring-white">{naoLidas > 9 ? "9+" : naoLidas}</span>
          )}
        </Link>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex h-10 items-center gap-2.5 border-l border-slate-200/80 pl-4 cursor-pointer focus:outline-none" aria-label="Menu da conta">
              <Avatar className="h-9 w-9 border border-slate-250"><AvatarImage src={(user as any)?.avatarUrl} /><AvatarFallback className="bg-gradient-to-br from-[#ff5a00] to-[#ff7a1a] text-[11px] font-black text-white">{initials(user?.name)}</AvatarFallback></Avatar>
              <div className="hidden text-left md:block"><p className="text-[13px] font-bold leading-none text-slate-800">{user?.name || "Usuário"}</p></div>
              <ChevronDown className="h-4 w-4 text-slate-400" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 mt-1 rounded-xl shadow-lg border-slate-200">
            <DropdownMenuLabel className="truncate text-slate-500 font-medium text-[11px] uppercase tracking-wider px-3 py-2">{user?.email || "Minha conta"}</DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-slate-100" />
            <DropdownMenuItem asChild className="rounded-md cursor-pointer mx-1 my-0.5 px-3 py-2 text-[13px]"><Link href="/configuracoes"><Settings className="mr-2.5 h-4 w-4 text-slate-500"/>Configurações</Link></DropdownMenuItem>
            <DropdownMenuItem asChild className="rounded-md cursor-pointer mx-1 my-0.5 px-3 py-2 text-[13px]"><Link href="/configuracoes"><KeyRound className="mr-2.5 h-4 w-4 text-slate-500"/>Alterar senha</Link></DropdownMenuItem>
            <DropdownMenuSeparator className="bg-slate-100" />
            <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/login" })} className="rounded-md cursor-pointer mx-1 my-0.5 px-3 py-2 text-[13px] text-red-600 focus:bg-red-50 focus:text-red-700"><LogOut className="mr-2.5 h-4 w-4 text-red-500"/>Sair</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
