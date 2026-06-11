"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { toast } from "@/components/ui/use-toast";
import { Camera, Loader2, Plus, Trash2, X } from "lucide-react";

interface Obra { id: string; nome: string; codigo: string }
interface Etapa { id: string; nome: string }
interface Foto {
  id: string; url: string; legenda?: string | null; data: string; tags?: string | null;
  etapa?: { nome: string } | null; obraId: string;
}

export default function GaleriaPage() {
  const [obras, setObras] = useState<Obra[]>([]);
  const [obraId, setObraId] = useState("");
  const [etapas, setEtapas] = useState<Etapa[]>([]);
  const [fotos, setFotos] = useState<Foto[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [lightbox, setLightbox] = useState<Foto | null>(null);
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

  const load = useCallback(async (id: string) => {
    if (!id) return;
    setLoading(true); setError("");
    try {
      const [fotosRes, cronoRes] = await Promise.all([
        fetch(`/api/galeria?obraId=${id}`),
        fetch(`/api/cronograma/${id}`),
      ]);
      const fotosData = await fotosRes.json();
      const cronoData = await cronoRes.json().catch(() => ({}));
      setFotos(Array.isArray(fotosData) ? fotosData : []);
      setEtapas(cronoData.etapas || []);
    } catch (e: any) { setError(e.message || "Erro ao carregar fotos"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { if (obraId) load(obraId); }, [obraId, load]);

  async function salvarFoto(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true); setError("");
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/galeria", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          obraId,
          url: fd.get("url"),
          legenda: fd.get("legenda") || null,
          etapaId: fd.get("etapaId") || null,
          tags: fd.get("tags") || null,
          data: fd.get("data") || new Date().toISOString(),
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || "Erro ao salvar foto");
      setShowForm(false);
      toast({ title: "Foto adicionada", description: "A foto foi registrada na galeria." });
      await load(obraId);
    } catch (err: any) { setError(err.message); }
    finally { setSaving(false); }
  }

  async function excluir(f: Foto) {
    const ok = await confirm({
      title: "Excluir foto",
      description: `${f.legenda ? `"${f.legenda}"` : "Esta foto"} será removida da galeria. Esta ação não pode ser desfeita.`,
    });
    if (!ok) return;
    const res = await fetch(`/api/crud/galeria/${f.id}`, { method: "DELETE" });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast({ variant: "destructive", title: "Erro ao excluir foto", description: d.error || "Tente novamente." });
      return;
    }
    setLightbox(null);
    toast({ title: "Foto excluída", description: "A foto foi removida da galeria." });
    await load(obraId);
  }

  // Agrupa por mês para linha do tempo
  const grupos = fotos.reduce<Record<string, Foto[]>>((acc, f) => {
    const key = new Date(f.data).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    (acc[key] ||= []).push(f);
    return acc;
  }, {});

  return (
    <div className="mx-auto w-full max-w-[1540px] space-y-5 pb-8">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 text-xs font-medium text-slate-500">ObrasAWC <span className="text-awc-orange">›</span> Galeria</div>
          <h1 className="awc-title text-3xl leading-none">Galeria</h1>
          <p className="mt-1 text-sm text-slate-500">Evolução fotográfica por obra, etapa e data</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={obraId} onChange={(e) => setObraId(e.target.value)}
            className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-awc-orange">
            {obras.length === 0 && <option value="">Nenhuma obra cadastrada</option>}
            {obras.map((o) => <option key={o.id} value={o.id}>{o.codigo} — {o.nome}</option>)}
          </select>
          <Button size="sm" className="awc-btn-primary" onClick={() => setShowForm(true)} disabled={!obraId}>
            <Plus className="mr-2 h-4 w-4" />Adicionar foto
          </Button>
        </div>
      </div>

      {error && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</div>}

      {loading ? (
        <div className="flex h-64 items-center justify-center text-sm text-slate-500"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Carregando fotos...</div>
      ) : fotos.length === 0 ? (
        <div className="awc-card py-20 text-center">
          <Camera className="mx-auto h-12 w-12 text-slate-300" />
          <p className="mt-3 font-bold text-slate-700">Nenhuma foto nesta obra</p>
          <p className="mt-1 text-sm text-slate-500">Adicione fotos pela URL (ex.: arquivos no Supabase Storage ou Google Drive).</p>
        </div>
      ) : (
        Object.entries(grupos).map(([mes, items]) => (
          <div key={mes}>
            <h2 className="awc-title mb-3 text-xl capitalize">{mes} <span className="text-sm font-normal text-slate-400">({items.length})</span></h2>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
              {items.map((f) => (
                <button key={f.id} onClick={() => setLightbox(f)} className="group relative aspect-[4/3] overflow-hidden rounded-xl border bg-slate-100 text-left">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={f.url} alt={f.legenda || "Foto da obra"} loading="lazy"
                    className="h-full w-full object-cover transition group-hover:scale-105" />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2.5 pt-8">
                    <p className="truncate text-xs font-bold text-white">{f.legenda || "Sem legenda"}</p>
                    <p className="text-[10px] text-white/70">{new Date(f.data).toLocaleDateString("pt-BR")}{f.etapa ? ` · ${f.etapa.nome}` : ""}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))
      )}

      {lightbox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4" onClick={() => setLightbox(null)}>
          <div className="max-h-[92vh] w-full max-w-4xl" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={lightbox.url} alt={lightbox.legenda || ""} className="mx-auto max-h-[75vh] rounded-lg object-contain" />
            <div className="mt-3 flex items-center justify-between rounded-lg bg-white/10 p-3 text-white">
              <div>
                <p className="font-bold">{lightbox.legenda || "Sem legenda"}</p>
                <p className="text-xs text-white/70">{new Date(lightbox.data).toLocaleString("pt-BR")}{lightbox.etapa ? ` · ${lightbox.etapa.nome}` : ""}{lightbox.tags ? ` · ${lightbox.tags}` : ""}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => excluir(lightbox)} className="rounded p-2 text-red-300 hover:bg-white/10"><Trash2 className="h-5 w-5" /></button>
                <button onClick={() => setLightbox(null)} className="rounded p-2 hover:bg-white/10"><X className="h-5 w-5" /></button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowForm(false)}>
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="awc-title text-xl">Adicionar foto</h3>
              <button onClick={() => setShowForm(false)} className="rounded p-1 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={salvarFoto} className="space-y-4">
              <label className="block text-sm font-bold">URL da imagem *
                <input name="url" type="url" required placeholder="https://..." className="mt-1 h-10 w-full rounded-md border border-slate-200 px-3 text-sm font-normal outline-none focus:border-awc-orange" />
              </label>
              <label className="block text-sm font-bold">Legenda
                <input name="legenda" className="mt-1 h-10 w-full rounded-md border border-slate-200 px-3 text-sm font-normal outline-none focus:border-awc-orange" />
              </label>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block text-sm font-bold">Etapa
                  <select name="etapaId" className="mt-1 h-10 w-full rounded-md border border-slate-200 px-3 text-sm font-normal outline-none focus:border-awc-orange">
                    <option value="">—</option>
                    {etapas.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
                  </select>
                </label>
                <label className="block text-sm font-bold">Data
                  <input name="data" type="date" defaultValue={new Date().toISOString().slice(0, 10)} className="mt-1 h-10 w-full rounded-md border border-slate-200 px-3 text-sm font-normal outline-none focus:border-awc-orange" />
                </label>
              </div>
              <label className="block text-sm font-bold">Tags
                <input name="tags" placeholder="fundacao, antes, deposito..." className="mt-1 h-10 w-full rounded-md border border-slate-200 px-3 text-sm font-normal outline-none focus:border-awc-orange" />
              </label>
              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
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
