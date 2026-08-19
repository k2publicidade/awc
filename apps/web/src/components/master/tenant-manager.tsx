'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowUpRight, Building2, Loader2, Plus, Search } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';

type TenantRow = {
  id: string;
  name: string;
  slug: string;
  plan: 'STARTER' | 'PRO' | 'BUSINESS';
  subscriptionStatus: 'TRIAL' | 'ATIVA' | 'INADIMPLENTE' | 'CANCELADA';
  isActive: boolean;
  billingEmail: string | null;
  createdAt: Date | string;
  _count: { users: number; obras: number };
};

const statusStyle: Record<string, string> = {
  TRIAL: 'border-sky-400/20 bg-sky-400/10 text-sky-300',
  ATIVA: 'border-[#c7ff4a]/25 bg-[#c7ff4a]/10 text-[#c7ff4a]',
  INADIMPLENTE: 'border-amber-400/25 bg-amber-400/10 text-amber-300',
  CANCELADA: 'border-red-400/20 bg-red-400/10 text-red-300',
};

export function TenantManager({ tenants }: { tenants: TenantRow[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [query, setQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return tenants;
    return tenants.filter((tenant) =>
      [tenant.name, tenant.billingEmail, tenant.slug].some((value) =>
        value?.toLowerCase().includes(normalized)
      )
    );
  }, [query, tenants]);

  async function createTenant(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    const form = event.currentTarget;
    const body = Object.fromEntries(new FormData(form).entries());
    try {
      const response = await fetch('/api/master/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Não foi possível cadastrar a empresa');
      toast({ title: 'Empresa provisionada', description: `${result.tenant.name} já pode acessar o RIGOR.`, variant: 'success' });
      form.reset();
      setDialogOpen(false);
      router.refresh();
    } catch (error) {
      toast({ title: 'Falha no cadastro', description: error instanceof Error ? error.message : 'Tente novamente.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <section id="empresas" className="master-panel overflow-hidden">
      <div className="flex flex-col gap-4 border-b border-white/8 p-5 sm:flex-row sm:items-center sm:justify-between lg:p-6">
        <div>
          <p className="master-eyebrow">Customer operations</p>
          <h2 className="mt-1 text-2xl font-bold uppercase text-white">Empresas clientes</h2>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="relative block">
            <span className="sr-only">Buscar empresa</span>
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar empresa..."
              className="master-input h-10 w-full pl-10 sm:w-56"
            />
          </label>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <button className="master-primary-button h-10" type="button">
                <Plus className="h-4 w-4" /> Nova empresa
              </button>
            </DialogTrigger>
            <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto border-white/10 bg-[#0b171c] p-0 text-slate-100 shadow-2xl">
              <DialogHeader className="border-b border-white/8 p-6 pr-12">
                <DialogTitle className="text-2xl font-bold uppercase text-white">Provisionar empresa</DialogTitle>
                <DialogDescription className="text-slate-500">
                  Cria o workspace e o administrador principal com senha temporária.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={createTenant} className="p-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <MasterField label="Empresa" name="name" required placeholder="Construtora Exemplo" />
                  <MasterField label="CNPJ / documento" name="document" placeholder="00.000.000/0001-00" />
                  <MasterField label="E-mail de cobrança" name="billingEmail" type="email" required placeholder="financeiro@empresa.com" />
                  <MasterField label="Telefone" name="phone" placeholder="(11) 99999-9999" />
                  <label className="master-field">
                    <span>Plano</span>
                    <select name="plan" className="master-input" defaultValue="STARTER">
                      <option value="STARTER">Starter</option>
                      <option value="PRO">Pro</option>
                      <option value="BUSINESS">Business</option>
                    </select>
                  </label>
                  <label className="master-field">
                    <span>Status comercial</span>
                    <select name="subscriptionStatus" className="master-input" defaultValue="TRIAL">
                      <option value="TRIAL">Trial — 10 dias</option>
                      <option value="ATIVA">Ativa</option>
                      <option value="INADIMPLENTE">Inadimplente</option>
                    </select>
                  </label>
                </div>
                <div className="my-6 border-t border-white/8" />
                <p className="master-eyebrow mb-4">Administrador da empresa</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <MasterField label="Nome completo" name="adminName" required placeholder="Responsável pelo RIGOR" />
                  <MasterField label="E-mail de acesso" name="adminEmail" type="email" required placeholder="admin@empresa.com" />
                  <div className="sm:col-span-2">
                    <MasterField label="Senha temporária" name="temporaryPassword" type="password" required minLength={10} placeholder="Mínimo 10 caracteres, com maiúscula e número" />
                    <p className="mt-2 text-[10px] text-slate-600">O administrador terá de trocar esta senha no primeiro acesso.</p>
                  </div>
                </div>
                <DialogFooter className="mt-7 border-t border-white/8 pt-5">
                  <button type="button" onClick={() => setDialogOpen(false)} className="master-secondary-button">Cancelar</button>
                  <button type="submit" disabled={loading} className="master-primary-button">
                    {loading && <Loader2 className="h-4 w-4 animate-spin" />} Criar workspace
                  </button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-left">
          <thead className="border-b border-white/8 bg-white/[.018] text-[9px] uppercase tracking-[.18em] text-slate-600">
            <tr>
              <th className="px-6 py-4">Empresa</th>
              <th className="px-4 py-4">Plano</th>
              <th className="px-4 py-4">Assinatura</th>
              <th className="px-4 py-4 text-center">Usuários</th>
              <th className="px-4 py-4 text-center">Obras</th>
              <th className="px-4 py-4">Entrada</th>
              <th className="px-6 py-4 text-right">Controle</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/6">
            {filtered.map((tenant) => (
              <tr key={tenant.id} className="group transition hover:bg-white/[.025]">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="grid h-9 w-9 place-items-center rounded-md border border-white/8 bg-white/[.035] text-slate-500">
                      <Building2 className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="font-semibold text-slate-100">{tenant.name}</div>
                      <div className="mt-0.5 text-[10px] text-slate-600">{tenant.billingEmail || tenant.slug}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4 text-xs font-black tracking-[.08em] text-slate-400">{tenant.plan}</td>
                <td className="px-4 py-4">
                  <span className={`inline-flex rounded border px-2 py-1 text-[9px] font-black tracking-[.1em] ${statusStyle[tenant.subscriptionStatus]}`}>
                    {!tenant.isActive ? 'SUSPENSA' : tenant.subscriptionStatus}
                  </span>
                </td>
                <td className="px-4 py-4 text-center font-mono text-xs text-slate-400">{tenant._count.users}</td>
                <td className="px-4 py-4 text-center font-mono text-xs text-slate-400">{tenant._count.obras}</td>
                <td className="px-4 py-4 text-xs text-slate-500">{new Intl.DateTimeFormat('pt-BR').format(new Date(tenant.createdAt))}</td>
                <td className="px-6 py-4 text-right">
                  <Link href={`/master/empresas/${tenant.id}`} className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[.12em] text-[#c7ff4a] hover:text-white">
                    Gerenciar <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="p-12 text-center text-sm text-slate-600">Nenhuma empresa encontrada.</div>}
      </div>
    </section>
  );
}

function MasterField({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="master-field">
      <span>{label}</span>
      <input {...props} className="master-input" />
    </label>
  );
}
