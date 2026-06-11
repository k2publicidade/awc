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
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-black/25 bg-[#0a1721] px-4 text-white shadow-[0_2px_10px_rgba(5,14,22,.16)] sm:px-8">
      <div className="flex min-w-0 flex-1 items-center gap-6">
        <Button variant="ghost" size="icon" className="h-9 w-9 text-white/85 hover:bg-white/10 hover:text-white lg:hidden" onClick={onMenuClick} aria-label="Abrir menu"><Menu className="h-5 w-5" /></Button>
        <div className="relative hidden w-full max-w-[477px] md:block">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/55" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitSearch()}
            className="h-10 w-full rounded-[4px] border border-white/16 bg-[#101f2b] pl-12 pr-4 text-[14px] text-white placeholder:text-white/54 outline-none transition focus:border-[#ff5a00]"
            placeholder={`Buscar em ${targetLabel}... (Enter)`}
            aria-label={`Buscar em ${targetLabel}`}
          />
        </div>
      </div>
      <div className="flex items-center gap-5">
        <Link href="/notificacoes" title="Notificações" className="relative rounded p-1.5 text-white/82 hover:bg-white/10">
          <Bell className="h-5 w-5" />
          {naoLidas > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#ff5a00] text-[10px] font-black text-white">{naoLidas > 9 ? "9+" : naoLidas}</span>
          )}
        </Link>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex h-10 items-center gap-3 border-l border-white/12 pl-5" aria-label="Menu da conta">
              <Avatar className="h-10 w-10 border border-white/20"><AvatarImage src={(user as any)?.avatarUrl} /><AvatarFallback className="bg-[#ff5a00] text-[12px] font-bold text-white">{initials(user?.name)}</AvatarFallback></Avatar>
              <div className="hidden text-left md:block"><p className="text-[13px] font-bold leading-none">{user?.name || "Usuário"}</p></div>
              <ChevronDown className="h-4 w-4 text-white/70" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="truncate">{user?.email || "Minha conta"}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild><Link href="/configuracoes"><Settings className="mr-2 h-4 w-4"/>Configurações</Link></DropdownMenuItem>
            <DropdownMenuItem asChild><Link href="/configuracoes"><KeyRound className="mr-2 h-4 w-4"/>Alterar senha</Link></DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/login" })} className="text-red-600"><LogOut className="mr-2 h-4 w-4"/>Sair</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
