import Link from "next/link";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { cn } from "@/lib/utils";
import {
  AlertTriangle, ArrowLeft, BarChart3, CalendarDays, DollarSign,
  FileText, MapPin, Printer, ShieldCheck, User,
} from "lucide-react";

export const dynamic = "force-dynamic";

const money = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

const statusLabel: Record<string, { label: string; cls: string }> = {
  PLANEJAMENTO: { label: "Planejamento", cls: "bg-blue-50 text-blue-700" },
  EM_ANDAMENTO: { label: "Em andamento", cls: "bg-green-100 text-green-800" },
  PAUSADO: { label: "Pausado", cls: "bg-amber-50 text-amber-700" },
  CONCLUIDO: { label: "Concluído", cls: "bg-slate-100 text-slate-700" },
  CANCELADO: { label: "Cancelado", cls: "bg-red-50 text-red-700" },
};

export default async function ObraDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const obra = await prisma.obra.findUnique({
    where: { id },
    include: {
      engenheiro: { select: { name: true } },
      cliente: { select: { name: true } },
      etapas: { orderBy: { ordem: "asc" } },
      rdos: { orderBy: { data: "desc" }, take: 5, include: { responsavel: { select: { name: true } } } },
      lancamentos: { select: { tipo: true, valor: true, status: true } },
      documentos: { orderBy: { createdAt: "desc" }, take: 5 },
      ocorrencias: { where: { status: "ABERTO" }, orderBy: { dataAbertura: "desc" }, take: 5 },
      medicoes: { orderBy: { numero: "desc" }, take: 5 },
    },
  });
  if (!obra) notFound();

  const hoje = new Date();
  const avanco = obra.etapas.length
    ? obra.etapas.reduce((s, e) => s + (e.percentualRealizado || 0), 0) / obra.etapas.length
    : 0;
  const despesas = obra.lancamentos.filter((l) => l.tipo === "DESPESA").reduce((s, l) => s + Number(l.valor), 0);
  const receitas = obra.lancamentos.filter((l) => l.tipo === "RECEITA").reduce((s, l) => s + Number(l.valor), 0);
  const etapasAtrasadas = obra.etapas.filter((e) => e.dataFim && e.dataFim < hoje && (e.percentualRealizado || 0) < 100);
  const st = statusLabel[obra.status] || statusLabel.PLANEJAMENTO;

  return (
    <div className="mx-auto w-full max-w-[1540px] space-y-5 pb-8">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Link href="/obras" className="mb-2 inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-awc-orange">
            <ArrowLeft className="h-3.5 w-3.5" />Obras
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="awc-title text-3xl leading-none">{obra.nome}</h1>
            <span className={cn("inline-flex rounded-md px-2.5 py-1 text-xs font-bold", st.cls)}>{st.label}</span>
          </div>
          <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
            <span className="font-mono">{obra.codigo}</span>
            {obra.cidade && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{obra.cidade}{obra.estado ? `/${obra.estado}` : ""}</span>}
            {obra.engenheiro && <span className="inline-flex items-center gap-1"><User className="h-3.5 w-3.5" />Eng. {obra.engenheiro.name}</span>}
            {obra.cliente && <span>Cliente: {obra.cliente.name}</span>}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={`/api/relatorios?type=executivo&obraId=${obra.id}`} target="_blank" className="inline-flex h-9 items-center rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            <Printer className="mr-2 h-4 w-4" />Relatório executivo
          </a>
          <Link href="/rdo/novo" className="inline-flex h-9 items-center rounded-md bg-gradient-to-br from-[#ff4d00] to-[#ff7a1a] px-4 text-sm font-semibold text-white shadow-[0_10px_22px_rgba(255,77,0,.22)] hover:brightness-95">
            <FileText className="mr-2 h-4 w-4" />Novo RDO
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="awc-card p-4">
          <p className="text-xs font-bold uppercase text-slate-500">Avanço físico</p>
          <p className="mt-1 text-2xl font-bold text-awc-orange">{avanco.toFixed(0)}%</p>
          <div className="mt-2 h-2 w-full rounded-full bg-slate-100"><div className="h-2 rounded-full bg-awc-orange" style={{ width: `${Math.min(avanco, 100)}%` }} /></div>
        </div>
        <div className="awc-card p-4">
          <p className="text-xs font-bold uppercase text-slate-500">Valor contratado</p>
          <p className="mt-1 text-2xl font-bold text-awc-dark">{money(Number(obra.valorContratado))}</p>
          <p className="mt-1 text-xs text-slate-500">{obra.dataInicio ? `Início ${obra.dataInicio.toLocaleDateString("pt-BR")}` : "Início não definido"}</p>
        </div>
        <div className="awc-card p-4">
          <p className="text-xs font-bold uppercase text-slate-500">Financeiro</p>
          <p className={cn("mt-1 text-2xl font-bold", receitas - despesas >= 0 ? "text-green-700" : "text-awc-danger")}>{money(receitas - despesas)}</p>
          <p className="mt-1 text-xs text-slate-500">Receitas {money(receitas)} · Despesas {money(despesas)}</p>
        </div>
        <div className="awc-card p-4">
          <p className="text-xs font-bold uppercase text-slate-500">Prazo</p>
          <p className={cn("mt-1 text-2xl font-bold", etapasAtrasadas.length > 0 ? "text-awc-danger" : "text-green-700")}>
            {obra.dataPrevisaoFim ? obra.dataPrevisaoFim.toLocaleDateString("pt-BR") : "—"}
          </p>
          <p className="mt-1 text-xs text-slate-500">{etapasAtrasadas.length > 0 ? `${etapasAtrasadas.length} etapa(s) atrasada(s)` : "Sem etapas atrasadas"}</p>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_.8fr]">
        <div className="awc-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="awc-title text-xl">Cronograma</h2>
            <Link href="/cronograma" className="text-sm font-semibold text-awc-orange">Abrir Gantt</Link>
          </div>
          {obra.etapas.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">Nenhuma etapa cadastrada. <Link href="/cronograma" className="font-semibold text-awc-orange">Monte o cronograma</Link>.</p>
          ) : (
            <div className="space-y-3">
              {obra.etapas.map((e) => {
                const atrasada = e.dataFim && e.dataFim < hoje && (e.percentualRealizado || 0) < 100;
                return (
                  <div key={e.id} className="flex items-center gap-3">
                    <span className="w-6 font-mono text-xs text-slate-400">{e.ordem}</span>
                    <span className="w-48 truncate text-sm font-semibold">{e.nome}</span>
                    <div className="h-2 flex-1 rounded-full bg-slate-100">
                      <div className={cn("h-2 rounded-full", atrasada ? "bg-awc-danger" : (e.percentualRealizado || 0) >= 100 ? "bg-awc-success" : "bg-awc-orange")} style={{ width: `${Math.min(e.percentualRealizado || 0, 100)}%` }} />
                    </div>
                    <span className="w-10 text-right text-xs font-bold">{(e.percentualRealizado || 0).toFixed(0)}%</span>
                    {atrasada && <AlertTriangle className="h-4 w-4 text-awc-danger" />}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="awc-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="awc-title text-xl">Últimos RDOs</h2>
              <Link href="/rdo" className="text-sm font-semibold text-awc-orange">Ver todos</Link>
            </div>
            {obra.rdos.length === 0 ? (
              <p className="py-3 text-center text-sm text-slate-500">Nenhum RDO registrado.</p>
            ) : (
              <div className="space-y-2 text-sm">
                {obra.rdos.map((r) => (
                  <Link key={r.id} href={`/rdo/editar/${r.id}`} className="flex items-center justify-between rounded-lg border p-2.5 hover:bg-slate-50">
                    <span className="font-semibold">RDO Nº {r.numero}</span>
                    <span className="text-slate-500">{r.data.toLocaleDateString("pt-BR")}</span>
                    <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-bold", r.status === "APROVADO" ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700")}>{r.status}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="awc-card p-5">
            <h2 className="awc-title mb-3 text-xl">Atalhos</h2>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <Link href="/financeiro" className="flex items-center gap-2 rounded-lg border p-3 hover:bg-slate-50"><DollarSign className="h-4 w-4 text-awc-orange" />Financeiro</Link>
              <Link href="/documentos" className="flex items-center gap-2 rounded-lg border p-3 hover:bg-slate-50"><FileText className="h-4 w-4 text-awc-orange" />Documentos ({obra.documentos.length})</Link>
              <Link href="/qualidade" className="flex items-center gap-2 rounded-lg border p-3 hover:bg-slate-50"><ShieldCheck className="h-4 w-4 text-awc-orange" />Qualidade</Link>
              <Link href="/andamento" className="flex items-center gap-2 rounded-lg border p-3 hover:bg-slate-50"><BarChart3 className="h-4 w-4 text-awc-orange" />Andamento</Link>
            </div>
          </div>

          {obra.ocorrencias.length > 0 && (
            <div className="awc-card p-5">
              <h2 className="awc-title mb-3 text-xl">Ocorrências abertas</h2>
              <div className="space-y-2 text-sm">
                {obra.ocorrencias.map((o) => (
                  <div key={o.id} className="flex items-start gap-2 rounded-lg border border-amber-100 bg-amber-50/50 p-2.5">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{o.descricao}</p>
                      <p className="text-xs text-slate-500">{o.tipo.replaceAll("_", " ")} · {o.dataAbertura.toLocaleDateString("pt-BR")}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {obra.medicoes.length > 0 && (
            <div className="awc-card p-5">
              <h2 className="awc-title mb-3 text-xl">Medições</h2>
              <div className="space-y-2 text-sm">
                {obra.medicoes.map((m) => (
                  <div key={m.id} className="flex items-center justify-between rounded-lg border p-2.5">
                    <span className="font-semibold">Medição #{m.numero}</span>
                    <span>{money(Number(m.valorTotal))}</span>
                    <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-bold", m.status.startsWith("APROVADA") ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700")}>{m.status.replaceAll("_", " ")}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {obra.descricao && (
        <div className="awc-card p-5">
          <h2 className="awc-title mb-2 text-xl">Descrição</h2>
          <p className="text-sm text-slate-600">{obra.descricao}</p>
        </div>
      )}

      <div className="awc-card p-5">
        <h2 className="awc-title mb-3 flex items-center gap-2 text-xl"><CalendarDays className="h-5 w-5 text-awc-orange" />Datas</h2>
        <div className="grid gap-3 text-sm md:grid-cols-3">
          <div className="rounded-lg border p-3"><p className="text-xs font-bold uppercase text-slate-500">Início</p><p className="mt-1 font-semibold">{obra.dataInicio?.toLocaleDateString("pt-BR") || "—"}</p></div>
          <div className="rounded-lg border p-3"><p className="text-xs font-bold uppercase text-slate-500">Previsão de término</p><p className="mt-1 font-semibold">{obra.dataPrevisaoFim?.toLocaleDateString("pt-BR") || "—"}</p></div>
          <div className="rounded-lg border p-3"><p className="text-xs font-bold uppercase text-slate-500">Conclusão</p><p className="mt-1 font-semibold">{obra.dataConclusao?.toLocaleDateString("pt-BR") || "Em andamento"}</p></div>
        </div>
      </div>
    </div>
  );
}
