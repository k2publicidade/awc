import type React from "react";
import { AlertTriangle, BarChart3, BriefcaseBusiness, CalendarDays, Camera, CheckCircle2, Clock3, DollarSign, FileCheck2, FileText, HardHat, Package, ShieldCheck, Users } from "lucide-react";

export const obras = [
  { codigo: "AWC-001", nome: "Galpão Logístico Suzano", cliente: "Suzano Papel", engenheiro: "Ricardo Alves", cidade: "Itajaí/SC", status: "Em andamento", prazo: "Jul/2026", previsto: 55, realizado: 43, valor: "R$ 4,7M", risco: "Atenção" },
  { codigo: "AWC-002", nome: "Edifício Comercial K1", cliente: "Construtora Atlas", engenheiro: "Ana Costa", cidade: "Blumenau/SC", status: "Em andamento", prazo: "Ago/2026", previsto: 45, realizado: 39, valor: "R$ 3,2M", risco: "No prazo" },
  { codigo: "AWC-003", nome: "Ponte Municipal BR", cliente: "Pref. Rio Verde", engenheiro: "Marcos Silva", cidade: "Joinville/SC", status: "Crítico", prazo: "Jun/2026", previsto: 62, realizado: 44, valor: "R$ 6,9M", risco: "Crítico" },
  { codigo: "AWC-004", nome: "Centro Distribuição Omega", cliente: "MegaFoods", engenheiro: "Renata Moura", cidade: "Curitiba/PR", status: "Planejamento", prazo: "Set/2026", previsto: 12, realizado: 9, valor: "R$ 8,1M", risco: "No prazo" },
];

export const kpis = [
  { label: "Obras ativas", value: "7", hint: "+2 este mês", icon: BriefcaseBusiness, tone: "orange" },
  { label: "No prazo", value: "4", hint: "57% da carteira", icon: CheckCircle2, tone: "success" },
  { label: "Em risco", value: "2", hint: "Ação hoje", icon: AlertTriangle, tone: "warning" },
  { label: "Atrasadas", value: "1", hint: "Plano requerido", icon: Clock3, tone: "danger" },
];

export const alerts = [
  ["Galpão Logístico SP", "Fundação atrasada 3 dias", "Alta"],
  ["Equipe de içamento", "ASO vence em 12 dias", "Média"],
  ["RDO do Obra Ponta", "Participação não preenchida", "Baixa"],
  ["PCMAT", "Atualizado com sucesso", "OK"],
];

export const modules: Record<string, { title: string; subtitle: string; tabs: string[]; action: string; icon: React.ElementType }> = {
  cronograma: { title: "Cronograma", subtitle: "Linha do tempo executiva e dependências críticas", tabs: ["Gantt", "Físico-financeiro", "Vencidos", "Curva S"], action: "Exportar", icon: CalendarDays },
  rdo: { title: "RDO", subtitle: "Relatórios diários de obra com clima, efetivo, fotos e assinatura", tabs: ["RDOs", "Novo relatório", "Pendências", "Assinaturas"], action: "Novo RDO", icon: FileText },
  andamento: { title: "Andamento da Obra", subtitle: "Kanban executivo por etapa, progresso físico e curva S", tabs: ["Kanban", "Curva S", "Medições", "Fotos"], action: "Atualizar status", icon: BarChart3 },
  financeiro: { title: "Financeiro", subtitle: "Contrato, faturamento, custos, medições e fluxo de caixa", tabs: ["Resumo", "Medições", "Contas a pagar", "Fluxo de caixa"], action: "Nova medição", icon: DollarSign },
  materiais: { title: "Materiais", subtitle: "Estoque, requisições, fornecedores e alertas de suprimentos", tabs: ["Estoque", "Requisições", "Saídas", "Fornecedores"], action: "Entrada de material", icon: Package },
  equipe: { title: "Equipe", subtitle: "Trabalhadores, presenças, treinamentos, EPIs e documentos", tabs: ["Trabalhadores", "Presença", "EPIs", "Treinamentos"], action: "Adicionar pessoa", icon: Users },
  documentos: { title: "Documentos", subtitle: "Databook, laudos, projetos, checklists e pendências", tabs: ["Documentos", "Databook", "Checklist", "Validade"], action: "Upload", icon: FileCheck2 },
  qualidade: { title: "Qualidade", subtitle: "Inspeções, não conformidades, ensaios e indicadores", tabs: ["Inspeções", "Não conformidades", "Ensaios", "Indicadores"], action: "Nova inspeção", icon: ShieldCheck },
  seguranca: { title: "Segurança", subtitle: "DDS, incidentes, EPIs, treinamentos e relatório mensal", tabs: ["Painel", "DDS", "Incidentes", "EPIs", "Treinamentos", "Relatório Mensal"], action: "Registrar DDS", icon: HardHat },
  galeria: { title: "Galeria", subtitle: "Evolução fotográfica organizada por obra, etapa e data", tabs: ["Galeria", "Linha do tempo", "Antes e depois", "Exportar álbum"], action: "Upload de fotos", icon: Camera },
  relatorios: { title: "Relatórios", subtitle: "Indicadores executivos e relatórios para diretoria e clientes", tabs: ["Executivo", "Obras", "Financeiro", "Segurança"], action: "Gerar PDF", icon: BarChart3 },
  orcamentos: { title: "Orçamentos", subtitle: "Propostas, composições, aprovações e versões", tabs: ["Pipeline", "Itens", "Aprovações", "Histórico"], action: "Novo orçamento", icon: FileText },
  orcador: { title: "Orçador", subtitle: "Montagem rápida de propostas com composição de pré-moldados", tabs: ["Composição", "Custos", "Impostos", "Resumo"], action: "Calcular proposta", icon: FileText },
  contratos: { title: "Contratos", subtitle: "Contratos, aditivos, medições vinculadas e vencimentos", tabs: ["Contratos", "Aditivos", "Medições", "Vencimentos"], action: "Novo contrato", icon: FileText },
  ocorrencias: { title: "Ocorrências", subtitle: "Desvios, impedimentos, tratativas e plano de ação", tabs: ["Abertas", "Em análise", "Resolvidas", "Indicadores"], action: "Nova ocorrência", icon: AlertTriangle },
  notificacoes: { title: "Notificações", subtitle: "Central de alertas, vencimentos e tarefas acionáveis", tabs: ["Todas", "Críticas", "Pendentes", "Arquivadas"], action: "Configurar regras", icon: AlertTriangle },
};

export const people = ["João Santos", "Carlos Almeida", "Pedro Lima", "Marcos Vinícius", "Rafael Costa", "Antonio Silva", "Douglas Ferreira", "Paulo Henrique"];
