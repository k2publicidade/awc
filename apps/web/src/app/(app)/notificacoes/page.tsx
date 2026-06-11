"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { Bell, BellRing, Check, CheckCheck, Loader2, RefreshCw, Trash2 } from "lucide-react";

interface Notificacao {
  id: string; tipo: string; titulo: string; mensagem: string;
  lida: boolean; createdAt: string;
}

const tipoTone: Record<string, string> = {
  ETAPA_ATRASADA: "border-red-200 bg-red-50/60",
  ACIDENTE: "border-red-200 bg-red-50/60",
  NC_CRITICA: "border-red-200 bg-red-50/60",
  ESTOQUE_MINIMO: "border-amber-200 bg-amber-50/60",
  DOCUMENTO_VENCENDO: "border-amber-200 bg-amber-50/60",
  EXAME_VENCENDO: "border-amber-200 bg-amber-50/60",
  ORCAMENTO_90: "border-amber-200 bg-amber-50/60",
  RDO_PENDENTE: "border-blue-200 bg-blue-50/60",
  MEDICAO_PENDENTE: "border-blue-200 bg-blue-50/60",
};

export default function NotificacoesPage() {
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [naoLidas, setNaoLidas] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<"todas" | "nao-lidas">("todas");
  const [info] = useState("");
  const { confirm, dialog: confirmDialog } = useConfirm();

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch("/api/notificacoes");
      const d = await res.json();
      setNotificacoes(d.notificacoes || []);
      setNaoLidas(d.naoLidas || 0);
    } finally { if (!silent) setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function marcarLida(n: Notificacao, lida = true) {
    setNotificacoes((prev) => prev.map((x) => (x.id === n.id ? { ...x, lida } : x)));
    setNaoLidas((prev) => Math.max(0, prev + (lida ? -1 : 1)));
    const res = await fetch(`/api/notificacoes/${n.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lida }),
    });
    if (!res.ok) await load(true);
  }

  async function marcarTodas() {
    const pendentes = notificacoes.filter((n) => !n.lida);
    setNotificacoes((prev) => prev.map((x) => ({ ...x, lida: true })));
    setNaoLidas(0);
    await Promise.all(pendentes.map((n) =>
      fetch(`/api/notificacoes/${n.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lida: true }) })
    ));
    await load(true);
  }

  async function excluir(n: Notificacao) {
    const ok = await confirm({
      title: "Excluir notificação",
      description: `"${n.titulo}" será removida. Esta ação não pode ser desfeita.`,
    });
    if (!ok) return;
    const res = await fetch(`/api/notificacoes/${n.id}`, { method: "DELETE" });
    if (!res.ok) {
      toast({ variant: "destructive", title: "Erro ao excluir", description: "Tente novamente." });
      return;
    }
    setNotificacoes((prev) => prev.filter((x) => x.id !== n.id));
    if (!n.lida) setNaoLidas((prev) => Math.max(0, prev - 1));
  }

  const visiveis = filtro === "todas" ? notificacoes : notificacoes.filter((n) => !n.lida);

  return (
    <div className="mx-auto w-full max-w-[1100px] space-y-5 pb-8">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 text-xs font-medium text-slate-500">ObrasAWC <span className="text-awc-orange">›</span> Notificações</div>
          <h1 className="awc-title text-3xl leading-none">Notificações</h1>
          <p className="mt-1 text-sm text-slate-500">{naoLidas > 0 ? `${naoLidas} não lida(s)` : "Tudo em dia ✅"}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => load()} disabled={loading}><RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />Atualizar</Button>
          <Button variant="outline" size="sm" onClick={marcarTodas} disabled={naoLidas === 0}><CheckCheck className="mr-2 h-4 w-4" />Marcar todas como lidas</Button>
        </div>
      </div>

      {info && <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm font-semibold text-green-700">{info}</div>}

      <div className="flex gap-2">
        {(["todas", "nao-lidas"] as const).map((f) => (
          <button key={f} onClick={() => setFiltro(f)}
            className={cn("rounded-full px-4 py-1.5 text-sm font-bold transition", filtro === f ? "bg-awc-orange text-white" : "border bg-white text-slate-600 hover:bg-slate-50")}>
            {f === "todas" ? `Todas (${notificacoes.length})` : `Não lidas (${naoLidas})`}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="flex h-48 items-center justify-center text-sm text-slate-500"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Carregando...</div>
        ) : visiveis.length === 0 ? (
          <div className="awc-card py-16 text-center">
            <Bell className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-3 font-bold text-slate-700">Nenhuma notificação {filtro === "nao-lidas" ? "pendente" : ""}</p>
            <p className="mt-1 text-sm text-slate-500">Os alertas automáticos do sistema aparecerão aqui.</p>
          </div>
        ) : (
          visiveis.map((n) => (
            <div key={n.id} className={cn("flex items-start gap-3 rounded-xl border bg-white p-4 shadow-sm transition", !n.lida && (tipoTone[n.tipo] || "border-orange-200 bg-orange-50/40"))}>
              <div className={cn("mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full", n.lida ? "bg-slate-100 text-slate-400" : "bg-awc-orange/10 text-awc-orange")}>
                {n.lida ? <Bell className="h-4 w-4" /> : <BellRing className="h-4 w-4" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className={cn("font-bold", n.lida && "text-slate-500")}>{n.titulo}</p>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-500">{n.tipo.replaceAll("_", " ")}</span>
                </div>
                <p className={cn("mt-0.5 text-sm", n.lida ? "text-slate-400" : "text-slate-600")}>{n.mensagem}</p>
                <p className="mt-1 text-xs text-slate-400">{new Date(n.createdAt).toLocaleString("pt-BR")}</p>
              </div>
              <div className="flex shrink-0 gap-1">
                {!n.lida && (
                  <button title="Marcar como lida" onClick={() => marcarLida(n)} className="rounded p-2 text-green-600 hover:bg-green-50"><Check className="h-4 w-4" /></button>
                )}
                <button title="Excluir" onClick={() => excluir(n)} className="rounded p-2 text-red-500 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          ))
        )}
      </div>
      {confirmDialog}
    </div>
  );
}
