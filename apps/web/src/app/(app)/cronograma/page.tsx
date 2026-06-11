"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { toast } from "@/components/ui/use-toast";
import { GanttChart } from "@/components/cronograma/gantt-chart";
import { cn } from "@/lib/utils";
import { CalendarDays, Loader2, Plus, Save, Trash2, X } from "lucide-react";

interface Obra { id: string; nome: string; codigo: string }
interface Etapa {
  id: string; nome: string; ordem: number; dataInicio?: string | null; dataFim?: string | null;
  percentualPrevisto: number; percentualRealizado: number; valorFinanceiro?: string | number;
}
interface Versao { id: string; versao: number; justificativa?: string | null; createdAt: string }

export default function CronogramaPage() {
  const [obras, setObras] = useState<Obra[]>([]);
  const [obraId, setObraId] = useState("");
  const [etapas, setEtapas] = useState<Etapa[]>([]);
  const [versoes, setVersoes] = useState<Versao[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editEtapa, setEditEtapa] = useState<Etapa | null>(null);
  const [error, setError] = useState("");
  const { confirm, dialog: confirmDialog } = useConfirm();

  useEffect(() => {
    fetch("/api/crud/obras")
      .then((r) => r.json())
      .then((d) => {
        const rows: Obra[] = d.rows || [];
        setObras(rows);
        if (rows.length > 0) setObraId(rows[0].id);
        else setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const loadCronograma = useCallback(async (id: string) => {
    if (!id) return;
    setLoading(true); setError("");
    try {
      const res = await fetch(`/api/cronograma/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao carregar cronograma");
      setEtapas(data.etapas || []);
      setVersoes(data.versoes || []);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { if (obraId) loadCronograma(obraId); }, [obraId, loadCronograma]);

  async function updateEtapa(id: string, data: any) {
    setError("");
    const res = await fetch(`/api/cronograma/etapa/${id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
    });
    if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error || "Erro ao atualizar etapa"); return; }
    await loadCronograma(obraId);
  }

  async function removeEtapa(etapa: Etapa) {
    const ok = await confirm({
      title: "Excluir etapa",
      description: `A etapa "${etapa.nome}" será removida do cronograma. Esta ação não pode ser desfeita.`,
    });
    if (!ok) return;
    const res = await fetch(`/api/cronograma/etapa/${etapa.id}`, { method: "DELETE" });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast({ variant: "destructive", title: "Erro ao excluir etapa", description: d.error || "Tente novamente." });
      return;
    }
    toast({ title: "Etapa excluída", description: `"${etapa.nome}" foi removida do cronograma.` });
    await loadCronograma(obraId);
  }

  async function saveEtapa(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true); setError("");
    const fd = new FormData(e.currentTarget);
    const payload: any = {
      obraId,
      nome: fd.get("nome"),
      dataInicio: fd.get("dataInicio") || null,
      dataFim: fd.get("dataFim") || null,
      percentualPrevisto: Number(fd.get("percentualPrevisto")) || 0,
      percentualRealizado: Number(fd.get("percentualRealizado")) || 0,
      valorFinanceiro: Number(fd.get("valorFinanceiro")) || 0,
      ordem: Number(fd.get("ordem")) || etapas.length + 1,
    };
    try {
      const isEdit = Boolean(editEtapa);
      const res = await fetch(isEdit ? `/api/cronograma/etapa/${editEtapa!.id}` : "/api/crud/etapas", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || "Erro ao salvar etapa");
      setShowForm(false); setEditEtapa(null);
      toast({ title: isEdit ? "Etapa atualizada" : "Etapa criada", description: `"${payload.nome}" salva com sucesso.` });
      await loadCronograma(obraId);
    } catch (err: any) { setError(err.message); }
    finally { setSaving(false); }
  }

  async function salvarBaseline() {
    setSaving(true); setError("");
    try {
      const res = await fetch(`/api/cronograma/${obraId}`, { method: "POST" });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || "Erro ao salvar baseline");
      toast({ title: "Baseline salvo", description: `Versão ${d.versao} registrada com sucesso.` });
      await loadCronograma(obraId);
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  }

  const avancoMedio = etapas.length ? etapas.reduce((s, e) => s + (e.percentualRealizado || 0), 0) / etapas.length : 0;
  const atrasadas = etapas.filter((e) => e.dataFim && new Date(e.dataFim) < new Date() && (e.percentualRealizado || 0) < 100).length;
  const valorTotal = etapas.reduce((s, e) => s + Number(e.valorFinanceiro || 0), 0);

  return (
    <div className="mx-auto w-full max-w-[1540px] space-y-5 pb-8">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 text-xs font-medium text-slate-500">ObrasAWC <span className="text-awc-orange">›</span> Cronograma</div>
          <h1 className="awc-title text-3xl leading-none">Cronograma</h1>
          <p className="mt-1 text-sm text-slate-500">Etapas, prazos, avanço físico e baseline por obra</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={obraId} onChange={(e) => setObraId(e.target.value)}
            className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-awc-orange">
            {obras.length === 0 && <option value="">Nenhuma obra cadastrada</option>}
            {obras.map((o) => <option key={o.id} value={o.id}>{o.codigo} — {o.nome}</option>)}
          </select>
          <Button variant="outline" size="sm" onClick={salvarBaseline} disabled={!obraId || saving || etapas.length === 0}>
            <Save className="mr-2 h-4 w-4" />Salvar baseline
          </Button>
          <Button size="sm" className="awc-btn-primary" onClick={() => { setEditEtapa(null); setShowForm(true); }} disabled={!obraId}>
            <Plus className="mr-2 h-4 w-4" />Nova etapa
          </Button>
        </div>
      </div>

      {error && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</div>}

      <div className="grid gap-4 md:grid-cols-4">
        <div className="awc-card p-4"><p className="text-xs font-bold uppercase text-slate-500">Etapas</p><p className="mt-1 text-2xl font-bold text-awc-orange">{etapas.length}</p></div>
        <div className="awc-card p-4"><p className="text-xs font-bold uppercase text-slate-500">Avanço médio</p><p className="mt-1 text-2xl font-bold text-awc-dark">{avancoMedio.toFixed(0)}%</p></div>
        <div className="awc-card p-4"><p className="text-xs font-bold uppercase text-slate-500">Etapas atrasadas</p><p className={cn("mt-1 text-2xl font-bold", atrasadas > 0 ? "text-awc-danger" : "text-green-700")}>{atrasadas}</p></div>
        <div className="awc-card p-4"><p className="text-xs font-bold uppercase text-slate-500">Valor planejado</p><p className="mt-1 text-2xl font-bold text-awc-dark">{valorTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })}</p></div>
      </div>

      <div className="awc-card overflow-x-auto p-5">
        {loading ? (
          <div className="flex h-64 items-center justify-center text-sm text-slate-500"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Carregando cronograma...</div>
        ) : etapas.length === 0 ? (
          <div className="py-16 text-center">
            <CalendarDays className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-3 font-bold text-slate-700">Nenhuma etapa cadastrada para esta obra</p>
            <p className="mt-1 text-sm text-slate-500">Clique em “Nova etapa” para montar o cronograma.</p>
          </div>
        ) : (
          <GanttChart
            etapas={etapas.map((e) => ({ ...e, dataInicio: e.dataInicio || undefined, dataFim: e.dataFim || undefined })) as any}
            onUpdateEtapa={updateEtapa}
          />
        )}
      </div>

      {!loading && etapas.length > 0 && (
        <div className="awc-card p-5">
          <h2 className="awc-title mb-4 text-xl">Etapas</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
                <tr><th className="px-3 py-3">#</th><th className="px-3 py-3">Etapa</th><th className="px-3 py-3">Início</th><th className="px-3 py-3">Fim</th><th className="px-3 py-3">Previsto</th><th className="px-3 py-3">Realizado</th><th className="px-3 py-3">Valor</th><th className="px-3 py-3 text-right">Ações</th></tr>
              </thead>
              <tbody>
                {etapas.map((e) => (
                  <tr key={e.id} className="border-b last:border-0 hover:bg-slate-50">
                    <td className="px-3 py-3 font-mono text-xs">{e.ordem}</td>
                    <td className="px-3 py-3 font-semibold">{e.nome}</td>
                    <td className="px-3 py-3 text-slate-600">{e.dataInicio ? new Date(e.dataInicio).toLocaleDateString("pt-BR") : "—"}</td>
                    <td className="px-3 py-3 text-slate-600">{e.dataFim ? new Date(e.dataFim).toLocaleDateString("pt-BR") : "—"}</td>
                    <td className="px-3 py-3">{(e.percentualPrevisto || 0).toFixed(0)}%</td>
                    <td className="px-3 py-3 font-bold">{(e.percentualRealizado || 0).toFixed(0)}%</td>
                    <td className="px-3 py-3">{Number(e.valorFinanceiro || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })}</td>
                    <td className="px-3 py-3 text-right">
                      <button title="Editar" onClick={() => { setEditEtapa(e); setShowForm(true); }} className="mr-2 rounded p-1.5 text-awc-orange hover:bg-orange-50 text-xs font-bold">Editar</button>
                      <button title="Excluir" onClick={() => removeEtapa(e)} className="rounded p-1.5 text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {versoes.length > 0 && (
        <div className="awc-card p-5">
          <h2 className="awc-title mb-4 text-xl">Baselines salvos</h2>
          <div className="space-y-2">
            {versoes.map((v) => (
              <div key={v.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                <span className="font-semibold">Versão {v.versao}</span>
                <span className="text-slate-500">{v.justificativa || ""}</span>
                <span className="text-xs text-slate-400">{new Date(v.createdAt).toLocaleString("pt-BR")}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => { setShowForm(false); setEditEtapa(null); }}>
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="awc-title text-xl">{editEtapa ? "Editar etapa" : "Nova etapa"}</h3>
              <button onClick={() => { setShowForm(false); setEditEtapa(null); }} className="rounded p-1 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={saveEtapa} className="grid gap-4 md:grid-cols-2">
              <label className="md:col-span-2 block text-sm font-bold">Nome *
                <input name="nome" required defaultValue={editEtapa?.nome || ""} className="mt-1 h-10 w-full rounded-md border border-slate-200 px-3 text-sm font-normal outline-none focus:border-awc-orange" />
              </label>
              <label className="block text-sm font-bold">Início
                <input name="dataInicio" type="date" defaultValue={editEtapa?.dataInicio ? new Date(editEtapa.dataInicio).toISOString().slice(0, 10) : ""} className="mt-1 h-10 w-full rounded-md border border-slate-200 px-3 text-sm font-normal outline-none focus:border-awc-orange" />
              </label>
              <label className="block text-sm font-bold">Fim
                <input name="dataFim" type="date" defaultValue={editEtapa?.dataFim ? new Date(editEtapa.dataFim).toISOString().slice(0, 10) : ""} className="mt-1 h-10 w-full rounded-md border border-slate-200 px-3 text-sm font-normal outline-none focus:border-awc-orange" />
              </label>
              <label className="block text-sm font-bold">% Previsto
                <input name="percentualPrevisto" type="number" min={0} max={100} defaultValue={editEtapa?.percentualPrevisto ?? 0} className="mt-1 h-10 w-full rounded-md border border-slate-200 px-3 text-sm font-normal outline-none focus:border-awc-orange" />
              </label>
              <label className="block text-sm font-bold">% Realizado
                <input name="percentualRealizado" type="number" min={0} max={100} defaultValue={editEtapa?.percentualRealizado ?? 0} className="mt-1 h-10 w-full rounded-md border border-slate-200 px-3 text-sm font-normal outline-none focus:border-awc-orange" />
              </label>
              <label className="block text-sm font-bold">Valor (R$)
                <input name="valorFinanceiro" type="number" step="0.01" min={0} defaultValue={Number(editEtapa?.valorFinanceiro || 0)} className="mt-1 h-10 w-full rounded-md border border-slate-200 px-3 text-sm font-normal outline-none focus:border-awc-orange" />
              </label>
              <label className="block text-sm font-bold">Ordem
                <input name="ordem" type="number" min={1} defaultValue={editEtapa?.ordem ?? etapas.length + 1} className="mt-1 h-10 w-full rounded-md border border-slate-200 px-3 text-sm font-normal outline-none focus:border-awc-orange" />
              </label>
              <div className="md:col-span-2 flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditEtapa(null); }}>Cancelar</Button>
                <Button type="submit" className="awc-btn-primary" disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar</Button>
              </div>
            </form>
          </div>
        </div>
      )}
      {confirmDialog}
    </div>
  );
}
