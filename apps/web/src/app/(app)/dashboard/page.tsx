import Link from 'next/link';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { cn } from '@/lib/utils';
import { requireSession } from '@/lib/session-context';
import {
  AlertTriangle,
  Bell,
  BriefcaseBusiness,
  CheckCircle2,
  Clock3,
  DollarSign,
  FileText,
  Plus,
  ShieldCheck,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

const money = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

const toneMap: Record<string, string> = {
  orange: 'bg-orange-50 text-[#ff4d00] border-orange-100/80 ring-[#ff4d00]/5',
  success: 'bg-emerald-50 text-emerald-600 border-emerald-100/80 ring-emerald-600/5',
  warning: 'bg-amber-50 text-amber-600 border-amber-100/80 ring-amber-600/5',
  danger: 'bg-red-50 text-red-600 border-red-100/80 ring-red-650/5',
  info: 'bg-blue-50 text-blue-600 border-blue-100/80 ring-blue-650/5',
};

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'orange',
}: {
  label: string;
  value: string;
  hint: string;
  icon: React.ElementType;
  tone?: string;
}) {
  return (
    <div className="rigor-card rigor-card-interactive p-5 bg-white border-slate-200/50 shadow-sm shadow-slate-100/30">
      <div className="flex items-center gap-4">
        <div
          className={cn(
            'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border',
            toneMap[tone]
          )}
        >
          <Icon className="h-6 w-6 stroke-[2]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-450">{label}</p>
          <p className="text-2xl font-black leading-tight text-slate-900 tracking-tight mt-0.5">
            {value}
          </p>
          <p className="text-[11.5px] font-medium text-slate-400 truncate mt-0.5">{hint}</p>
        </div>
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  const context = await requireSession();
  if (!context) redirect('/login');
  const { tenantId, userId } = context;
  const obraWhere = { tenantId };

  const hoje = new Date();
  const inicioHoje = new Date(hoje);
  inicioHoje.setHours(0, 0, 0, 0);
  const em30dias = new Date(hoje.getTime() + 30 * 86400000);

  const [
    obras,
    lancamentos,
    rdosHoje,
    ncsAbertas,
    ocorrenciasAbertas,
    docsVencendo,
    notificacoes,
    medicoesPendentes,
  ] = await Promise.all([
    prisma.obra.findMany({
      where: obraWhere,
      include: {
        engenheiro: { select: { name: true } },
        etapas: { select: { percentualPrevisto: true, percentualRealizado: true, dataFim: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.lancamentoFinanceiro.findMany({
      where: { obra: obraWhere },
      select: { tipo: true, valor: true, status: true, dataVencimento: true },
    }),
    prisma.rDO.count({ where: { obra: obraWhere, data: { gte: inicioHoje } } }),
    prisma.naoConformidade.count({ where: { obra: obraWhere, status: { not: 'ENCERRADA' } } }),
    prisma.ocorrencia.count({ where: { obra: obraWhere, status: 'ABERTO' } }),
    prisma.documento.count({ where: { obra: obraWhere, validade: { gte: hoje, lte: em30dias } } }),
    prisma.notificacao.findMany({
      where: { userId, tenantId, lida: false },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    prisma.medicao.count({
      where: {
        obra: obraWhere,
        status: { in: ['EM_ELABORACAO', 'APROVADA_ENGENHEIRO', 'APROVADA_FINANCEIRO'] },
      },
    }),
  ]);

  type ObraRow = (typeof obras)[number];
  const avanco = (o: ObraRow) =>
    o.etapas.length
      ? o.etapas.reduce((s, e) => s + (e.percentualRealizado || 0), 0) / o.etapas.length
      : 0;
  const previsto = (o: ObraRow) =>
    o.etapas.length
      ? o.etapas.reduce((s, e) => s + (e.percentualPrevisto || 0), 0) / o.etapas.length
      : 0;
  const temEtapaAtrasada = (o: ObraRow) =>
    o.etapas.some((e) => e.dataFim && e.dataFim < hoje && (e.percentualRealizado || 0) < 100);

  const ativas = obras.filter((o) => o.status === 'EM_ANDAMENTO');
  const atrasadas = ativas.filter(temEtapaAtrasada);
  const emRisco = ativas.filter((o) => !temEtapaAtrasada(o) && avanco(o) < previsto(o) - 10);
  const noPrazo = ativas.length - atrasadas.length - emRisco.length;

  const despesasPagas = lancamentos
    .filter((l) => l.tipo === 'DESPESA' && l.status === 'PAGO')
    .reduce((s, l) => s + Number(l.valor), 0);
  const receitasRecebidas = lancamentos
    .filter((l) => l.tipo === 'RECEITA' && l.status === 'PAGO')
    .reduce((s, l) => s + Number(l.valor), 0);
  const aPagarAberto = lancamentos
    .filter((l) => l.tipo === 'DESPESA' && (l.status === 'ABERTO' || l.status === 'VENCIDO'))
    .reduce((s, l) => s + Number(l.valor), 0);
  const vencidos = lancamentos
    .filter((l) => l.status === 'VENCIDO' || (l.status === 'ABERTO' && l.dataVencimento < hoje))
    .reduce((s, l) => s + Number(l.valor), 0);
  const valorCarteira = obras.reduce((s, o) => s + Number(o.valorContratado), 0);

  const riscoDe = (o: ObraRow) =>
    temEtapaAtrasada(o) ? 'Atrasada' : avanco(o) < previsto(o) - 10 ? 'Atenção' : 'No prazo';

  return (
    <div className="mx-auto w-full max-w-[1540px] space-y-6 pb-8 text-[#1e293b]">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            RIGOR <span className="mx-1 text-[#ff5a00]">›</span> Dashboard
          </div>
          <h1 className="rigor-title text-[28px] font-black leading-none tracking-tight text-slate-900">
            Dashboard Executivo
          </h1>
          <p className="mt-1.5 text-xs font-semibold text-slate-500">
            Visão geral de todas as obras —{' '}
            <span className="capitalize">
              {hoje.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
            </span>
          </p>
        </div>
        <Link
          href="/obras/novo"
          className="rigor-btn-primary flex h-10 items-center justify-center rounded-lg px-5 text-sm font-bold text-white transition-all shadow-md"
        >
          <Plus className="mr-2 h-4.5 w-4.5" />
          Nova obra
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Obras ativas"
          value={String(ativas.length)}
          hint={`${obras.length} na carteira`}
          icon={BriefcaseBusiness}
          tone="orange"
        />
        <StatCard
          label="No prazo"
          value={String(Math.max(noPrazo, 0))}
          hint={
            ativas.length
              ? `${Math.round((Math.max(noPrazo, 0) / ativas.length) * 100)}% da carteira`
              : 'Sem obras ativas'
          }
          icon={CheckCircle2}
          tone="success"
        />
        <StatCard
          label="Em risco"
          value={String(emRisco.length)}
          hint={emRisco.length ? 'Avanço abaixo do previsto' : 'Nenhuma em risco'}
          icon={AlertTriangle}
          tone="warning"
        />
        <StatCard
          label="Atrasadas"
          value={String(atrasadas.length)}
          hint={atrasadas.length ? 'Etapas vencidas' : 'Nenhuma atrasada'}
          icon={Clock3}
          tone="danger"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Valor da carteira"
          value={money(valorCarteira)}
          hint="Total contratado"
          icon={DollarSign}
          tone="info"
        />
        <StatCard
          label="A pagar em aberto"
          value={money(aPagarAberto)}
          hint={vencidos > 0 ? `${money(vencidos)} vencidos` : 'Nada vencido'}
          icon={DollarSign}
          tone={vencidos > 0 ? 'danger' : 'orange'}
        />
        <StatCard
          label="Recebido"
          value={money(receitasRecebidas)}
          hint={`Pago: ${money(despesasPagas)}`}
          icon={CheckCircle2}
          tone="success"
        />
        <StatCard
          label="Medições pendentes"
          value={String(medicoesPendentes)}
          hint="Aguardando aprovação"
          icon={FileText}
          tone={medicoesPendentes > 0 ? 'warning' : 'success'}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.25fr_.75fr]">
        <div className="rigor-card p-6 bg-white border-slate-200/50 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-lg font-black uppercase text-slate-800 tracking-tight">
              Obras em andamento
            </h2>
            <Link
              href="/obras"
              className="text-xs font-bold uppercase tracking-wider text-[#ff5a00] hover:underline"
            >
              Ver todas
            </Link>
          </div>
          {ativas.length === 0 ? (
            <p className="py-10 text-center text-[13px] text-slate-400 font-medium">
              Nenhuma obra em andamento.{' '}
              <Link href="/obras/novo" className="font-semibold text-rigor-orange hover:underline">
                Cadastre uma obra
              </Link>
              .
            </p>
          ) : (
            <div className="overflow-x-auto -mx-6">
              <table className="w-full text-left text-[13.5px]">
                <thead className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-6 py-3.5">Obra</th>
                    <th className="px-4 py-3.5">Engenheiro</th>
                    <th className="px-4 py-3.5">Prazo</th>
                    <th className="px-4 py-3.5">Avanço</th>
                    <th className="px-6 py-3.5">Situação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ativas.map((o) => {
                    const risco = riscoDe(o);
                    const pct = Math.round(avanco(o));
                    return (
                      <tr key={o.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <Link
                            href={`/obras/${o.id}`}
                            className="font-bold text-slate-900 hover:text-[#ff5a00] transition-colors"
                          >
                            {o.nome}
                          </Link>
                          <p className="text-[11.5px] font-medium text-slate-450 mt-0.5">
                            {o.codigo}
                            {o.cidade ? ` · ${o.cidade}/${o.estado || ''}` : ''}
                          </p>
                        </td>
                        <td className="px-4 py-4 text-slate-600 font-medium">
                          {o.engenheiro?.name || '—'}
                        </td>
                        <td className="px-4 py-4 text-slate-655 font-semibold text-xs uppercase">
                          {o.dataPrevisaoFim
                            ? o.dataPrevisaoFim.toLocaleDateString('pt-BR', {
                                month: 'short',
                                year: 'numeric',
                              })
                            : '—'}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex min-w-[130px] items-center gap-2.5">
                            <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                              <div
                                className={cn(
                                  'h-2 rounded-full transition-all duration-500',
                                  risco === 'Atrasada'
                                    ? 'bg-red-500'
                                    : 'bg-gradient-to-r from-[#ff5a00] to-[#ff8c00]'
                                )}
                                style={{ width: `${Math.min(pct, 100)}%` }}
                              />
                            </div>
                            <span className="w-8 text-[11.5px] font-black text-slate-700 text-right">
                              {pct}%
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={cn(
                              'inline-flex rounded-lg px-2.5 py-1 text-[11px] font-black border',
                              risco === 'Atrasada'
                                ? 'bg-red-50/50 text-red-650 border-red-100'
                                : risco === 'Atenção'
                                  ? 'bg-amber-50/50 text-amber-650 border-amber-100'
                                  : 'bg-emerald-50/50 text-emerald-650 border-emerald-100'
                            )}
                          >
                            {risco}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="space-y-5">
          <div className="rigor-card p-6 bg-white border-slate-200/50 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-black uppercase text-slate-800 tracking-tight">
                Alertas
              </h2>
              <Link
                href="/notificacoes"
                className="text-xs font-bold uppercase tracking-wider text-[#ff5a00] hover:underline"
              >
                Ver todos
              </Link>
            </div>
            {notificacoes.length === 0 ? (
              <p className="py-6 text-center text-[12.5px] text-slate-400 font-medium">
                Nenhum alerta pendente. ✅
              </p>
            ) : (
              <div className="space-y-2.5">
                {notificacoes.map((n) => (
                  <div
                    key={n.id}
                    className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/30 p-3 hover:bg-slate-50/70 transition-colors"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600 border border-amber-100/50 mt-0.5">
                      <Bell className="h-4 w-4 stroke-[2]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-[13px] text-slate-900 truncate">{n.titulo}</p>
                      <p className="text-[11.5px] font-medium text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">
                        {n.mensagem}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rigor-card p-6 bg-white border-slate-200/50 shadow-sm">
            <h2 className="text-sm font-black uppercase text-slate-800 tracking-tight mb-4">
              Hoje na operação
            </h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Link
                href="/rdo"
                className="rigor-card-interactive rounded-xl border border-slate-100 bg-slate-50/20 p-3.5 hover:bg-slate-50/80"
              >
                <p className="text-2xl font-black text-[#ff5a00] tracking-tight">{rdosHoje}</p>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mt-1">
                  RDOs hoje
                </p>
              </Link>
              <Link
                href="/ocorrencias"
                className="rigor-card-interactive rounded-xl border border-slate-100 bg-slate-50/20 p-3.5 hover:bg-slate-50/80"
              >
                <p
                  className={cn(
                    'text-2xl font-black tracking-tight',
                    ocorrenciasAbertas > 0 ? 'text-red-500' : 'text-emerald-600'
                  )}
                >
                  {ocorrenciasAbertas}
                </p>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mt-1">
                  Ocorrências
                </p>
              </Link>
              <Link
                href="/qualidade"
                className="rigor-card-interactive rounded-xl border border-slate-100 bg-slate-50/20 p-3.5 hover:bg-slate-50/80"
              >
                <p
                  className={cn(
                    'text-2xl font-black tracking-tight',
                    ncsAbertas > 0 ? 'text-amber-500' : 'text-emerald-600'
                  )}
                >
                  {ncsAbertas}
                </p>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mt-1">
                  NCs em Aberto
                </p>
              </Link>
              <Link
                href="/documentos"
                className="rigor-card-interactive rounded-xl border border-slate-100 bg-slate-50/20 p-3.5 hover:bg-slate-50/80"
              >
                <p
                  className={cn(
                    'text-2xl font-black tracking-tight',
                    docsVencendo > 0 ? 'text-amber-500' : 'text-emerald-600'
                  )}
                >
                  {docsVencendo}
                </p>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mt-1">
                  Docs a Vencer
                </p>
              </Link>
            </div>
            <div className="mt-4 flex gap-3">
              <Link
                href="/rdo/novo"
                className="rigor-btn-primary flex-1 h-10 flex items-center justify-center rounded-lg text-[13px] font-bold text-white shadow-md"
              >
                <FileText className="mr-1.5 h-4 w-4" />
                Novo RDO
              </Link>
              <Link
                href="/seguranca"
                className="flex-1 h-10 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-[13px] font-bold text-slate-655 hover:bg-slate-50 transition-colors"
              >
                <ShieldCheck className="mr-1.5 h-4 w-4 text-[#ff5a00]" />
                Segurança
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
