'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Ban,
  CheckCircle2,
  KeyRound,
  Loader2,
  Save,
  ShieldAlert,
  UserCheck,
  UserX,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';

type ManagedUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  phone: string | null;
  isActive: boolean;
  mustChangePassword: boolean;
  lastLoginAt: Date | string | null;
  createdAt: Date | string;
};

type TenantControlProps = {
  tenant: {
    id: string;
    name: string;
    document: string | null;
    phone: string | null;
    billingEmail: string | null;
    plan: 'STARTER' | 'PRO' | 'BUSINESS';
    subscriptionStatus: 'TRIAL' | 'ATIVA' | 'INADIMPLENTE' | 'CANCELADA';
    isActive: boolean;
    users: ManagedUser[];
  };
};

const roleLabels: Record<string, string> = {
  SUPER_ADMIN: 'Administrador principal',
  ADMIN: 'Administrador',
  ENGENHEIRO: 'Engenheiro',
  ENCARREGADO: 'Encarregado',
  FINANCEIRO: 'Financeiro',
  ALMOXARIFE: 'Almoxarife',
  CLIENTE: 'Cliente',
};

export function TenantControlPanel({ tenant }: TenantControlProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [busyUser, setBusyUser] = useState<string | null>(null);
  const [passwordUser, setPasswordUser] = useState<ManagedUser | null>(null);
  const [passwordSaving, setPasswordSaving] = useState(false);

  async function patchTenant(payload: Record<string, unknown>, successMessage: string) {
    setSaving(true);
    try {
      const response = await fetch(`/api/master/tenants/${tenant.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Falha ao atualizar empresa');
      toast({ title: successMessage, variant: 'success' });
      router.refresh();
    } catch (error) {
      toast({ title: 'Alteração não realizada', description: error instanceof Error ? error.message : 'Tente novamente.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  async function saveCompany(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = Object.fromEntries(new FormData(event.currentTarget).entries());
    await patchTenant(fields, 'Dados comerciais atualizados');
  }

  async function toggleUser(user: ManagedUser) {
    setBusyUser(user.id);
    try {
      const response = await fetch(`/api/master/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !user.isActive }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Falha ao atualizar usuário');
      toast({ title: user.isActive ? 'Usuário desativado' : 'Usuário ativado', variant: 'success' });
      router.refresh();
    } catch (error) {
      toast({ title: 'Operação não realizada', description: error instanceof Error ? error.message : 'Tente novamente.', variant: 'destructive' });
    } finally {
      setBusyUser(null);
    }
  }

  async function resetPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!passwordUser) return;
    setPasswordSaving(true);
    const password = String(new FormData(event.currentTarget).get('password') || '');
    try {
      const response = await fetch(`/api/master/users/${passwordUser.id}/password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Falha ao redefinir senha');
      toast({ title: 'Senha temporária definida', description: 'A troca será obrigatória no próximo acesso.', variant: 'success' });
      setPasswordUser(null);
      router.refresh();
    } catch (error) {
      toast({ title: 'Senha não alterada', description: error instanceof Error ? error.message : 'Tente novamente.', variant: 'destructive' });
    } finally {
      setPasswordSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <section className="master-panel p-5 lg:p-6">
        <div className="flex flex-col gap-5 border-b border-white/8 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="master-eyebrow">Contrato e acesso</p>
            <h2 className="mt-2 text-2xl font-bold uppercase text-white">Controle da conta</h2>
          </div>
          <button
            type="button"
            disabled={saving}
            onClick={() => patchTenant({ isActive: !tenant.isActive }, tenant.isActive ? 'Empresa suspensa' : 'Empresa reativada')}
            className={tenant.isActive ? 'master-secondary-button border-red-400/20 text-red-300' : 'master-primary-button'}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : tenant.isActive ? <Ban className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
            {tenant.isActive ? 'Suspender empresa' : 'Reativar empresa'}
          </button>
        </div>
        {!tenant.isActive && (
          <div className="mt-5 flex gap-3 rounded-md border border-red-400/20 bg-red-400/8 p-4 text-xs text-red-200">
            <ShieldAlert className="h-4 w-4 shrink-0" /> Todos os usuários desta empresa estão impedidos de entrar, mas nenhum dado foi removido.
          </div>
        )}
        <form onSubmit={saveCompany} className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MasterField label="Razão / nome" name="name" defaultValue={tenant.name} required />
          <MasterField label="CNPJ / documento" name="document" defaultValue={tenant.document || ''} />
          <MasterField label="E-mail de cobrança" name="billingEmail" type="email" defaultValue={tenant.billingEmail || ''} required />
          <MasterField label="Telefone" name="phone" defaultValue={tenant.phone || ''} />
          <label className="master-field">
            <span>Plano</span>
            <select name="plan" defaultValue={tenant.plan} className="master-input">
              <option value="STARTER">Starter · R$ 249</option>
              <option value="PRO">Pro · R$ 599</option>
              <option value="BUSINESS">Business · R$ 1.290</option>
            </select>
          </label>
          <label className="master-field">
            <span>Assinatura</span>
            <select name="subscriptionStatus" defaultValue={tenant.subscriptionStatus} className="master-input">
              <option value="TRIAL">Trial</option>
              <option value="ATIVA">Ativa</option>
              <option value="INADIMPLENTE">Inadimplente</option>
              <option value="CANCELADA">Cancelada</option>
            </select>
          </label>
          <div className="flex items-end md:col-span-2">
            <button type="submit" disabled={saving} className="master-primary-button w-full md:w-auto">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Salvar alterações
            </button>
          </div>
        </form>
      </section>

      <section className="master-panel overflow-hidden">
        <div className="border-b border-white/8 p-5 lg:p-6">
          <p className="master-eyebrow">Identity management</p>
          <h2 className="mt-2 text-2xl font-bold uppercase text-white">Usuários da empresa</h2>
          <p className="mt-2 text-xs text-slate-600">Ative, bloqueie ou defina uma senha temporária sem visualizar credenciais existentes.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left">
            <thead className="border-b border-white/8 bg-white/[.018] text-[9px] uppercase tracking-[.18em] text-slate-600">
              <tr><th className="px-6 py-4">Usuário</th><th className="px-4 py-4">Perfil</th><th className="px-4 py-4">Último acesso</th><th className="px-4 py-4">Estado</th><th className="px-6 py-4 text-right">Ações</th></tr>
            </thead>
            <tbody className="divide-y divide-white/6">
              {tenant.users.map((user) => (
                <tr key={user.id} className="hover:bg-white/[.02]">
                  <td className="px-6 py-4"><p className="text-sm font-semibold text-slate-200">{user.name}</p><p className="mt-1 text-[10px] text-slate-600">{user.email}</p></td>
                  <td className="px-4 py-4 text-[10px] font-black uppercase tracking-[.08em] text-slate-500">{roleLabels[user.role] || user.role}</td>
                  <td className="px-4 py-4 font-mono text-[10px] text-slate-600">{user.lastLoginAt ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(user.lastLoginAt)) : 'Nunca acessou'}</td>
                  <td className="px-4 py-4">
                    <span className={`rounded border px-2 py-1 text-[9px] font-black uppercase tracking-[.1em] ${user.isActive ? 'border-[#c7ff4a]/20 bg-[#c7ff4a]/8 text-[#c7ff4a]' : 'border-red-400/20 bg-red-400/8 text-red-300'}`}>{user.isActive ? 'Ativo' : 'Bloqueado'}</span>
                    {user.mustChangePassword && <span className="ml-2 rounded border border-amber-400/20 bg-amber-400/8 px-2 py-1 text-[9px] font-black uppercase tracking-[.1em] text-amber-300">Troca pendente</span>}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => setPasswordUser(user)} className="master-secondary-button min-h-9 px-3" title="Definir senha temporária"><KeyRound className="h-3.5 w-3.5" /> Senha</button>
                      <button type="button" disabled={busyUser === user.id} onClick={() => toggleUser(user)} className={`master-secondary-button min-h-9 px-3 ${user.isActive ? 'hover:text-red-300' : 'hover:text-[#c7ff4a]'}`}>
                        {busyUser === user.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : user.isActive ? <UserX className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}{user.isActive ? 'Desativar' : 'Ativar'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <Dialog open={Boolean(passwordUser)} onOpenChange={(open) => !open && setPasswordUser(null)}>
        <DialogContent className="border-white/10 bg-[#0b171c] text-slate-100">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold uppercase text-white">Redefinir senha</DialogTitle>
            <DialogDescription className="text-slate-500">Defina uma senha temporária para {passwordUser?.name}. Ela não será exibida novamente.</DialogDescription>
          </DialogHeader>
          <form onSubmit={resetPassword}>
            <MasterField label="Nova senha temporária" name="password" type="password" required minLength={10} autoComplete="new-password" placeholder="Maiúscula, minúscula e número" />
            <p className="mt-2 text-[10px] text-slate-600">Mínimo de 10 caracteres. A troca será exigida no próximo acesso.</p>
            <DialogFooter className="mt-6">
              <button type="button" onClick={() => setPasswordUser(null)} className="master-secondary-button">Cancelar</button>
              <button type="submit" disabled={passwordSaving} className="master-primary-button">{passwordSaving && <Loader2 className="h-4 w-4 animate-spin" />} Confirmar redefinição</button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MasterField({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return <label className="master-field"><span>{label}</span><input {...props} className="master-input" /></label>;
}
