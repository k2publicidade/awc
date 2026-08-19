import Link from 'next/link';
import { notFound } from 'next/navigation';
import prisma from '@/lib/prisma';
import { cn } from '@/lib/utils';
import { requireSession } from '@/lib/session-context';
import { canAccessResource } from '@/lib/authorization';
import { ActiveObraToggleButton } from '@/components/obras/active-obra-toggle-button';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Building,
  Building2,
  CalendarDays,
  Camera,
  Coins,
  Download,
  FileCheck,
  HardHat,
  Layers,
  MapPin,
  Plus,
  Printer,
  ShieldCheck,
  User,
  Users,
  Warehouse,
  Waypoints,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

const money = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

const statusLabel: Record<string, { label: string; cls: string; ring: string }> = {
  PLANEJAMENTO: {
    label: 'Planejamento',
    cls: 'bg-blue-50 text-blue-700 border-blue-200',
    ring: 'ring-blue-500/20',
  },
  EM_ANDAMENTO: {
    label: 'Em Andamento',
    cls: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    ring: 'ring-emerald-500/20',
  },
  PAUSADO: {
    label: 'Pausado',
    cls: 'bg-amber-50 text-amber-700 border-amber-200',
    ring: 'ring-amber-500/20',
  },
  CONCLUIDO: {
    label: 'Concluído',
    cls: 'bg-slate-100 text-slate-700 border-slate-200',
    ring: 'ring-slate-500/20',
  },
  CANCELADO: {
    label: 'Cancelado',
    cls: 'bg-red-50 text-red-700 border-red-200',
    ring: 'ring-red-500/20',
  },
};

const tipoIconMap: Record<string, typeof Building2> = {
  GALPAO: Warehouse,
  EDIFICIO: Building2,
  PONTE: Waypoints,
  MURO_ARRIMO: Layers,
  ELEMENTO_ISOLADO: Building,
  OUTRO: HardHat,
};

export default async function ObraDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await requireSession();
  if (!context || !canAccessResource(context.role, 'obras')) notFound();
  const { tenantId, userId, role } = context;
  const userObraScope =
    role === 'MASTER_ADMIN'
      ? { tenantId }
      : {
          tenantId,
          OR: [
            { engenheiroId: userId },
            { clienteId: userId },
          ],
        };

  const obra = await prisma.obra.findFirst({
    where: { id, ...userObraScope },
    include: {
      engenheiro: { select: { id: true, name: true, email: true } },
      cliente: { select: { id: true, name: true, email: true } },
      etapas: { orderBy: { ordem: 'asc' } },
      rdos: {
        orderBy: { data: 'desc' },
        take: 6,
        include: { responsavel: { select: { name: true } }, climas: true },
      },
      lancamentos: { select: { tipo: true, valor: true, status: true } },
      documentos: { orderBy: { createdAt: 'desc' }, take: 6 },
      ocorrencias: { where: { status: 'ABERTO' }, orderBy: { dataAbertura: 'desc' }, take: 6 },
      medicoes: { orderBy: { numero: 'desc' }, take: 6 },
      fotos: { orderBy: { data: 'desc' }, take: 6 },
      naoConformidades: { where: { status: { not: 'ENCERRADA' } }, take: 6 },
      _count: {
        select: {
          rdos: true,
          documentos: true,
          ocorrencias: true,
          medicoes: true,
          fotos: true,
          etapas: true,
          naoConformidades: true,
        },
      },
    },
  });

  if (!obra) notFound();

  const hoje = new Date();
  const avanco = obra.etapas.length
    ? obra.etapas.reduce((s, e) => s + (e.percentualRealizado || 0), 0) / obra.etapas.length
    : 0;
  const previsto = obra.etapas.length
    ? obra.etapas.reduce((s, e) => s + (e.percentualPrevisto || 0), 0) / obra.etapas.length
    : 0;

  const despesas = obra.lancamentos
    .filter((l) => l.tipo === 'DESPESA')
    .reduce((s, l) => s + Number(l.valor), 0);
  const receitas = obra.lancamentos
    .filter((l) => l.tipo === 'RECEITA')
    .reduce((s, l) => s + Number(l.valor), 0);
  const valorContratado = Number(obra.valorContratado || 0);

  const etapasAtrasadas = obra.etapas.filter(
    (e) => e.dataFim && e.dataFim < hoje && (e.percentualRealizado || 0) < 100
  );

  const st = statusLabel[obra.status] || statusLabel.PLANEJAMENTO;
  const TipoIcon = tipoIconMap[obra.tipo] || Building2;

  // Cálculo de prazos
  let diasRestantes: number | null = null;
  if (obra.dataPrevisaoFim) {
    const diff = Math.ceil(
      (new Date(obra.dataPrevisaoFim).getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24)
    );
    diasRestantes = diff;
  }

  return (
    <div className="mx-auto w-full max-w-[1540px] space-y-6 pb-12 text-[#1e293b]">
      {/* Top Breadcrumbs & Action Bar */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            <Link href="/obras" className="hover:text-[#ff4d00] transition-colors">
              Obras
            </Link>
            <span className="text-[#ff4d00]">›</span>
            <span>Cockpit Executivo</span>
            <span className="text-[#ff4d00]">›</span>
            <span className="text-slate-700 font-bold">{obra.codigo}</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <h1 className="rigor-title text-3xl font-black leading-none text-slate-900 sm:text-4xl tracking-tight">
              {obra.nome}
            </h1>
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ring-2',
                st.cls,
                st.ring
              )}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              {st.label}
            </span>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs font-medium text-slate-500">
            <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-bold text-slate-700">
              <TipoIcon className="h-3.5 w-3.5 text-[#ff4d00]" />
              {obra.tipo.replace(/_/g, ' ')}
            </span>

            {obra.cidade && (
              <span className="inline-flex items-center gap-1 text-slate-600 font-semibold">
                <MapPin className="h-3.5 w-3.5 text-[#ff4d00]" />
                {obra.cidade}
                {obra.estado ? `/${obra.estado}` : ''}
              </span>
            )}

            {obra.engenheiro && (
              <span className="inline-flex items-center gap-1 text-slate-600 font-semibold">
                <User className="h-3.5 w-3.5 text-slate-400" />
                Eng. {obra.engenheiro.name}
              </span>
            )}

            {obra.cliente && (
              <span className="inline-flex items-center gap-1 text-slate-600">
                <span className="font-bold text-slate-400">Cliente:</span> {obra.cliente.name}
              </span>
            )}
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <ActiveObraToggleButton obraId={obra.id} obraNome={obra.nome} />

          <a
            href={`/api/relatorios?type=executivo&obraId=${obra.id}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 shadow-sm transition-all hover:bg-slate-50"
          >
            <Printer className="mr-2 h-4 w-4 text-slate-500" />
            Relatório Executivo
          </a>

          <Link
            href="/cronograma"
            className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 shadow-sm transition-all hover:bg-slate-50"
          >
            <BarChart3 className="mr-2 h-4 w-4 text-[#ff4d00]" />
            Abrir no Gantt
          </Link>

          <Link
            href="/rdo/novo"
            className="rigor-btn-primary inline-flex h-10 items-center rounded-xl px-5 text-xs font-bold text-white shadow-md transition-all"
          >
            <Plus className="mr-2 h-4 w-4" />
            Novo RDO
          </Link>
        </div>
      </div>

      {/* 4 Executive KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {/* Card 1: Avanço Físico */}
        <div className="rigor-card rigor-card-interactive p-5 bg-white border-slate-200/60 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Avanço Físico Geral
            </span>
            <Activity className="h-4 w-4 text-[#ff4d00]" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black tracking-tight text-slate-900">
              {Math.round(avanco)}%
            </span>
            <span className="text-xs font-semibold text-slate-400">
              (Previsto: {Math.round(previsto)}%)
            </span>
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#ff4d00] to-[#ff7a1a] transition-all duration-500"
              style={{ width: `${Math.min(avanco, 100)}%` }}
            />
          </div>
          <p className="mt-2 text-[11px] font-medium text-slate-500">
            {avanco >= previsto
              ? '✨ Cronograma em dia com o planejamento'
              : `⚠️ ${Math.round(previsto - avanco)}% abaixo da meta prevista`}
          </p>
        </div>

        {/* Card 2: Valor Contratado & Saldo */}
        <div className="rigor-card rigor-card-interactive p-5 bg-white border-slate-200/60 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Contrato & Orçamento
            </span>
            <Coins className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black tracking-tight text-slate-900">
              {money(valorContratado)}
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs font-medium text-slate-500 border-t border-slate-100 pt-2">
            <span>Recebido: <b className="text-emerald-600">{money(receitas)}</b></span>
            <span>Despesas: <b className="text-red-600">{money(despesas)}</b></span>
          </div>
        </div>

        {/* Card 3: Prazos & Conclusão */}
        <div className="rigor-card rigor-card-interactive p-5 bg-white border-slate-200/60 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Prazo e Entregas
            </span>
            <CalendarDays className="h-4 w-4 text-blue-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black tracking-tight text-slate-900">
              {obra.dataPrevisaoFim
                ? obra.dataPrevisaoFim.toLocaleDateString('pt-BR')
                : 'Não informado'}
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs font-medium border-t border-slate-100 pt-2">
            <span className={cn(etapasAtrasadas.length > 0 ? 'text-red-600 font-bold' : 'text-slate-500')}>
              {etapasAtrasadas.length > 0
                ? `${etapasAtrasadas.length} etapa(s) em atraso`
                : 'Todas etapas no prazo'}
            </span>
            {diasRestantes !== null && (
              <span className="text-slate-400 font-mono text-[11px]">
                {diasRestantes >= 0 ? `${diasRestantes} dias rest.` : `${Math.abs(diasRestantes)}d atraso`}
              </span>
            )}
          </div>
        </div>

        {/* Card 4: Relatórios e Atividade de Campo */}
        <div className="rigor-card rigor-card-interactive p-5 bg-white border-slate-200/60 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Atividade em Campo
            </span>
            <HardHat className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black tracking-tight text-slate-900">
              {obra._count.rdos}
            </span>
            <span className="text-xs font-semibold text-slate-400">RDOs emitidos</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs font-medium text-slate-500 border-t border-slate-100 pt-2">
            <span>📷 {obra._count.fotos} fotos</span>
            <span>📑 {obra._count.documentos} docs</span>
            <span>⚠️ {obra._count.ocorrencias} ocor.</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Left (Etapas / Cronograma & RDOs) | Right (Ocorrências, Medições, Fotos, Documentos) */}
      <div className="grid gap-6 xl:grid-cols-[1.3fr_.7fr]">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Cronograma / Etapas List */}
          <section className="rigor-card p-6 bg-white border-slate-200/60 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black uppercase text-slate-900 tracking-tight">
                  Cronograma de Execução
                </h2>
                <p className="text-xs text-slate-500">
                  {obra.etapas.length} etapas registradas nesta obra
                </p>
              </div>
              <Link
                href="/cronograma"
                className="text-xs font-bold uppercase tracking-wider text-[#ff4d00] hover:underline"
              >
                Gerenciar no Gantt →
              </Link>
            </div>

            {obra.etapas.length === 0 ? (
              <div className="py-12 text-center">
                <BarChart3 className="mx-auto h-10 w-10 text-slate-300" />
                <p className="mt-2 font-bold text-slate-700">Nenhuma etapa cadastrada</p>
                <p className="mt-1 text-xs text-slate-500">
                  Monte a estrutura de etapas no módulo de Cronograma.
                </p>
                <Link
                  href="/cronograma"
                  className="rigor-btn-primary mt-4 inline-flex h-9 items-center rounded-lg px-4 text-xs font-bold text-white shadow-sm"
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Criar Etapa
                </Link>
              </div>
            ) : (
              <div className="space-y-3.5">
                {obra.etapas.map((e) => {
                  const atrasada =
                    e.dataFim && e.dataFim < hoje && (e.percentualRealizado || 0) < 100;
                  const concluida = (e.percentualRealizado || 0) >= 100;
                  return (
                    <div
                      key={e.id}
                      className={cn(
                        'flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border transition-colors',
                        atrasada
                          ? 'border-red-200 bg-red-50/30'
                          : concluida
                            ? 'border-emerald-100 bg-emerald-50/20'
                            : 'border-slate-100 bg-slate-50/50 hover:bg-slate-50'
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0 sm:w-1/3">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-200 font-mono text-[10px] font-black text-slate-700">
                          {e.ordem}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-xs font-bold text-slate-900">{e.nome}</p>
                          <p className="text-[10px] text-slate-500 font-medium">
                            {e.dataInicio ? e.dataInicio.toLocaleDateString('pt-BR') : '—'} até{' '}
                            {e.dataFim ? e.dataFim.toLocaleDateString('pt-BR') : '—'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 flex-1 sm:px-4">
                        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                          <div
                            className={cn(
                              'h-full rounded-full transition-all duration-300',
                              atrasada
                                ? 'bg-red-600'
                                : concluida
                                  ? 'bg-emerald-600'
                                  : 'bg-[#ff4d00]'
                            )}
                            style={{ width: `${Math.min(e.percentualRealizado || 0, 100)}%` }}
                          />
                        </div>
                        <span className="font-mono text-xs font-black text-slate-800 w-12 text-right">
                          {Math.round(e.percentualRealizado || 0)}%
                        </span>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 text-right">
                        <span className="font-mono text-xs font-bold text-slate-700">
                          {money(Number(e.valorFinanceiro || 0))}
                        </span>
                        {atrasada && (
                          <span className="rounded-full bg-red-100 px-2 py-0.5 text-[9px] font-black text-red-700 uppercase">
                            Atrasada
                          </span>
                        )}
                        {concluida && (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-black text-emerald-700 uppercase">
                            100% OK
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Diário de Obra (Últimos RDOs) */}
          <section className="rigor-card p-6 bg-white border-slate-200/60 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black uppercase text-slate-900 tracking-tight">
                  Últimos Relatórios Diários (RDO)
                </h2>
                <p className="text-xs text-slate-500">Histórico recente de campo</p>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href="/rdo"
                  className="text-xs font-bold uppercase tracking-wider text-[#ff4d00] hover:underline mr-2"
                >
                  Ver Todos ({obra._count.rdos})
                </Link>
                <Link
                  href="/rdo/novo"
                  className="rigor-btn-primary inline-flex h-8 items-center rounded-lg px-3 text-xs font-bold text-white shadow-sm"
                >
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Emitir RDO
                </Link>
              </div>
            </div>

            {obra.rdos.length === 0 ? (
              <p className="py-8 text-center text-xs font-medium text-slate-500">
                Nenhum RDO emitido para esta obra até o momento.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {obra.rdos.map((r) => (
                  <div
                    key={r.id}
                    className="flex flex-col justify-between rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 transition hover:bg-slate-50 hover:border-slate-300"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="font-bold text-sm text-slate-900">
                          RDO #{r.numero}
                        </span>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">
                          {r.data.toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </p>
                      </div>
                      <span
                        className={cn(
                          'rounded-full px-2.5 py-0.5 text-[10px] font-black',
                          r.status === 'APROVADO'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        )}
                      >
                        {r.status}
                      </span>
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-slate-200/60 pt-3 text-xs">
                      <span className="text-slate-500 truncate max-w-[140px]">
                        Por: <b>{r.responsavel?.name || 'Responsável'}</b>
                      </span>
                      <div className="flex items-center gap-2">
                        <a
                          href={`/api/rdo/${r.id}/pdf`}
                          target="_blank"
                          rel="noreferrer"
                          title="Baixar PDF Oficial"
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-white hover:text-[#ff4d00] transition-colors"
                        >
                          <Download className="h-4 w-4" />
                        </a>
                        <Link
                          href={`/rdo/editar/${r.id}`}
                          className="font-bold text-[#ff4d00] hover:underline"
                        >
                          Abrir →
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Right Column: Mini Widgets & Operational Panels */}
        <div className="space-y-6">
          {/* Quick Shortcuts */}
          <section className="rigor-card p-5 bg-white border-slate-200/60 shadow-sm">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Módulos Integrados da Obra
            </h2>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <Link
                href="/financeiro"
                className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white p-3 font-bold text-slate-800 transition hover:border-[#ff4d00] hover:bg-orange-50/40"
              >
                <Coins className="h-4 w-4 text-[#ff4d00]" />
                Financeiro
              </Link>
              <Link
                href="/materiais"
                className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white p-3 font-bold text-slate-800 transition hover:border-[#ff4d00] hover:bg-orange-50/40"
              >
                <Warehouse className="h-4 w-4 text-[#ff4d00]" />
                Materiais
              </Link>
              <Link
                href="/equipe"
                className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white p-3 font-bold text-slate-800 transition hover:border-[#ff4d00] hover:bg-orange-50/40"
              >
                <Users className="h-4 w-4 text-[#ff4d00]" />
                Equipe
              </Link>
              <Link
                href="/documentos"
                className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white p-3 font-bold text-slate-800 transition hover:border-[#ff4d00] hover:bg-orange-50/40"
              >
                <FileCheck className="h-4 w-4 text-[#ff4d00]" />
                Documentos
              </Link>
              <Link
                href="/qualidade"
                className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white p-3 font-bold text-slate-800 transition hover:border-[#ff4d00] hover:bg-orange-50/40"
              >
                <ShieldCheck className="h-4 w-4 text-[#ff4d00]" />
                Qualidade
              </Link>
              <Link
                href="/galeria"
                className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white p-3 font-bold text-slate-800 transition hover:border-[#ff4d00] hover:bg-orange-50/40"
              >
                <Camera className="h-4 w-4 text-[#ff4d00]" />
                Fotos ({obra._count.fotos})
              </Link>
            </div>
          </section>

          {/* Ocorrências Abertas */}
          {obra.ocorrencias.length > 0 && (
            <section className="rigor-card p-5 bg-white border-amber-200 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-black uppercase text-amber-900 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  Ocorrências Abertas ({obra.ocorrencias.length})
                </h2>
                <Link
                  href="/ocorrencias"
                  className="text-xs font-bold text-amber-800 hover:underline"
                >
                  Ver todas
                </Link>
              </div>
              <div className="space-y-2 text-xs">
                {obra.ocorrencias.map((o) => (
                  <div
                    key={o.id}
                    className="rounded-lg border border-amber-100 bg-amber-50/60 p-3"
                  >
                    <p className="font-bold text-slate-900">{o.descricao}</p>
                    <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
                      <span>{o.tipo.replace(/_/g, ' ')}</span>
                      {o.impactoDias > 0 && (
                        <span className="font-bold text-red-600">
                          +{o.impactoDias} dias de impacto
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Medições Realizadas */}
          {obra.medicoes.length > 0 && (
            <section className="rigor-card p-5 bg-white border-slate-200/60 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-black uppercase text-slate-900">
                  Medições da Obra
                </h2>
                <Link
                  href="/andamento"
                  className="text-xs font-bold text-[#ff4d00] hover:underline"
                >
                  Histórico
                </Link>
              </div>
              <div className="space-y-2 text-xs">
                {obra.medicoes.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 p-3"
                  >
                    <div>
                      <p className="font-bold text-slate-900">Medição #{m.numero}</p>
                      <p className="text-[10px] text-slate-500 font-medium">
                        {m.periodoInicio.toLocaleDateString('pt-BR')} até{' '}
                        {m.periodoFim.toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-slate-900">{money(Number(m.valorTotal))}</p>
                      <span className="text-[10px] font-bold text-emerald-700">
                        {m.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Documentos Recentes */}
          {obra.documentos.length > 0 && (
            <section className="rigor-card p-5 bg-white border-slate-200/60 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-black uppercase text-slate-900">
                  Documentos & Databook
                </h2>
                <Link
                  href="/documentos"
                  className="text-xs font-bold text-[#ff4d00] hover:underline"
                >
                  Ver todos
                </Link>
              </div>
              <div className="space-y-2 text-xs">
                {obra.documentos.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between rounded-lg border border-slate-100 p-2.5 hover:bg-slate-50"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="truncate font-bold text-slate-900">{doc.nome}</p>
                      <p className="text-[10px] text-slate-500">{doc.categoria}</p>
                    </div>
                    {doc.arquivoUrl && (
                      <a
                        href={doc.arquivoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#ff4d00] hover:underline font-bold text-xs"
                      >
                        Abrir
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Galeria de Fotos Recentes */}
          {obra.fotos.length > 0 && (
            <section className="rigor-card p-5 bg-white border-slate-200/60 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-black uppercase text-slate-900">
                  Evidências Fotográficas
                </h2>
                <Link
                  href="/galeria"
                  className="text-xs font-bold text-[#ff4d00] hover:underline"
                >
                  Galeria Completa →
                </Link>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {obra.fotos.map((foto) => (
                  <Link
                    key={foto.id}
                    href="/galeria"
                    className="aspect-square overflow-hidden rounded-lg bg-slate-100 border border-slate-200 group relative block"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={foto.url}
                      alt={foto.legenda || 'Foto da obra'}
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-110"
                    />
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
