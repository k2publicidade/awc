"use client";

import { FormEvent, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { resourceConfig, CrudField, moduleResourceMap } from "@/lib/crud-config";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Download, Edit3, Eye, Loader2, Plus, Search, Trash2, X } from "lucide-react";

type Option = { value: string; label: string };
type Options = Record<string, Option[]>;
type TabDef = { label: string; resource: string; filters?: Record<string, string>; action?: string };
type ModalMode = "create" | "edit" | "view";
type Stats = { sum: number; statusCounts: Record<string, number>; activeCount: number | null };

const PAGE_SIZE = 25;

const moduleTabs: Record<string, TabDef[]> = {
  obras: [{ label: "Lista de Obras", resource: "obras" }, { label: "Cronograma", resource: "etapas" }, { label: "Documentos", resource: "documentos" }, { label: "Ocorrências", resource: "ocorrencias" }],
  andamento: [{ label: "Etapas", resource: "etapas" }, { label: "Medições", resource: "medicoes" }, { label: "Fotos", resource: "galeria" }, { label: "Ocorrências", resource: "ocorrencias" }],
  financeiro: [
    { label: "Fluxo de Caixa", resource: "financeiro" },
    { label: "Contas a Pagar", resource: "financeiro", filters: { tipo: "DESPESA" }, action: "Nova conta a pagar" },
    { label: "Contas a Receber", resource: "financeiro", filters: { tipo: "RECEITA" }, action: "Nova conta a receber" },
    { label: "Medições", resource: "medicoes", action: "Nova medição" },
    { label: "Notas / Documentos", resource: "documentos", filters: { categoria: "NF" }, action: "Nova NF" },
  ],
  materiais: [
    { label: "Estoque", resource: "materiais" },
    { label: "Entradas", resource: "estoqueMovimentos", filters: { tipo: "ENTRADA" }, action: "Nova entrada" },
    { label: "Saídas", resource: "estoqueMovimentos", filters: { tipo: "SAIDA" }, action: "Nova saída" },
    { label: "Requisições", resource: "requisicoes", action: "Nova requisição" },
    { label: "Fornecedores", resource: "fornecedores", action: "Novo fornecedor" },
  ],
  equipe: [
    { label: "Trabalhadores", resource: "equipe", action: "Novo funcionário" },
    { label: "Equipes por Obra", resource: "equipes", action: "Nova equipe" },
    { label: "Membros da Equipe", resource: "equipeMembros", action: "Vincular funcionário" },
    { label: "Alocação / Presença", resource: "presencas", action: "Registrar presença" },
    { label: "EPIs", resource: "epis", action: "Entregar EPI" },
    { label: "Treinamentos", resource: "treinamentos", action: "Novo treinamento" },
  ],
  documentos: [{ label: "Documentos", resource: "documentos" }, { label: "Databook", resource: "documentos", filters: { status: "APROVADO" } }, { label: "Checklist Pendente", resource: "documentos", filters: { status: "PENDENTE" } }, { label: "Notas Fiscais", resource: "documentos", filters: { categoria: "NF" } }],
  qualidade: [{ label: "Inspeções", resource: "inspecoes", action: "Nova inspeção" }, { label: "Não Conformidades", resource: "qualidade", action: "Nova NC" }, { label: "Ensaios e Laudos", resource: "documentos", filters: { categoria: "LAUDO" } }, { label: "Indicadores", resource: "qualidade" }],
  seguranca: [{ label: "Painel", resource: "seguranca" }, { label: "DDS", resource: "seguranca", action: "Novo DDS" }, { label: "Incidentes", resource: "acidentes", action: "Novo incidente" }, { label: "Treinamentos", resource: "treinamentos" }, { label: "Relatório Mensal", resource: "acidentes" }],
  galeria: [{ label: "Galeria", resource: "galeria" }, { label: "Linha do Tempo", resource: "galeria" }, { label: "Antes e Depois", resource: "galeria" }, { label: "Exportar Álbum", resource: "galeria" }],
  relatorios: [{ label: "Executivo", resource: "obras" }, { label: "Financeiro", resource: "financeiro" }, { label: "Materiais", resource: "materiais" }, { label: "Equipe", resource: "equipe" }, { label: "Documentos", resource: "documentos" }],
  contratos: [{ label: "Contratos", resource: "contratos" }, { label: "Pagamentos", resource: "financeiro", filters: { tipo: "DESPESA" } }, { label: "Fornecedores", resource: "fornecedores" }],
  ocorrencias: [{ label: "Ocorrências", resource: "ocorrencias" }, { label: "Abertas", resource: "ocorrencias", filters: { status: "ABERTO" } }, { label: "Em tratamento", resource: "ocorrencias", filters: { status: "EM_TRATAMENTO" } }, { label: "Encerradas", resource: "ocorrencias", filters: { status: "ENCERRADO" } }],
  orcamentos: [{ label: "Propostas", resource: "orcamentos" }, { label: "Aprovados", resource: "orcamentos", filters: { status: "APROVADO" } }, { label: "Em elaboração", resource: "orcamentos", filters: { status: "EM_ELABORACAO" } }],
};

const defaultAction: Record<string, string> = {
  financeiro: "Novo lançamento", medicoes: "Nova medição", materiais: "Novo material", estoqueMovimentos: "Nova movimentação", requisicoes: "Nova requisição", fornecedores: "Novo fornecedor", equipe: "Novo funcionário", equipes: "Nova equipe", equipeMembros: "Vincular funcionário", presencas: "Alocar funcionário", epis: "Entregar EPI", treinamentos: "Novo treinamento", documentos: "Novo documento", qualidade: "Nova NC", inspecoes: "Nova inspeção", seguranca: "Novo DDS", acidentes: "Novo incidente", galeria: "Nova foto", contratos: "Novo contrato", ocorrencias: "Nova ocorrência", orcamentos: "Novo orçamento", obras: "Nova obra", etapas: "Nova etapa",
};

function fmtValue(row: any, field?: CrudField) {
  if (!field) return "—";
  const value = row[field.name];
  if (field.relation && field.name.endsWith("Id")) {
    const rel = field.name.replace(/Id$/, "");
    const obj = row[rel];
    if (obj?.nome) return obj.nome;
    if (obj?.name) return obj.name;
    if (obj?.descricao) return obj.codigo ? `${obj.descricao} (${obj.codigo})` : obj.descricao;
    if (obj?.razaoSocial) return obj.nomeFantasia || obj.razaoSocial;
    if (obj?.numero) return String(obj.numero);
    if (row.obra && field.name === "obraId") return row.obra.nome;
  }
  if (value === null || value === undefined || value === "") return "—";
  if (field.type === "currency") return Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  if (field.type === "date") return new Date(value).toLocaleDateString("pt-BR");
  if (field.type === "boolean") return value ? "Sim" : "Não";
  return String(value).replaceAll("_", " ");
}

function inputValue(row: any, field: CrudField) {
  const value = row?.[field.name];
  if (value === null || value === undefined) return field.type === "boolean" ? false : "";
  if (field.type === "date") return new Date(value).toISOString().slice(0, 10);
  return value;
}

function primaryField(fields: CrudField[]) {
  return fields.find((f) => ["nome", "descricao", "tema", "razaoSocial", "objeto", "codigo"].includes(f.name)) || fields[0];
}

export function CrudModule({ module }: { module: string }) {
  return (
    <Suspense fallback={<div className="mx-auto w-full max-w-[1540px]"><div className="overflow-hidden rounded-[6px] border border-[#e1e6eb] bg-white"><TableSkeleton cols={5} /></div></div>}>
      <BuscaBridge module={module} />
    </Suspense>
  );
}

function BuscaBridge({ module }: { module: string }) {
  const busca = useSearchParams().get("busca") || "";
  // key força um remount quando a busca global muda, reiniciando aba/página/filtro
  return <CrudModuleInner key={busca} module={module} initialSearch={busca} />;
}

function CrudModuleInner({ module, initialSearch }: { module: string; initialSearch: string }) {
  const initialResource = moduleResourceMap[module] || module;
  const tabs = moduleTabs[module] || [{ label: "Cadastro", resource: initialResource }, { label: "Relatórios", resource: initialResource }];
  const [activeTab, setActiveTab] = useState(0);
  const current = tabs[activeTab] || tabs[0];
  const cfg = resourceConfig[current.resource] || resourceConfig[initialResource] || resourceConfig.obras;
  const [rows, setRows] = useState<any[]>([]);
  const [options, setOptions] = useState<Options>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState(initialSearch);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<Stats | null>(null);
  const [modal, setModal] = useState<{ mode: ModalMode; row: any } | null>(null);
  const [error, setError] = useState("");
  const { confirm, dialog: confirmDialog } = useConfirm();
  const lastSearch = useRef(initialSearch);

  const listFields = useMemo(() => cfg.fields.filter((f) => f.list).slice(0, 8), [cfg]);
  const totals = useMemo(() => computeTotals(rows, cfg.key, total, stats), [rows, cfg.key, total, stats]);

  async function load() {
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams({ search, page: String(page), pageSize: String(PAGE_SIZE) });
      Object.entries(current.filters || {}).forEach(([k, v]) => params.set(k, v));
      const [dataRes, optRes] = await Promise.all([fetch(`/api/crud/${cfg.key}?${params}`), fetch("/api/crud-options")]);
      const data = await dataRes.json();
      if (!dataRes.ok) throw new Error(data.error || "Erro ao carregar dados");
      setRows(data.rows || []);
      setTotal(data.total ?? (data.rows || []).length);
      setStats(data.stats || null);
      const optionText = await optRes.text();
      setOptions(optionText ? JSON.parse(optionText) : {});
    } catch (e: any) { setError(e.message || "Erro ao carregar"); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    const isSearchChange = lastSearch.current !== search;
    lastSearch.current = search;
    const t = setTimeout(() => load(), isSearchChange ? 400 : 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cfg.key, activeTab, page, search]);

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!modal || modal.mode === "view") return;
    setSaving(true); setError("");
    const formData = new FormData(e.currentTarget);
    const body: any = { ...(current.filters || {}) };
    for (const field of cfg.fields) body[field.name] = field.type === "boolean" ? formData.get(field.name) === "on" : formData.get(field.name);
    try {
      const isEdit = modal.mode === "edit" && Boolean(modal.row?.id);
      const res = await fetch(isEdit ? `/api/crud/${cfg.key}/${modal.row.id}` : `/api/crud/${cfg.key}`, { method: isEdit ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Erro ao salvar");
      setModal(null);
      toast({ title: isEdit ? "Alterações salvas" : "Registro criado", description: `${cfg.title} atualizado com sucesso.` });
      await load();
    } catch (e: any) { setError(e.message || "Erro ao salvar"); }
    finally { setSaving(false); }
  }

  async function remove(row: any) {
    const label = fmtValue(row, primaryField(cfg.fields));
    const ok = await confirm({
      title: "Excluir registro",
      description: `"${label}" será excluído ou arquivado. Esta ação não pode ser desfeita.`,
    });
    if (!ok) return;
    const res = await fetch(`/api/crud/${cfg.key}/${row.id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast({ variant: "destructive", title: "Erro ao excluir", description: data.error || "Tente novamente." });
      return;
    }
    toast({ title: "Registro excluído", description: `"${label}" foi removido.` });
    if (rows.length === 1 && page > 1) setPage(page - 1);
    else await load();
  }

  async function exportCsv() {
    try {
      const params = new URLSearchParams({ search });
      Object.entries(current.filters || {}).forEach(([k, v]) => params.set(k, v));
      const res = await fetch(`/api/crud/${cfg.key}?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao exportar");
      const all = data.rows || [];
      const header = listFields.map((f) => f.label);
      const lines = all.map((r: any) => listFields.map((f) => `"${String(fmtValue(r, f)).replaceAll('"', '""')}"`).join(";"));
      const blob = new Blob([[header.join(";"), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `${module}-${current.label.toLowerCase().replaceAll(" ", "-")}.csv`; a.click();
      URL.revokeObjectURL(url);
      toast({ title: "CSV exportado", description: `${all.length} registro(s) no arquivo.` });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro ao exportar CSV", description: e.message || "Tente novamente." });
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1540px] pb-8 text-[#17212b]">
      <div className="mb-5 text-[11px] font-medium text-[#7f8994]">Obras <span className="mx-2 text-[#ff5a00]">›</span> Gestão Integrada <span className="mx-2 text-[#ff5a00]">›</span> <b>{cfg.title}</b></div>
      <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h1 className="font-['Arial_Narrow',Arial,sans-serif] text-[32px] font-black uppercase leading-none tracking-[-.045em] text-[#17212b]">{moduleTitle(module, cfg.title)}</h1>
          <p className="mt-2 text-[13px] text-[#66717d]">{cfg.subtitle}</p>
          <div className="mt-5 flex flex-wrap gap-7 border-b border-[#dfe5eb]">
            {tabs.map((tab, i) => <button key={`${tab.resource}-${tab.label}`} onClick={() => { setActiveTab(i); setPage(1); }} className={cn("pb-3 text-[13px] font-black transition", i === activeTab ? "border-b-2 border-[#ff5a00] text-[#17212b]" : "text-[#717c88] hover:text-[#17212b]")}>{tab.label}</button>)}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="h-10 rounded-[4px] border-[#d8dee5] bg-white font-bold" onClick={exportCsv}><Download className="mr-2 h-4 w-4" />Exportar CSV</Button>
          <Button className="h-10 rounded-[4px] bg-[#ff5a00] px-5 font-bold text-white shadow-[0_8px_20px_rgba(255,90,0,.22)] hover:bg-[#ef5200]" onClick={() => setModal({ mode: "create", row: { ...(current.filters || {}) } })}><Plus className="mr-2 h-4 w-4" />{current.action || defaultAction[cfg.key] || "Novo registro"}</Button>
        </div>
      </div>

      <div className="mb-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {totals.map((t) => <div key={t.label} className="rounded-[6px] border border-[#e1e6eb] bg-white p-4 shadow-[0_8px_22px_rgba(23,33,43,.05)]"><p className="text-[11px] font-black uppercase text-[#66717d]">{t.label}</p><p className={cn("mt-2 text-2xl font-black", t.tone === "danger" ? "text-red-600" : t.tone === "success" ? "text-green-600" : "text-[#ff5a00]")}>{t.value}</p><p className="mt-1 text-xs text-[#7a8591]">{t.hint}</p></div>)}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative h-[44px] w-full max-w-[340px]"><Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6f7984]" /><input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} onKeyDown={(e) => e.key === "Enter" && load()} placeholder={`Buscar em ${current.label.toLowerCase()}...`} className="h-full w-full rounded-[5px] border border-[#d8dee5] bg-white pl-11 pr-9 text-[13px] outline-none focus:border-[#ff5a00]" />{search && <button onClick={() => { setSearch(""); setPage(1); }} aria-label="Limpar busca" className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-[#6f7984] hover:bg-slate-100 hover:text-[#17212b]"><X className="h-4 w-4" /></button>}</div>
        <Button variant="outline" className="h-[44px] rounded-[5px] bg-white font-bold" onClick={load}>Buscar</Button>
      </div>

      {error && !modal && <div className="mb-4 rounded-[5px] border border-red-200 bg-red-50 p-3 text-[13px] font-semibold text-red-700">{error}</div>}

      <div className="overflow-hidden rounded-[6px] border border-[#e1e6eb] bg-white shadow-[0_10px_30px_rgba(23,33,43,.06)]">
        {loading ? <TableSkeleton cols={listFields.length} /> : rows.length === 0 ? <div className="p-12 text-center"><p className="font-bold text-[#26323d]">{search ? `Nenhum resultado para “${search}”` : "Nenhum registro encontrado"}</p><p className="mt-1 text-[13px] text-[#68727d]">{search ? "Ajuste a busca ou limpe o filtro para ver todos os registros." : `Clique em “${current.action || defaultAction[cfg.key] || "Novo"}” para cadastrar.`}</p>{search && <Button variant="outline" className="mt-4 rounded-[5px] font-bold" onClick={() => { setSearch(""); setPage(1); }}>Limpar busca</Button>}</div> : <><DataTable rows={rows} fields={listFields} cfgFields={cfg.fields} offset={(page - 1) * PAGE_SIZE} onView={(row) => setModal({ mode: "view", row })} onEdit={(row) => setModal({ mode: "edit", row })} onDelete={remove} /><Pagination page={page} pageSize={PAGE_SIZE} total={total} onPage={setPage} /></>}
      </div>

      {modal && <PremiumModal mode={modal.mode} cfg={cfg} row={modal.row} options={options} saving={saving} error={error} onClose={() => { setModal(null); setError(""); }} onSave={save} />}
      {confirmDialog}
    </div>
  );
}

function moduleTitle(module: string, fallback: string) {
  const map: Record<string, string> = { financeiro: "Financeiro", materiais: "Materiais", equipe: "Equipe", documentos: "Documentos", qualidade: "Qualidade", seguranca: "Segurança", galeria: "Galeria", andamento: "Andamento da Obra", relatorios: "Relatórios", contratos: "Contratos", ocorrencias: "Ocorrências" };
  return map[module] || fallback;
}

function computeTotals(rows: any[], key: string, total: number, stats: Stats | null) {
  const money = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const countOf = (statuses: string[]) => stats
    ? statuses.reduce((s, st) => s + (stats.statusCounts[st] || 0), 0)
    : rows.filter((r) => statuses.includes(r.status || r.resultado)).length;
  const sum = stats ? stats.sum : rows.reduce((s, r) => s + Number(r.valor ?? r.valorTotal ?? r.precoMedio ?? 0), 0);
  if (["financeiro", "medicoes", "contratos", "orcamentos"].includes(key)) return [{ label: "Total", value: money(sum), hint: "Soma dos registros", tone: "orange" }, { label: "Abertos", value: String(countOf(["ABERTO", "EM_ELABORACAO", "PENDENTE"])), hint: "Aguardando ação", tone: "danger" }, { label: "Pagos/Aprovados", value: String(countOf(["PAGO", "APROVADO", "APROVADA_CLIENTE"])), hint: "Concluídos", tone: "success" }, { label: "Registros", value: String(total), hint: "Itens cadastrados", tone: "orange" }];
  const ativos = stats
    ? (stats.activeCount ?? 0) + countOf(["APROVADO", "CONFORME", "ENTREGUE"])
    : rows.filter((r) => r.isActive === true || ["APROVADO", "CONFORME", "ENTREGUE"].includes(r.status || r.resultado)).length;
  return [{ label: "Registros", value: String(total), hint: "Itens cadastrados", tone: "orange" }, { label: "Ativos/Aprovados", value: String(ativos), hint: "Em conformidade", tone: "success" }, { label: "Pendências", value: String(countOf(["PENDENTE", "ABERTA", "NAO_CONFORME", "VENCIDO"])), hint: "Requer atenção", tone: "danger" }, { label: "Atualizado", value: "Agora", hint: "Dados do banco", tone: "orange" }];
}

function Pagination({ page, pageSize, total, onPage }: { page: number; pageSize: number; total: number; onPage: (p: number) => void }) {
  const pages = Math.ceil(total / pageSize);
  if (pages <= 1) return null;
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  const nums: (number | "...")[] = [];
  for (let p = 1; p <= pages; p++) {
    if (p === 1 || p === pages || Math.abs(p - page) <= 1) nums.push(p);
    else if (nums[nums.length - 1] !== "...") nums.push("...");
  }
  const btn = "flex h-8 min-w-8 items-center justify-center rounded-[4px] px-2 text-[12px] font-bold transition disabled:cursor-not-allowed disabled:opacity-40";
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e4e9ee] bg-[#fbfcfd] px-5 py-3">
      <p className="text-[12px] font-semibold text-[#64707c]">Mostrando {start}–{end} de {total}</p>
      <nav className="flex items-center gap-1" aria-label="Paginação">
        <button disabled={page === 1} onClick={() => onPage(page - 1)} aria-label="Página anterior" className={cn(btn, "text-[#52606d] hover:bg-slate-100")}><ChevronLeft className="h-4 w-4" /></button>
        {nums.map((n, i) => n === "..."
          ? <span key={`gap-${i}`} className="px-1 text-[12px] text-[#8a939e]">…</span>
          : <button key={n} onClick={() => onPage(n)} aria-current={n === page ? "page" : undefined} className={cn(btn, n === page ? "bg-[#ff5a00] text-white" : "text-[#52606d] hover:bg-slate-100")}>{n}</button>)}
        <button disabled={page === pages} onClick={() => onPage(page + 1)} aria-label="Próxima página" className={cn(btn, "text-[#52606d] hover:bg-slate-100")}><ChevronRight className="h-4 w-4" /></button>
      </nav>
    </div>
  );
}

function DataTable({ rows, fields, cfgFields, offset = 0, onView, onEdit, onDelete }: { rows: any[]; fields: CrudField[]; cfgFields: CrudField[]; offset?: number; onView: (row: any) => void; onEdit: (row: any) => void; onDelete: (row: any) => void }) {
  return <div className="overflow-x-auto"><table className="w-full min-w-[980px] text-left text-[13px]"><thead><tr className="border-b border-[#e4e9ee] bg-[#fbfcfd] text-[11px] font-black uppercase text-[#52606d]"><th className="w-12 px-5 py-4">#</th>{fields.map((f) => <th key={f.name} className="px-3 py-4">{f.label}</th>)}<th className="px-3 py-4 text-right">Ações</th></tr></thead><tbody>{rows.map((row, i) => <tr key={row.id} className="border-b border-[#edf0f3] last:border-0 hover:bg-[#fafbfc]"><td className="px-5 py-4 font-bold text-[#27323e]">{offset + i + 1}</td>{fields.map((f) => <td key={f.name} className="max-w-[240px] truncate px-3 py-4 text-[#26323d]">{f.name === "status" || f.name === "resultado" ? <StatusPill value={fmtValue(row, f)} /> : fmtValue(row, f)}</td>)}<td className="whitespace-nowrap px-3 py-4 text-right"><button title="Ver detalhes" onClick={() => onView(row)} className="mr-2 rounded p-2 text-[#52606d] hover:bg-slate-100"><Eye className="h-4 w-4" /></button><button title="Editar" onClick={() => onEdit(row)} className="mr-2 rounded p-2 text-[#ff5a00] hover:bg-orange-50"><Edit3 className="h-4 w-4" /></button><button title="Excluir" onClick={() => onDelete(row)} className="rounded p-2 text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button></td></tr>)}</tbody></table></div>;
}

function StatusPill({ value }: { value: string }) {
  const v = value.toUpperCase();
  const danger = /VENC|REPROV|CANCEL|CRIT|ABERTA|NAO/.test(v);
  const warn = /PEND|ABERTO|ELABORACAO|TRATAMENTO|EXECUCAO|MEDIO/.test(v);
  return <span className={cn("inline-flex rounded-full px-2.5 py-1 text-[11px] font-black", danger ? "bg-red-50 text-red-700" : warn ? "bg-amber-50 text-amber-700" : "bg-green-50 text-green-700")}>{value}</span>;
}

function PremiumModal({ mode, cfg, row, options, saving, error, onClose, onSave }: { mode: ModalMode; cfg: any; row: any; options: Options; saving: boolean; error?: string; onClose: () => void; onSave: (e: FormEvent<HTMLFormElement>) => void }) {
  const readOnly = mode === "view";
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#071622]/55 p-4 backdrop-blur-sm" onClick={() => { if (readOnly) onClose(); }}><div role="dialog" aria-modal="true" aria-label={cfg.title} className="max-h-[92vh] w-full max-w-4xl overflow-hidden rounded-[10px] border border-white/30 bg-white shadow-[0_30px_80px_rgba(7,22,34,.35)]" onClick={(e) => e.stopPropagation()}><div className="flex items-start justify-between border-b border-[#e5eaf0] bg-gradient-to-r from-[#071622] to-[#102838] px-7 py-5 text-white"><div><p className="text-[11px] font-black uppercase text-[#ffb08a]">{mode === "create" ? "Cadastro" : mode === "edit" ? "Edição" : "Detalhes"}</p><h2 className="mt-1 font-['Arial_Narrow',Arial,sans-serif] text-2xl font-black uppercase tracking-[-.035em]">{cfg.title}</h2><p className="mt-1 text-sm text-white/65">Dados integrados ao banco e aos módulos do sistema.</p></div><button onClick={onClose} aria-label="Fechar" className="rounded-md p-2 text-white/80 hover:bg-white/10"><X className="h-5 w-5" /></button></div><form onSubmit={onSave}><div className="grid max-h-[62vh] gap-5 overflow-y-auto p-7 md:grid-cols-2">{error && <div className="md:col-span-2 rounded-[5px] border border-red-200 bg-red-50 p-3 text-[13px] font-semibold text-red-700">{error}</div>}{cfg.fields.map((field: CrudField) => <Field key={field.name} field={field} value={inputValue(row, field)} options={options} readOnly={readOnly} />)}</div><div className="flex items-center justify-between border-t border-[#e5eaf0] bg-[#fbfcfd] px-7 py-4"><p className="text-xs font-semibold text-[#64707c]">{readOnly ? "Campos em modo somente leitura." : "Preencha os dados e salve para integrar aos relatórios."}</p><div className="flex gap-3"><Button type="button" variant="outline" className="rounded-[4px] font-bold" onClick={onClose}>Fechar</Button>{!readOnly && <Button className="rounded-[4px] bg-[#ff5a00] font-bold text-white hover:bg-[#ef5200]" disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar</Button>}</div></div></form></div></div>;
}

function TableSkeleton({ cols }: { cols: number }) {
  const widths = ["w-2/3", "w-1/2", "w-3/4", "w-2/5", "w-1/3", "w-3/5"];
  return (
    <div className="p-6" aria-busy="true" aria-label="Carregando dados">
      <div className="mb-5 flex gap-6">
        {Array.from({ length: Math.min(cols + 1, 6) }).map((_, j) => (
          <div key={j} className="h-3 flex-1 animate-pulse rounded bg-slate-200/80" />
        ))}
      </div>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="mb-4 flex items-center gap-6">
          {Array.from({ length: Math.min(cols + 1, 6) }).map((_, j) => (
            <div key={j} className={cn("h-4 flex-1 animate-pulse rounded bg-slate-100", widths[(i + j) % widths.length])} />
          ))}
        </div>
      ))}
    </div>
  );
}

function Field({ field, value, options, readOnly }: { field: CrudField; value: any; options: Options; readOnly: boolean }) {
  const relOpts = field.relation ? options[field.relation] || [] : [];
  const cls = "h-10 w-full rounded-[5px] border border-[#d8dee5] bg-white px-3 text-[13px] text-[#202b36] outline-none focus:border-[#ff5a00] disabled:bg-[#f6f8fa]";
  return <label className="block space-y-2"><span className="text-[12px] font-black text-[#24303b]">{field.label}{field.required && <span className="text-[#ff5a00]"> *</span>}</span>{field.type === "textarea" ? <textarea disabled={readOnly} name={field.name} defaultValue={value || ""} required={field.required} className="min-h-[88px] w-full rounded-[5px] border border-[#d8dee5] p-3 text-[13px] outline-none focus:border-[#ff5a00] disabled:bg-[#f6f8fa]" /> : field.type === "select" ? <select disabled={readOnly} name={field.name} defaultValue={value || ""} required={field.required} className={cls}><option value="">Selecione...</option>{field.options?.map((o) => <option key={o} value={o}>{o.replaceAll("_", " ")}</option>)}{relOpts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select> : field.type === "boolean" ? <input disabled={readOnly} name={field.name} type="checkbox" defaultChecked={Boolean(value)} className="h-5 w-5 rounded border-slate-300 text-[#ff5a00]" /> : <input disabled={readOnly} name={field.name} type={field.type === "date" ? "date" : field.type === "number" || field.type === "currency" ? "number" : "text"} step={field.type === "currency" ? "0.01" : field.type === "number" ? "any" : undefined} defaultValue={value || ""} required={field.required} className={cls} />}</label>;
}
