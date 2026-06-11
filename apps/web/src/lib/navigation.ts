import {
  LayoutDashboard,
  Building2,
  GanttChart,
  FileText,
  TrendingUp,
  DollarSign,
  Package,
  Users,
  FileCheck,
  Shield,
  ClipboardList,
  ScrollText,
  BarChart3,
  Settings,
  Camera,
  AlertTriangle,
} from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  icon: any;
  roles: string[];
  badge?: string;
  children?: NavItem[];
}

export const sidebarNav: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: ["SUPER_ADMIN", "ADMIN", "ENGENHEIRO", "ENCARREGADO", "FINANCEIRO", "ALMOXARIFE", "CLIENTE"],
  },
  {
    title: "Obras",
    href: "/obras",
    icon: Building2,
    roles: ["SUPER_ADMIN", "ADMIN", "ENGENHEIRO", "ENCARREGADO", "FINANCEIRO", "ALMOXARIFE", "CLIENTE"],
  },
  {
    title: "Cronograma",
    href: "/cronograma",
    icon: GanttChart,
    roles: ["SUPER_ADMIN", "ADMIN", "ENGENHEIRO"],
  },
  {
    title: "RDO",
    href: "/rdo",
    icon: FileText,
    roles: ["SUPER_ADMIN", "ADMIN", "ENGENHEIRO", "ENCARREGADO"],
  },
  {
    title: "Andamento",
    href: "/andamento",
    icon: TrendingUp,
    roles: ["SUPER_ADMIN", "ADMIN", "ENGENHEIRO", "CLIENTE"],
  },
  {
    title: "Financeiro",
    href: "/financeiro",
    icon: DollarSign,
    roles: ["SUPER_ADMIN", "ADMIN", "FINANCEIRO"],
  },
  {
    title: "Materiais",
    href: "/materiais",
    icon: Package,
    roles: ["SUPER_ADMIN", "ADMIN", "ENGENHEIRO", "ENCARREGADO", "ALMOXARIFE"],
  },
  {
    title: "Equipe",
    href: "/equipe",
    icon: Users,
    roles: ["SUPER_ADMIN", "ADMIN", "ENGENHEIRO", "ENCARREGADO"],
  },
  {
    title: "Documentos",
    href: "/documentos",
    icon: FileCheck,
    roles: ["SUPER_ADMIN", "ADMIN", "ENGENHEIRO", "CLIENTE"],
  },
  {
    title: "Qualidade",
    href: "/qualidade",
    icon: ClipboardList,
    roles: ["SUPER_ADMIN", "ADMIN", "ENGENHEIRO"],
  },
  {
    title: "Segurança",
    href: "/seguranca",
    icon: Shield,
    roles: ["SUPER_ADMIN", "ADMIN", "ENGENHEIRO", "ENCARREGADO"],
  },
  {
    title: "Orçamentos",
    href: "/orcamentos",
    icon: BarChart3,
    roles: ["SUPER_ADMIN", "ADMIN", "FINANCEIRO"],
  },
  {
    title: "Contratos",
    href: "/contratos",
    icon: ScrollText,
    roles: ["SUPER_ADMIN", "ADMIN", "FINANCEIRO"],
  },
  {
    title: "Galeria",
    href: "/galeria",
    icon: Camera,
    roles: ["SUPER_ADMIN", "ADMIN", "ENGENHEIRO", "CLIENTE"],
  },
  {
    title: "Ocorrências",
    href: "/ocorrencias",
    icon: AlertTriangle,
    roles: ["SUPER_ADMIN", "ADMIN", "ENGENHEIRO"],
  },
  {
    title: "Relatórios",
    href: "/relatorios",
    icon: BarChart3,
    roles: ["SUPER_ADMIN", "ADMIN", "ENGENHEIRO", "FINANCEIRO", "CLIENTE"],
  },
  {
    title: "Configurações",
    href: "/configuracoes",
    icon: Settings,
    roles: ["SUPER_ADMIN", "ADMIN"],
  },
];
