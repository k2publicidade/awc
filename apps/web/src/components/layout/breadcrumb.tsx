"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";

export function Breadcrumb() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  const labels: Record<string, string> = {
    dashboard: "Dashboard",
    obras: "Obras",
    cronograma: "Cronograma",
    rdo: "RDO",
    andamento: "Andamento",
    financeiro: "Financeiro",
    materiais: "Materiais",
    equipe: "Equipe",
    documentos: "Documentos",
    qualidade: "Qualidade",
    seguranca: "Segurança",
    orcamentos: "Orçamentos",
    contratos: "Contratos",
    galeria: "Galeria",
    ocorrencias: "Ocorrências",
    relatorios: "Relatórios",
    configuracoes: "Configurações",
    perfil: "Perfil",
    novo: "Novo",
    editar: "Editar",
  };

  return (
    <nav className="flex items-center gap-1.5 text-sm text-awc-gray mb-4">
      <Link href="/dashboard" className="flex items-center gap-1 hover:text-awc-orange transition-colors">
        <Home className="w-3.5 h-3.5" />
        <span>Início</span>
      </Link>
      {segments.map((segment, index) => {
        const href = "/" + segments.slice(0, index + 1).join("/");
        const isLast = index === segments.length - 1;

        return (
          <span key={href} className="flex items-center gap-1.5">
            <ChevronRight className="w-3.5 h-3.5" />
            {isLast ? (
              <span className="font-medium text-awc-dark">{labels[segment] || segment}</span>
            ) : (
              <Link href={href} className="hover:text-awc-orange transition-colors">
                {labels[segment] || segment}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
