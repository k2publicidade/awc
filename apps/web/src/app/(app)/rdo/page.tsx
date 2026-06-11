"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, FileText, Plus, Search, Loader2, X } from "lucide-react";

const PAGE_SIZE = 25;

export default function RDOPage() {
  const [rdos, setRdos] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let active = true;
    const t = setTimeout(() => {
      setLoading(true);
      fetch(`/api/crud/rdos?search=${encodeURIComponent(search)}&page=${page}&pageSize=${PAGE_SIZE}`)
        .then((r) => r.json())
        .then((data) => { if (active) { setRdos(data.rows || []); setTotal(data.total ?? (data.rows || []).length); } })
        .catch(() => { if (active) { setRdos([]); setTotal(0); } })
        .finally(() => { if (active) setLoading(false); });
    }, search ? 400 : 0);
    return () => { active = false; clearTimeout(t); };
  }, [search, page]);

  return (
    <div className="h-full w-full">
      {/* Breadcrumb */}
      <div className="mb-6 text-[11px] font-medium text-[#7f8994]">
        <span>Obras</span>
        <span className="mx-2 text-[#ff5a00]">›</span>
        <span>Gestão Integrada</span>
        <span className="mx-2 text-[#ff5a00]">›</span>
        <b className="text-[#26323d]">RDO</b>
      </div>

      {/* Header */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-['Arial_Narrow',Arial,sans-serif] text-[31px] font-black uppercase leading-none tracking-[-.04em] text-[#17212b]">RDO</h1>
          <p className="mt-2 text-[13px] text-[#66717d]">Relatórios diários de obra — clima, efetivo, atividades e ocorrências</p>
        </div>
        <Link href="/rdo/novo">
          <Button className="mt-1 h-[39px] rounded-[4px] bg-[#ff5a00] px-5 text-[14px] font-bold text-white shadow-[0_6px_16px_rgba(255,90,0,.22)] hover:bg-[#ef5200]">
            <Plus className="mr-2 h-4 w-4" />
            Novo RDO
          </Button>
        </Link>
      </div>

      {/* Filtros */}
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <div className="relative h-[47px] w-full max-w-[260px]">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#6f7984]" />
          <input
            className="h-full w-full rounded-[5px] border border-[#d8dee5] bg-white pl-12 pr-9 text-[13px] outline-none placeholder:text-[#9aa3ad] focus:border-[#ff5a00]"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Buscar RDOs..."
          />
          {search && (
            <button onClick={() => { setSearch(""); setPage(1); }} aria-label="Limpar busca" className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-[#6f7984] hover:bg-slate-100 hover:text-[#17212b]">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Tabela */}
      <div className="overflow-hidden rounded-[6px] border border-[#e1e6eb] bg-white shadow-[0_10px_30px_rgba(23,33,43,.06)]">
        {loading ? (
          <div className="flex h-64 items-center justify-center text-[13px] text-[#68727d]">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Carregando...
          </div>
        ) : rdos.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="mx-auto mb-4 h-12 w-12 text-[#d1d5db]" />
            <p className="font-bold text-[#26323d]">{search ? `Nenhum RDO encontrado para “${search}”` : "Nenhum RDO encontrado"}</p>
            <p className="mt-1 text-[13px] text-[#68727d]">
              {search ? "Ajuste o termo ou limpe a busca para ver todos os relatórios." : "Clique em “Novo RDO” para criar o primeiro relatório diário."}
            </p>
            {search && (
              <Button variant="outline" className="mt-4 rounded-[5px] font-bold" onClick={() => { setSearch(""); setPage(1); }}>Limpar busca</Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-[#e4e9ee] text-[12px] font-black text-[#202b36]">
                  <th className="px-5 py-5">#</th>
                  <th className="px-3 py-5">Obra</th>
                  <th className="px-3 py-5">Data</th>
                  <th className="px-3 py-5">N°</th>
                  <th className="px-3 py-5">Responsável</th>
                  <th className="px-3 py-5">Clima</th>
                  <th className="px-3 py-5">Status</th>
                  <th className="px-3 py-5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {rdos.map((rdo: any, i: number) => (
                  <tr
                    key={rdo.id}
                    className="border-b border-[#edf0f3] last:border-0 hover:bg-[#fafbfc]"
                  >
                    <td className="px-5 py-5 font-bold text-[#27323e]">{(page - 1) * PAGE_SIZE + i + 1}</td>
                    <td className="max-w-[210px] truncate px-3 py-5 font-semibold text-[#24303b]">
                      <Link href={`/rdo/editar/${rdo.id}`} className="hover:text-[#ff5a00] transition-colors">
                        {rdo.obra?.nome || "—"}
                      </Link>
                    </td>
                    <td className="px-3 py-5 text-[#24303b]">
                      {rdo.data
                        ? new Date(rdo.data).toLocaleDateString("pt-BR")
                        : "—"}
                    </td>
                    <td className="px-3 py-5 text-[#24303b]">#{rdo.numero || "—"}</td>
                    <td className="px-3 py-5 text-[#24303b]">
                      {rdo.responsavel?.name || "—"}
                    </td>
                    <td className="px-3 py-5 text-[#24303b]">
                      <span className="inline-flex items-center gap-1">
                        {rdo.climaManha && (
                          <span className="text-[11px] bg-gray-100 px-2 py-0.5 rounded">
                            {String(rdo.climaManha).replace(/_/g, " ")}
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="px-3 py-5">
                      <StatusBadge status={rdo.status} />
                    </td>
                    <td className="whitespace-nowrap px-3 py-5 text-right">
                      <Link
                        href={`/rdo/editar/${rdo.id}`}
                        className="inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-[12px] font-semibold text-[#ff5a00] hover:bg-orange-50 transition-colors"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        Visualizar
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <RdoPagination page={page} total={total} onPage={setPage} />
          </div>
        )}
      </div>
    </div>
  );
}

function RdoPagination({ page, total, onPage }: { page: number; total: number; onPage: (p: number) => void }) {
  const pages = Math.ceil(total / PAGE_SIZE);
  if (pages <= 1) return null;
  const start = (page - 1) * PAGE_SIZE + 1;
  const end = Math.min(page * PAGE_SIZE, total);
  const btn = "flex h-8 min-w-8 items-center justify-center rounded-[4px] px-2 text-[12px] font-bold transition disabled:cursor-not-allowed disabled:opacity-40";
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e4e9ee] bg-[#fbfcfd] px-5 py-3">
      <p className="text-[12px] font-semibold text-[#64707c]">Mostrando {start}–{end} de {total}</p>
      <nav className="flex items-center gap-1" aria-label="Paginação">
        <button disabled={page === 1} onClick={() => onPage(page - 1)} aria-label="Página anterior" className={cn(btn, "text-[#52606d] hover:bg-slate-100")}><ChevronLeft className="h-4 w-4" /></button>
        <span className="px-2 text-[12px] font-bold text-[#26323d]">{page} / {pages}</span>
        <button disabled={page === pages} onClick={() => onPage(page + 1)} aria-label="Próxima página" className={cn(btn, "text-[#52606d] hover:bg-slate-100")}><ChevronRight className="h-4 w-4" /></button>
      </nav>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const isRascunho = status === "RASCUNHO";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold",
        isRascunho
          ? "bg-amber-50 text-amber-700"
          : "bg-green-50 text-green-700"
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          isRascunho ? "bg-amber-500" : "bg-green-500"
        )}
      />
      {isRascunho ? "Rascunho" : "Aprovado"}
    </span>
  );
}