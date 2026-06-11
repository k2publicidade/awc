"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  BarChart3, DollarSign, FileSpreadsheet, FileText, HardHat,
  LineChart, Loader2, Printer, ShieldCheck, BookOpen, ExternalLink,
} from "lucide-react";

interface Obra { id: string; nome: string; codigo: string }

const reports = [
  { type: "executivo", title: "Relatório Executivo", desc: "Visão geral da obra: avanço, financeiro, etapas, RDOs e medições.", icon: BarChart3 },
  { type: "curva-s", title: "Curva S", desc: "Físico x financeiro: previsto x realizado acumulado.", icon: LineChart },
  { type: "rdo", title: "RDOs Compilados", desc: "Todos os RDOs do período em um único documento.", icon: FileText },
  { type: "financeiro", title: "Relatório Financeiro", desc: "DRE, fluxo de caixa mensal e custos por categoria.", icon: DollarSign },
  { type: "qualidade", title: "Relatório de Qualidade", desc: "Inspeções, conformidade e não conformidades.", icon: ShieldCheck },
  { type: "seguranca", title: "Relatório de Segurança", desc: "DDS, acidentes, taxa de frequência e NCs de segurança.", icon: HardHat },
  { type: "databook", title: "Databook Final", desc: "Documento completo de entrega: etapas, docs, RDOs, medições e as-built.", icon: BookOpen },
];

const excels = [
  { type: "financeiro", title: "Financeiro (CSV)", desc: "Lançamentos compatíveis com Omie / Conta Azul." },
  { type: "materiais", title: "Materiais (CSV)", desc: "Movimentações de estoque." },
  { type: "orcamento", title: "Orçamento (CSV)", desc: "Itens no formato SINAPI (requer orçamento aprovado)." },
];

export default function RelatoriosPage() {
  const [obras, setObras] = useState<Obra[]>([]);
  const [obraId, setObraId] = useState("");
  const [dataInicio, setDataInicio] = useState(() => new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));
  const [dataFim, setDataFim] = useState(() => new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/crud/obras")
      .then((r) => r.json())
      .then((d) => {
        const rows: Obra[] = d.rows || [];
        setObras(rows);
        if (rows.length > 0) setObraId(rows[0].id);
      })
      .finally(() => setLoading(false));
  }, []);

  function openReport(type: string) {
    if (!obraId) return;
    const params = new URLSearchParams({ type, obraId });
    if (type === "rdo") { params.set("dataInicio", dataInicio); params.set("dataFim", dataFim); }
    window.open(`/api/relatorios?${params}`, "_blank");
  }

  function downloadExcel(type: string) {
    if (!obraId) return;
    window.open(`/api/relatorios/excel?type=${type}&obraId=${obraId}`, "_blank");
  }

  return (
    <div className="mx-auto w-full max-w-[1540px] space-y-5 pb-8">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 text-xs font-medium text-slate-500">ObrasAWC <span className="text-awc-orange">›</span> Relatórios</div>
          <h1 className="awc-title text-3xl leading-none">Relatórios</h1>
          <p className="mt-1 text-sm text-slate-500">Relatórios executivos prontos para impressão e exportações para planilha</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={obraId} onChange={(e) => setObraId(e.target.value)}
            className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-awc-orange">
            {obras.length === 0 && <option value="">Nenhuma obra cadastrada</option>}
            {obras.map((o) => <option key={o.id} value={o.id}>{o.codigo} — {o.nome}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center text-sm text-slate-500"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Carregando...</div>
      ) : obras.length === 0 ? (
        <div className="awc-card py-20 text-center">
          <BarChart3 className="mx-auto h-12 w-12 text-slate-300" />
          <p className="mt-3 font-bold text-slate-700">Nenhuma obra cadastrada</p>
          <p className="mt-1 text-sm text-slate-500">Os relatórios são gerados por obra. Cadastre a primeira para começar.</p>
          <Link href="/obras/novo" className="awc-btn-primary mt-5 inline-flex h-10 items-center rounded-md px-5 text-sm font-bold">Cadastrar obra</Link>
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {reports.map((r) => {
              const Icon = r.icon;
              return (
                <div key={r.type} className="awc-card flex flex-col p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-orange-50 text-awc-orange"><Icon className="h-5 w-5" /></div>
                    <h2 className="awc-title text-lg">{r.title}</h2>
                  </div>
                  <p className="mt-3 flex-1 text-sm text-slate-500">{r.desc}</p>
                  {r.type === "rdo" && (
                    <div className="mt-3 flex gap-2">
                      <label className="flex-1 text-xs font-bold text-slate-600">De
                        <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className="mt-1 h-9 w-full rounded-md border border-slate-200 px-2 text-sm font-normal outline-none focus:border-awc-orange" />
                      </label>
                      <label className="flex-1 text-xs font-bold text-slate-600">Até
                        <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="mt-1 h-9 w-full rounded-md border border-slate-200 px-2 text-sm font-normal outline-none focus:border-awc-orange" />
                      </label>
                    </div>
                  )}
                  <Button className="awc-btn-primary mt-4 w-full" onClick={() => openReport(r.type)} disabled={!obraId}>
                    <Printer className="mr-2 h-4 w-4" />Gerar relatório
                  </Button>
                </div>
              );
            })}
          </div>

          <div className="awc-card p-5">
            <h2 className="awc-title mb-1 text-xl">Exportações para planilha</h2>
            <p className="mb-4 text-sm text-slate-500">Arquivos CSV compatíveis com Excel e sistemas externos.</p>
            <div className="grid gap-3 md:grid-cols-3">
              {excels.map((x) => (
                <button key={x.type} onClick={() => downloadExcel(x.type)} disabled={!obraId}
                  className="flex items-center gap-3 rounded-xl border p-4 text-left transition hover:border-awc-orange hover:bg-orange-50/40 disabled:opacity-50">
                  <FileSpreadsheet className="h-8 w-8 shrink-0 text-green-700" />
                  <span>
                    <span className="block font-bold">{x.title}</span>
                    <span className="block text-xs text-slate-500">{x.desc}</span>
                  </span>
                  <ExternalLink className="ml-auto h-4 w-4 text-slate-400" />
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
