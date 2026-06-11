import Link from "next/link";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { cn } from "@/lib/utils";
import {
  AlertTriangle, Bell, BriefcaseBusiness, CheckCircle2, Clock3,
  DollarSign, FileText, Plus, ShieldCheck,
} from "lucide-react";

export const dynamic = "force-dynamic";

const money = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

const toneMap: Record<string, string> = {
  orange: "bg-orange-50 text-awc-orange border-orange-100",
  success: "bg-green-100 text-green-800 border-green-100",
  warning: "bg-white text-amber-700 ring-1 ring-amber-200 border-amber-100",
  danger: "bg-red-50 text-awc-danger border-red-100",
  info: "bg-blue-50 text-awc-info border-blue-100",
};

function StatCard({ label, value, hint, icon: Icon, tone = "orange" }: { label: string; value: string; hint: string; icon: React.ElementType; tone?: string }) {
  return (
    <div className="awc-card p-4">
      <div className="flex items-center gap-4">
        <div className={cn("flex h-14 w-14 items-center justify-center rounded-full border", toneMap[tone])}><Icon className="h-7 w-7" /></div>
        <div>
          <p className="awc-title text-sm">{label}</p>
          <p className={cn("text-3xl font-bold leading-tight", toneMap[tone]?.split(" ")[1])}>{value}</p>
          <p className="text-xs text-slate-500">{hint}</p>
        </div>
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const tenantId = (session?.user as any)?.tenantId as string | undefined;
  const userId = (session?.user as any)?.id as string | undefined;
  const obraWhere = tenantId ? { tenantId } : {};

  const hoje = new Date();
  const inicioHoje = new Date(hoje); inicioHoje.setHours(0, 0, 0, 0);
  const em30dias = new Date(Date.now() + 30 * 86400000);

  const [obras, lancamentos, rdosHoje, ncsAbertas, ocorrenciasAbertas, docsVencendo, notificacoes, medicoesPendentes] = await Promise.all([
    prisma.obra.findMany({
      where: obraWhere,
      include: {
        engenheiro: { select: { name: true } },
        etapas: { select: { percentualPrevisto: true, percentualRealizado: true, dataFim: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.lancamentoFinanceiro.findMany({ where: { obra: obraWhere }, select: { tipo: true, valor: true, status: true, dataVencimento: true } }),
    prisma.rDO.count({ where: { obra: obraWhere, data: { gte: inicioHoje } } }),
    prisma.naoConformidade.count({ where: { obra: obraWhere, status: { not: "ENCERRADA" } } }),
    prisma.ocorrencia.count({ where: { obra: obraWhere, status: "ABERTO" } }),
    prisma.documento.count({ where: { obra: obraWhere, validade: { gte: hoje, lte: em30dias } } }),
    userId
      ? prisma.notificacao.findMany({ where: { userId, lida: false }, orderBy: { createdAt: "desc" }, take: 5 })
      : Promise.resolve([]),
    prisma.medicao.count({ where: { obra: obraWhere, status: { in: ["EM_ELABORACAO", "APROVADA_ENGENHEIRO", "APROVADA_FINANCEIRO"] } } }),
  ]);

  type ObraRow = (typeof obras)[number];
  const avanco = (o: ObraRow) =>
    o.etapas.length ? o.etapas.reduce((s, e) => s + (e.percentualRealizado || 0), 0) / o.etapas.length : 0;
  const previsto = (o: ObraRow) =>
    o.etapas.length ? o.etapas.reduce((s, e) => s + (e.percentualPrevisto || 0), 0) / o.etapas.length : 0;
  const temEtapaAtrasada = (o: ObraRow) =>
    o.etapas.some((e) => e.dataFim && e.dataFim < hoje && (e.percentualRealizado || 0) < 100);

  const ativas = obras.filter((o) => o.status === "EM_ANDAMENTO");
  const atrasadas = ativas.filter(temEtapaAtrasada);
  const emRisco = ativas.filter((o) => !temEtapaAtrasada(o) && avanco(o) < previsto(o) - 10);
  const noPrazo = ativas.length - atrasadas.length - emRisco.length;

  const despesasPagas = lancamentos.filter((l) => l.tipo === "DESPESA" && l.status === "PAGO").reduce((s, l) => s + Number(l.valor), 0);
  const receitasRecebidas = lancamentos.filter((l) => l.tipo === "RECEITA" && l.status === "PAGO").reduce((s, l) => s + Number(l.valor), 0);
  const aPagarAberto = lancamentos.filter((l) => l.tipo === "DESPESA" && (l.status === "ABERTO" || l.status === "VENCIDO")).reduce((s, l) => s + Number(l.valor), 0);
  const vencidos = lancamentos.filter((l) => l.status === "VENCIDO" || (l.status === "ABERTO" && l.dataVencimento < hoje)).reduce((s, l) => s + Number(l.valor), 0);
  const valorCarteira = obras.reduce((s, o) => s + Number(o.valorContratado), 0);

  const riscoDe = (o: ObraRow) => (temEtapaAtrasada(o) ? "Atrasada" : avanco(o) < previsto(o) - 10 ? "Atenção" : "No prazo");

  return (
    <div className="mx-auto w-full max-w-[1540px] space-y-5 pb-8">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 text-xs font-medium text-slate-500">ObrasAWC <span className="text-awc-orange">›</span> Dashboard</div>
          <h1 className="awc-title text-3xl leading-none">Dashboard Executivo</h1>
          <p className="mt-1 text-sm text-slate-500">
            Visão geral de todas as obras — {hoje.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
          </p>
        </div>
        <Link href="/obras/novo" className="inline-flex h-9 items-center rounded-md bg-gradient-to-br from-[#ff4d00] to-[#ff7a1a] px-4 text-sm font-semibold text-white shadow-[0_10px_22px_rgba(255,77,0,.22)] transition hover:brightness-95">
          <Plus className="mr-2 h-4 w-4" />Nova obra
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Obras ativas" value={String(ativas.length)} hint={`${obras.length} na carteira`} icon={BriefcaseBusiness} tone="orange" />
        <StatCard label="No prazo" value={String(Math.max(noPrazo, 0))} hint={ativas.length ? `${Math.round((Math.max(noPrazo, 0) / ativas.length) * 100)}% da carteira` : "Sem obras ativas"} icon={CheckCircle2} tone="success" />
        <StatCard label="Em risco" value={String(emRisco.length)} hint={emRisco.length ? "Avanço abaixo do previsto" : "Nenhuma em risco"} icon={AlertTriangle} tone="warning" />
        <StatCard label="Atrasadas" value={String(atrasadas.length)} hint={atrasadas.length ? "Etapas vencidas" : "Nenhuma atrasada"} icon={Clock3} tone="danger" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Valor da carteira" value={money(valorCarteira)} hint="Total contratado" icon={DollarSign} tone="info" />
        <StatCard label="A pagar em aberto" value={money(aPagarAberto)} hint={vencidos > 0 ? `${money(vencidos)} vencidos` : "Nada vencido"} icon={DollarSign} tone={vencidos > 0 ? "danger" : "orange"} />
        <StatCard label="Recebido" value={money(receitasRecebidas)} hint={`Pago: ${money(despesasPagas)}`} icon={CheckCircle2} tone="success" />
        <StatCard label="Medições pendentes" value={String(medicoesPendentes)} hint="Aguardando aprovação" icon={FileText} tone={medicoesPendentes > 0 ? "warning" : "success"} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_.8fr]">
        <div className="awc-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="awc-title text-xl">Obras em andamento</h2>
            <Link href="/obras" className="text-sm font-semibold text-awc-orange">Ver todas</Link>
          </div>
          {ativas.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">Nenhuma obra em andamento. <Link href="/obras/novo" className="font-semibold text-awc-orange">Cadastre uma obra</Link>.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
                  <tr><th className="px-3 py-3">Obra</th><th className="px-3 py-3">Engenheiro</th><th className="px-3 py-3">Prazo</th><th className="px-3 py-3">Avanço</th><th className="px-3 py-3">Situação</th></tr>
                </thead>
                <tbody>
                  {ativas.map((o) => {
                    const risco = riscoDe(o);
                    const pct = Math.round(avanco(o));
                    return (
                      <tr key={o.id} className="border-b last:border-0 hover:bg-slate-50">
                        <td className="px-3 py-3">
                          <Link href={`/obras/${o.id}`} className="font-semibold text-slate-900 hover:text-awc-orange">{o.nome}</Link>
                          <p className="text-xs text-slate-500">{o.codigo}{o.cidade ? ` · ${o.cidade}/${o.estado || ""}` : ""}</p>
                        </td>
                        <td className="px-3 py-3 text-slate-600">{o.engenheiro?.name || "—"}</td>
                        <td className="px-3 py-3 text-slate-600">{o.dataPrevisaoFim ? o.dataPrevisaoFim.toLocaleDateString("pt-BR", { month: "short", year: "numeric" }) : "—"}</td>
                        <td className="px-3 py-3">
                          <div className="flex min-w-[130px] items-center gap-2">
                            <div className="h-2 w-full rounded-full bg-slate-100">
                              <div className={cn("h-2 rounded-full", risco === "Atrasada" ? "bg-awc-danger" : "bg-awc-orange")} style={{ width: `${Math.min(pct, 100)}%` }} />
                            </div>
                            <span className="w-9 text-xs font-bold">{pct}%</span>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <span className={cn("inline-flex rounded-md px-2 py-1 text-xs font-bold", risco === "Atrasada" ? "bg-red-50 text-awc-danger" : risco === "Atenção" ? "bg-white text-amber-700 ring-1 ring-amber-200" : "bg-green-100 text-green-800")}>{risco}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="awc-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="awc-title text-xl">Alertas</h2>
              <Link href="/notificacoes" className="text-sm font-semibold text-awc-orange">Ver todos</Link>
            </div>
            {notificacoes.length === 0 ? (
              <p className="py-4 text-center text-sm text-slate-500">Nenhum alerta pendente. ✅</p>
            ) : (
              <div className="space-y-3">
                {notificacoes.map((n) => (
                  <div key={n.id} className="flex items-center gap-3 rounded-xl border p-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-amber-700 ring-1 ring-amber-200"><Bell className="h-4 w-4" /></div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{n.titulo}</p>
                      <p className="truncate text-xs text-slate-500">{n.mensagem}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="awc-card p-5">
            <h2 className="awc-title mb-4 text-xl">Hoje na operação</h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Link href="/rdo" className="rounded-xl border p-3 hover:bg-slate-50"><p className="text-2xl font-bold text-awc-orange">{rdosHoje}</p><p className="text-xs text-slate-500">RDOs preenchidos hoje</p></Link>
              <Link href="/ocorrencias" className="rounded-xl border p-3 hover:bg-slate-50"><p className={cn("text-2xl font-bold", ocorrenciasAbertas > 0 ? "text-awc-danger" : "text-green-700")}>{ocorrenciasAbertas}</p><p className="text-xs text-slate-500">Ocorrências abertas</p></Link>
              <Link href="/qualidade" className="rounded-xl border p-3 hover:bg-slate-50"><p className={cn("text-2xl font-bold", ncsAbertas > 0 ? "text-amber-600" : "text-green-700")}>{ncsAbertas}</p><p className="text-xs text-slate-500">NCs em aberto</p></Link>
              <Link href="/documentos" className="rounded-xl border p-3 hover:bg-slate-50"><p className={cn("text-2xl font-bold", docsVencendo > 0 ? "text-amber-600" : "text-green-700")}>{docsVencendo}</p><p className="text-xs text-slate-500">Docs vencendo em 30d</p></Link>
            </div>
            <div className="mt-4 flex gap-2">
              <Link href="/rdo/novo" className="flex-1 rounded-md bg-awc-orange px-3 py-2 text-center text-sm font-semibold text-white hover:brightness-95"><FileText className="mr-1 inline h-4 w-4" />Novo RDO</Link>
              <Link href="/seguranca" className="flex-1 rounded-md border px-3 py-2 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50"><ShieldCheck className="mr-1 inline h-4 w-4" />Segurança</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
