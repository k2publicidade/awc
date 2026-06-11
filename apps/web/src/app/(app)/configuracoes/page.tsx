"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { KeyRound, Loader2, Plus, Users, X } from "lucide-react";

interface Usuario {
  id: string; name: string; email: string; role: string;
  phone?: string | null; isActive: boolean; createdAt: string;
}

const ROLES = ["SUPER_ADMIN", "ADMIN", "ENGENHEIRO", "ENCARREGADO", "FINANCEIRO", "ALMOXARIFE", "CLIENTE"];

const roleLabel: Record<string, string> = {
  SUPER_ADMIN: "Super Admin", ADMIN: "Administrador", ENGENHEIRO: "Engenheiro",
  ENCARREGADO: "Encarregado", FINANCEIRO: "Financeiro", ALMOXARIFE: "Almoxarife", CLIENTE: "Cliente",
};

export default function ConfiguracoesPage() {
  const { user } = useAuth();
  const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes((user as any)?.role || "");
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/usuarios");
      if (res.ok) setUsuarios(await res.json());
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { if (isAdmin) load(); else setLoading(false); }, [isAdmin, load]);

  async function criarUsuario(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true); setMsg(null);
    const fd = new FormData(e.currentTarget);
    const password = String(fd.get("password") || "");
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fd.get("name"), email: fd.get("email"),
          password, confirmPassword: password, role: fd.get("role"),
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || "Erro ao criar usuário");
      setShowForm(false);
      setMsg({ type: "ok", text: `Usuário ${d.email} criado.` });
      await load();
    } catch (err: any) { setMsg({ type: "err", text: err.message }); }
    finally { setSaving(false); }
  }

  async function atualizar(u: Usuario, data: Partial<Usuario>) {
    setMsg(null);
    const res = await fetch("/api/usuarios", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: u.id, ...data }),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) { setMsg({ type: "err", text: d.error || "Erro ao atualizar" }); return; }
    await load();
  }

  async function alterarSenha(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true); setMsg(null);
    const fd = new FormData(e.currentTarget);
    const form = e.currentTarget;
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: fd.get("currentPassword"),
          newPassword: fd.get("newPassword"),
          confirmPassword: fd.get("confirmPassword"),
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || "Erro ao alterar senha");
      setMsg({ type: "ok", text: "Senha alterada com sucesso." });
      form.reset();
    } catch (err: any) { setMsg({ type: "err", text: err.message }); }
    finally { setSaving(false); }
  }

  return (
    <div className="mx-auto w-full max-w-[1100px] space-y-5 pb-8">
      <div>
        <div className="mb-2 text-xs font-medium text-slate-500">ObrasAWC <span className="text-awc-orange">›</span> Configurações</div>
        <h1 className="awc-title text-3xl leading-none">Configurações</h1>
        <p className="mt-1 text-sm text-slate-500">Usuários, permissões e conta</p>
      </div>

      {msg && (
        <div className={cn("rounded-md border p-3 text-sm font-semibold", msg.type === "ok" ? "border-green-200 bg-green-50 text-green-700" : "border-red-200 bg-red-50 text-red-700")}>
          {msg.text}
        </div>
      )}

      {isAdmin && (
        <div className="awc-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="awc-title flex items-center gap-2 text-xl"><Users className="h-5 w-5 text-awc-orange" />Usuários do sistema</h2>
            <Button size="sm" className="awc-btn-primary" onClick={() => setShowForm(true)}><Plus className="mr-2 h-4 w-4" />Novo usuário</Button>
          </div>
          {loading ? (
            <div className="flex h-32 items-center justify-center text-sm text-slate-500"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Carregando...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
                  <tr><th className="px-3 py-3">Nome</th><th className="px-3 py-3">E-mail</th><th className="px-3 py-3">Papel</th><th className="px-3 py-3">Status</th><th className="px-3 py-3 text-right">Ações</th></tr>
                </thead>
                <tbody>
                  {usuarios.map((u) => (
                    <tr key={u.id} className="border-b last:border-0 hover:bg-slate-50">
                      <td className="px-3 py-3 font-semibold">{u.name}{u.id === (user as any)?.id && <span className="ml-2 rounded bg-orange-50 px-1.5 py-0.5 text-[10px] font-bold text-awc-orange">você</span>}</td>
                      <td className="px-3 py-3 text-slate-600">{u.email}</td>
                      <td className="px-3 py-3">
                        <select value={u.role} onChange={(e) => atualizar(u, { role: e.target.value })}
                          className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs font-semibold outline-none focus:border-awc-orange">
                          {ROLES.map((r) => <option key={r} value={r}>{roleLabel[r]}</option>)}
                        </select>
                      </td>
                      <td className="px-3 py-3">
                        <span className={cn("inline-flex rounded-full px-2.5 py-1 text-[11px] font-black", u.isActive ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700")}>
                          {u.isActive ? "ATIVO" : "INATIVO"}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <button onClick={() => atualizar(u, { isActive: !u.isActive })}
                          className={cn("rounded px-3 py-1.5 text-xs font-bold", u.isActive ? "text-red-600 hover:bg-red-50" : "text-green-700 hover:bg-green-50")}>
                          {u.isActive ? "Desativar" : "Ativar"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <div className="awc-card max-w-xl p-5">
        <h2 className="awc-title mb-4 flex items-center gap-2 text-xl"><KeyRound className="h-5 w-5 text-awc-orange" />Alterar minha senha</h2>
        <form onSubmit={alterarSenha} className="space-y-4">
          <label className="block text-sm font-bold">Senha atual
            <input name="currentPassword" type="password" required className="mt-1 h-10 w-full rounded-md border border-slate-200 px-3 text-sm font-normal outline-none focus:border-awc-orange" />
          </label>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm font-bold">Nova senha
              <input name="newPassword" type="password" required minLength={6} className="mt-1 h-10 w-full rounded-md border border-slate-200 px-3 text-sm font-normal outline-none focus:border-awc-orange" />
            </label>
            <label className="block text-sm font-bold">Confirmar nova senha
              <input name="confirmPassword" type="password" required minLength={6} className="mt-1 h-10 w-full rounded-md border border-slate-200 px-3 text-sm font-normal outline-none focus:border-awc-orange" />
            </label>
          </div>
          <Button type="submit" className="awc-btn-primary" disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Alterar senha</Button>
        </form>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowForm(false)}>
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="awc-title text-xl">Novo usuário</h3>
              <button onClick={() => setShowForm(false)} className="rounded p-1 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={criarUsuario} className="space-y-4">
              <label className="block text-sm font-bold">Nome *
                <input name="name" required minLength={2} className="mt-1 h-10 w-full rounded-md border border-slate-200 px-3 text-sm font-normal outline-none focus:border-awc-orange" />
              </label>
              <label className="block text-sm font-bold">E-mail *
                <input name="email" type="email" required className="mt-1 h-10 w-full rounded-md border border-slate-200 px-3 text-sm font-normal outline-none focus:border-awc-orange" />
              </label>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block text-sm font-bold">Senha inicial *
                  <input name="password" type="password" required minLength={6} className="mt-1 h-10 w-full rounded-md border border-slate-200 px-3 text-sm font-normal outline-none focus:border-awc-orange" />
                </label>
                <label className="block text-sm font-bold">Papel *
                  <select name="role" required defaultValue="ENCARREGADO" className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-normal outline-none focus:border-awc-orange">
                    {ROLES.map((r) => <option key={r} value={r}>{roleLabel[r]}</option>)}
                  </select>
                </label>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
                <Button type="submit" className="awc-btn-primary" disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Criar usuário</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
