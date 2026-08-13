'use client';

import { FormEvent, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { resourceConfig, CrudField, moduleResourceMap } from '@/lib/crud-config';
import { Button } from '@/components/ui/button';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { toast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { uploadFile } from '@/lib/upload-client';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Edit3,
  Eye,
  FileUp,
  Loader2,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';

type Option = { value: string; label: string };
type Options = Record<string, Option[]>;
type TabDef = {
  label: string;
  resource: string;
  filters?: Record<string, string>;
  action?: string;
};
type ModalMode = 'create' | 'edit' | 'view';
type Stats = { sum: number; statusCounts: Record<string, number>; activeCount: number | null };

const PAGE_SIZE = 25;

const moduleTabs: Record<string, TabDef[]> = {
  obras: [
    { label: 'Lista de Obras', resource: 'obras' },
    { label: 'Cronograma', resource: 'etapas' },
    { label: 'Documentos', resource: 'documentos' },
    { label: 'Ocorrências', resource: 'ocorrencias' },
  ],
  andamento: [
    { label: 'Etapas', resource: 'etapas' },
    { label: 'Medições', resource: 'medicoes' },
    { label: 'Fotos', resource: 'galeria' },
    { label: 'Ocorrências', resource: 'ocorrencias' },
  ],
  financeiro: [
    { label: 'Fluxo de Caixa', resource: 'financeiro' },
    {
      label: 'Contas a Pagar',
      resource: 'financeiro',
      filters: { tipo: 'DESPESA' },
      action: 'Nova conta a pagar',
    },
    {
      label: 'Contas a Receber',
      resource: 'financeiro',
      filters: { tipo: 'RECEITA' },
      action: 'Nova conta a receber',
    },
    { label: 'Medições', resource: 'medicoes', action: 'Nova medição' },
    {
      label: 'Notas / Documentos',
      resource: 'documentos',
      filters: { categoria: 'NF' },
      action: 'Nova NF',
    },
  ],
  materiais: [
    { label: 'Estoque', resource: 'materiais' },
    {
      label: 'Entradas',
      resource: 'estoqueMovimentos',
      filters: { tipo: 'ENTRADA' },
      action: 'Nova entrada',
    },
    {
      label: 'Saídas',
      resource: 'estoqueMovimentos',
      filters: { tipo: 'SAIDA' },
      action: 'Nova saída',
    },
    { label: 'Requisições', resource: 'requisicoes', action: 'Nova requisição' },
    { label: 'Fornecedores', resource: 'fornecedores', action: 'Novo fornecedor' },
  ],
  equipe: [
    { label: 'Trabalhadores', resource: 'equipe', action: 'Novo funcionário' },
    { label: 'Equipes por Obra', resource: 'equipes', action: 'Nova equipe' },
    { label: 'Membros da Equipe', resource: 'equipeMembros', action: 'Vincular funcionário' },
    { label: 'Alocação / Presença', resource: 'presencas', action: 'Registrar presença' },
    { label: 'EPIs', resource: 'epis', action: 'Entregar EPI' },
    { label: 'Treinamentos', resource: 'treinamentos', action: 'Novo treinamento' },
  ],
  documentos: [
    { label: 'Documentos', resource: 'documentos' },
    { label: 'Databook', resource: 'documentos', filters: { status: 'APROVADO' } },
    { label: 'Checklist Pendente', resource: 'documentos', filters: { status: 'PENDENTE' } },
    { label: 'Notas Fiscais', resource: 'documentos', filters: { categoria: 'NF' } },
  ],
  qualidade: [
    { label: 'Inspeções', resource: 'inspecoes', action: 'Nova inspeção' },
    { label: 'Não Conformidades', resource: 'qualidade', action: 'Nova NC' },
    { label: 'Ensaios e Laudos', resource: 'documentos', filters: { categoria: 'LAUDO' } },
    { label: 'Indicadores', resource: 'qualidade' },
  ],
  seguranca: [
    { label: 'Painel', resource: 'seguranca' },
    { label: 'DDS', resource: 'seguranca', action: 'Novo DDS' },
    { label: 'Incidentes', resource: 'acidentes', action: 'Novo incidente' },
    { label: 'Treinamentos', resource: 'treinamentos' },
    { label: 'Relatório Mensal', resource: 'acidentes' },
  ],
  galeria: [
    { label: 'Galeria', resource: 'galeria' },
    { label: 'Linha do Tempo', resource: 'galeria' },
    { label: 'Antes e Depois', resource: 'galeria' },
    { label: 'Exportar Álbum', resource: 'galeria' },
  ],
  relatorios: [
    { label: 'Executivo', resource: 'obras' },
    { label: 'Financeiro', resource: 'financeiro' },
    { label: 'Materiais', resource: 'materiais' },
    { label: 'Equipe', resource: 'equipe' },
    { label: 'Documentos', resource: 'documentos' },
  ],
  contratos: [
    { label: 'Contratos', resource: 'contratos' },
    { label: 'Pagamentos', resource: 'financeiro', filters: { tipo: 'DESPESA' } },
    { label: 'Fornecedores', resource: 'fornecedores' },
  ],
  ocorrencias: [
    { label: 'Ocorrências', resource: 'ocorrencias' },
    { label: 'Abertas', resource: 'ocorrencias', filters: { status: 'ABERTO' } },
    { label: 'Em tratamento', resource: 'ocorrencias', filters: { status: 'EM_TRATAMENTO' } },
    { label: 'Encerradas', resource: 'ocorrencias', filters: { status: 'ENCERRADO' } },
  ],
  orcamentos: [
    { label: 'Propostas', resource: 'orcamentos' },
    { label: 'Aprovados', resource: 'orcamentos', filters: { status: 'APROVADO' } },
    { label: 'Em elaboração', resource: 'orcamentos', filters: { status: 'EM_ELABORACAO' } },
  ],
};

const defaultAction: Record<string, string> = {
  financeiro: 'Novo lançamento',
  medicoes: 'Nova medição',
  materiais: 'Novo material',
  estoqueMovimentos: 'Nova movimentação',
  requisicoes: 'Nova requisição',
  fornecedores: 'Novo fornecedor',
  equipe: 'Novo funcionário',
  equipes: 'Nova equipe',
  equipeMembros: 'Vincular funcionário',
  presencas: 'Alocar funcionário',
  epis: 'Entregar EPI',
  treinamentos: 'Novo treinamento',
  documentos: 'Novo documento',
  qualidade: 'Nova NC',
  inspecoes: 'Nova inspeção',
  seguranca: 'Novo DDS',
  acidentes: 'Novo incidente',
  galeria: 'Nova foto',
  contratos: 'Novo contrato',
  ocorrencias: 'Nova ocorrência',
  orcamentos: 'Novo orçamento',
  obras: 'Nova obra',
  etapas: 'Nova etapa',
};

function fmtValue(row: DynamicValue, field?: CrudField) {
  if (!field) return '—';
  const value = row[field.name];
  if (field.relation && field.name.endsWith('Id')) {
    const rel = field.name.replace(/Id$/, '');
    const obj = row[rel];
    if (obj?.nome) return obj.nome;
    if (obj?.name) return obj.name;
    if (obj?.descricao) return obj.codigo ? `${obj.descricao} (${obj.codigo})` : obj.descricao;
    if (obj?.razaoSocial) return obj.nomeFantasia || obj.razaoSocial;
    if (obj?.numero) return String(obj.numero);
    if (row.obra && field.name === 'obraId') return row.obra.nome;
  }
  if (value === null || value === undefined || value === '') return '—';
  if (field.type === 'currency')
    return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  if (field.type === 'date') return new Date(value).toLocaleDateString('pt-BR');
  if (field.type === 'boolean') return value ? 'Sim' : 'Não';
  return String(value).replaceAll('_', ' ');
}

function inputValue(row: DynamicValue, field: CrudField) {
  const value = row?.[field.name];
  if (value === null || value === undefined) return field.type === 'boolean' ? false : '';
  if (field.type === 'date') return new Date(value).toISOString().slice(0, 10);
  return value;
}

function primaryField(fields: CrudField[]) {
  return (
    fields.find((f) =>
      ['nome', 'descricao', 'tema', 'razaoSocial', 'objeto', 'codigo'].includes(f.name)
    ) || fields[0]
  );
}

export function CrudModule({ module }: { module: string }) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-[1540px]">
          <div className="overflow-hidden rounded-[6px] border border-[#e1e6eb] bg-white">
            <TableSkeleton cols={5} />
          </div>
        </div>
      }
    >
      <BuscaBridge module={module} />
    </Suspense>
  );
}

function BuscaBridge({ module }: { module: string }) {
  const busca = useSearchParams().get('busca') || '';
  // key força um remount quando a busca global muda, reiniciando aba/página/filtro
  return <CrudModuleInner key={busca} module={module} initialSearch={busca} />;
}

function CrudModuleInner({ module, initialSearch }: { module: string; initialSearch: string }) {
  const router = useRouter();
  const initialResource = moduleResourceMap[module] || module;
  const tabs = moduleTabs[module] || [
    { label: 'Cadastro', resource: initialResource },
    { label: 'Relatórios', resource: initialResource },
  ];
  const [activeTab, setActiveTab] = useState(0);
  const current = tabs[activeTab] || tabs[0];
  const cfg =
    resourceConfig[current.resource] || resourceConfig[initialResource] || resourceConfig.obras;
  const [rows, setRows] = useState<DynamicValue[]>([]);
  const [options, setOptions] = useState<Options>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState(initialSearch);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<Stats | null>(null);
  const [modal, setModal] = useState<{ mode: ModalMode; row: DynamicValue } | null>(null);
  const [error, setError] = useState('');
  const { confirm, dialog: confirmDialog } = useConfirm();
  const lastSearch = useRef(initialSearch);

  const listFields = useMemo(() => cfg.fields.filter((f) => f.list).slice(0, 8), [cfg]);
  const totals = useMemo(
    () => computeTotals(rows, cfg.key, total, stats),
    [rows, cfg.key, total, stats]
  );

  async function load() {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        search,
        page: String(page),
        pageSize: String(PAGE_SIZE),
      });
      Object.entries(current.filters || {}).forEach(([k, v]) => params.set(k, v));
      const [dataRes, optRes] = await Promise.all([
        fetch(`/api/crud/${cfg.key}?${params}`),
        fetch('/api/crud-options'),
      ]);
      const data = await dataRes.json();
      if (!dataRes.ok) throw new Error(data.error || 'Erro ao carregar dados');
      setRows(data.rows || []);
      setTotal(data.total ?? (data.rows || []).length);
      setStats(data.stats || null);
      const optionText = await optRes.text();
      setOptions(optionText ? JSON.parse(optionText) : {});
    } catch (e: DynamicValue) {
      setError(e.message || 'Erro ao carregar');
    } finally {
      setLoading(false);
    }
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
    if (!modal || modal.mode === 'view') return;
    setSaving(true);
    setError('');
    try {
      const formData = new FormData(e.currentTarget);
      const body: DynamicValue = { ...(current.filters || {}) };
      for (const field of cfg.fields) {
        if (field.type === 'file') {
          const selected = formData.get(field.name);
          if (selected instanceof File && selected.size > 0) {
            body[field.name] = await uploadFile(
              selected,
              field.uploadCategory || cfg.key || 'geral'
            );
          } else if (field.required && !modal.row?.[field.name]) {
            throw new Error(`Selecione o arquivo: ${field.label}`);
          }
          continue;
        }
        body[field.name] =
          field.type === 'boolean' ? formData.get(field.name) === 'on' : formData.get(field.name);
      }
      const isEdit = modal.mode === 'edit' && Boolean(modal.row?.id);
      const res = await fetch(
        isEdit ? `/api/crud/${cfg.key}/${modal.row.id}` : `/api/crud/${cfg.key}`,
        {
          method: isEdit ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar');
      setModal(null);
      toast({
        title: isEdit ? 'Alterações salvas' : 'Registro criado',
        description: `${cfg.title} atualizado com sucesso.`,
      });
      await load();
    } catch (e: DynamicValue) {
      setError(e.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  }

  async function remove(row: DynamicValue) {
    const label = fmtValue(row, primaryField(cfg.fields));
    const ok = await confirm({
      title: 'Excluir registro',
      description: `"${label}" será excluído ou arquivado. Esta ação não pode ser desfeita.`,
    });
    if (!ok) return;
    const res = await fetch(`/api/crud/${cfg.key}/${row.id}`, { method: 'DELETE' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir',
        description: data.error || 'Tente novamente.',
      });
      return;
    }
    toast({ title: 'Registro excluído', description: `"${label}" foi removido.` });
    if (rows.length === 1 && page > 1) setPage(page - 1);
    else await load();
  }

  async function exportCsv() {
    try {
      const params = new URLSearchParams({ search });
      Object.entries(current.filters || {}).forEach(([k, v]) => params.set(k, v));
      const res = await fetch(`/api/crud/${cfg.key}?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao exportar');
      const all = data.rows || [];
      const header = listFields.map((f) => f.label);
      const lines = all.map((r: DynamicValue) =>
        listFields.map((f) => `"${String(fmtValue(r, f)).replaceAll('"', '""')}"`).join(';')
      );
      const blob = new Blob([[header.join(';'), ...lines].join('\n')], {
        type: 'text/csv;charset=utf-8',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${module}-${current.label.toLowerCase().replaceAll(' ', '-')}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: 'CSV exportado', description: `${all.length} registro(s) no arquivo.` });
    } catch (e: DynamicValue) {
      toast({
        variant: 'destructive',
        title: 'Erro ao exportar CSV',
        description: e.message || 'Tente novamente.',
      });
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1540px] pb-8 text-[#1e293b]">
      <div className="mb-5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
        Obras <span className="mx-1 text-[#ff5a00]">›</span> Gestão Integrada{' '}
        <span className="mx-1 text-[#ff5a00]">›</span> <b>{cfg.title}</b>
      </div>
      <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="rigor-title text-[28px] font-black leading-none tracking-tight text-slate-900">
            {moduleTitle(module, cfg.title)}
          </h1>
          <p className="mt-1.5 text-xs font-semibold text-slate-500">{cfg.subtitle}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <div className="pillow-tabs">
              {tabs.map((tab, i) => (
                <button
                  key={`${tab.resource}-${tab.label}`}
                  onClick={() => {
                    setActiveTab(i);
                    setPage(1);
                  }}
                  className={cn(
                    'pillow-tab cursor-pointer',
                    i === activeTab ? 'pillow-tab-active' : ''
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {module === 'obras' && (
            <Button
              variant="outline"
              className="h-10 rounded-lg border-orange-200 bg-orange-50 text-xs font-bold text-[#d94c09] shadow-sm transition-colors hover:border-[#ff5a00] hover:bg-orange-100"
              onClick={() => router.push('/obras/importar')}
            >
              <FileUp className="mr-2 h-4 w-4" />
              Importar arquivo
            </Button>
          )}
          <Button
            variant="outline"
            className="h-10 rounded-lg border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
            onClick={exportCsv}
          >
            <Download className="mr-2 h-4 w-4" />
            Exportar CSV
          </Button>
          <Button
            className="rigor-btn-primary h-10 rounded-lg px-5 text-xs font-bold text-white shadow-md"
            onClick={() => setModal({ mode: 'create', row: { ...(current.filters || {}) } })}
          >
            <Plus className="mr-2 h-4 w-4" />
            {current.action || defaultAction[cfg.key] || 'Novo registro'}
          </Button>
        </div>
      </div>

      <div className="mb-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {totals.map((t) => (
          <div
            key={t.label}
            className="rigor-card rigor-card-interactive p-5 bg-white border-slate-200/50 shadow-sm shadow-slate-100/30"
          >
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {t.label}
            </p>
            <p
              className={cn(
                'mt-1.5 text-2xl font-black leading-tight tracking-tight',
                t.tone === 'danger'
                  ? 'text-red-650'
                  : t.tone === 'success'
                    ? 'text-emerald-600'
                    : 'text-slate-800'
              )}
            >
              {t.value}
            </p>
            <p className="mt-0.5 text-[11.5px] font-medium text-slate-400">{t.hint}</p>
          </div>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative h-10 w-full max-w-[340px]">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            onKeyDown={(e) => e.key === 'Enter' && load()}
            placeholder={`Buscar em ${current.label.toLowerCase()}...`}
            className="h-full w-full rounded-lg border border-slate-200 bg-white pl-10 pr-8 text-[13px] text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-[#ff5a00] focus:ring-4 focus:ring-[#ff5a00]/10"
          />
          {search && (
            <button
              onClick={() => {
                setSearch('');
                setPage(1);
              }}
              aria-label="Limpar busca"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-450 hover:bg-slate-100 hover:text-[#17212b]"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Button
          variant="outline"
          className="h-10 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 px-4 transition-colors"
          onClick={load}
        >
          Buscar
        </Button>
      </div>

      {error && !modal && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3.5 text-[13px] font-semibold text-red-700">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200/60 bg-white shadow-sm">
        {loading ? (
          <TableSkeleton cols={listFields.length} />
        ) : rows.length === 0 ? (
          <div className="p-12 text-center bg-white">
            <p className="font-bold text-slate-900">
              {search ? `Nenhum resultado para “${search}”` : 'Nenhum registro encontrado'}
            </p>
            <p className="mt-1.5 text-[13px] text-slate-450 font-medium">
              {search
                ? 'Ajuste a busca ou limpe o filtro para ver todos os registros.'
                : `Clique em “${current.action || defaultAction[cfg.key] || 'Novo'}” para cadastrar.`}
            </p>
            {search && (
              <Button
                variant="outline"
                className="mt-4 rounded-lg font-bold text-xs"
                onClick={() => {
                  setSearch('');
                  setPage(1);
                }}
              >
                Limpar busca
              </Button>
            )}
          </div>
        ) : (
          <>
            <DataTable
              rows={rows}
              fields={listFields}
              offset={(page - 1) * PAGE_SIZE}
              onView={(row) => setModal({ mode: 'view', row })}
              onEdit={(row) => setModal({ mode: 'edit', row })}
              onDelete={remove}
            />
            <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPage={setPage} />
          </>
        )}
      </div>

      {modal && (
        <PremiumModal
          mode={modal.mode}
          cfg={cfg}
          row={modal.row}
          options={options}
          saving={saving}
          error={error}
          onClose={() => {
            setModal(null);
            setError('');
          }}
          onSave={save}
        />
      )}
      {confirmDialog}
    </div>
  );
}

function moduleTitle(module: string, fallback: string) {
  const map: Record<string, string> = {
    financeiro: 'Financeiro',
    materiais: 'Materiais',
    equipe: 'Equipe',
    documentos: 'Documentos',
    qualidade: 'Qualidade',
    seguranca: 'Segurança',
    galeria: 'Galeria',
    andamento: 'Andamento da Obra',
    relatorios: 'Relatórios',
    contratos: 'Contratos',
    ocorrencias: 'Ocorrências',
  };
  return map[module] || fallback;
}

function computeTotals(rows: DynamicValue[], key: string, total: number, stats: Stats | null) {
  const money = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const countOf = (statuses: string[]) =>
    stats
      ? statuses.reduce((s, st) => s + (stats.statusCounts[st] || 0), 0)
      : rows.filter((r) => statuses.includes(r.status || r.resultado)).length;
  const sum = stats
    ? stats.sum
    : rows.reduce((s, r) => s + Number(r.valor ?? r.valorTotal ?? r.precoMedio ?? 0), 0);
  if (['financeiro', 'medicoes', 'contratos', 'orcamentos'].includes(key))
    return [
      { label: 'Total', value: money(sum), hint: 'Soma dos registros', tone: 'orange' },
      {
        label: 'Abertos',
        value: String(countOf(['ABERTO', 'EM_ELABORACAO', 'PENDENTE'])),
        hint: 'Aguardando ação',
        tone: 'danger',
      },
      {
        label: 'Pagos/Aprovados',
        value: String(countOf(['PAGO', 'APROVADO', 'APROVADA_CLIENTE'])),
        hint: 'Concluídos',
        tone: 'success',
      },
      { label: 'Registros', value: String(total), hint: 'Itens cadastrados', tone: 'orange' },
    ];
  const ativos = stats
    ? (stats.activeCount ?? 0) + countOf(['APROVADO', 'CONFORME', 'ENTREGUE'])
    : rows.filter(
        (r) =>
          r.isActive === true ||
          ['APROVADO', 'CONFORME', 'ENTREGUE'].includes(r.status || r.resultado)
      ).length;
  return [
    { label: 'Registros', value: String(total), hint: 'Itens cadastrados', tone: 'orange' },
    { label: 'Ativos/Aprovados', value: String(ativos), hint: 'Em conformidade', tone: 'success' },
    {
      label: 'Pendências',
      value: String(countOf(['PENDENTE', 'ABERTA', 'NAO_CONFORME', 'VENCIDO'])),
      hint: 'Requer atenção',
      tone: 'danger',
    },
    { label: 'Atualizado', value: 'Agora', hint: 'Dados do banco', tone: 'orange' },
  ];
}

function Pagination({
  page,
  pageSize,
  total,
  onPage,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPage: (p: number) => void;
}) {
  const pages = Math.ceil(total / pageSize);
  if (pages <= 1) return null;
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  const nums: (number | '...')[] = [];
  for (let p = 1; p <= pages; p++) {
    if (p === 1 || p === pages || Math.abs(p - page) <= 1) nums.push(p);
    else if (nums[nums.length - 1] !== '...') nums.push('...');
  }
  const btn =
    'flex h-8 min-w-8 items-center justify-center rounded-[4px] px-2 text-[12px] font-bold transition disabled:cursor-not-allowed disabled:opacity-40';
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-[#fafbfc] px-5 py-3.5">
      <p className="text-[12px] font-bold text-slate-500">
        Mostrando {start}–{end} de {total}
      </p>
      <nav className="flex items-center gap-1.5" aria-label="Paginação">
        <button
          disabled={page === 1}
          onClick={() => onPage(page - 1)}
          aria-label="Página anterior"
          className={cn(
            btn,
            'text-[#475569] hover:bg-slate-100 border border-slate-200/50 rounded-lg shadow-sm'
          )}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        {nums.map((n, i) =>
          n === '...' ? (
            <span key={`gap-${i}`} className="px-1 text-[12px] text-slate-400">
              …
            </span>
          ) : (
            <button
              key={n}
              onClick={() => onPage(n)}
              aria-current={n === page ? 'page' : undefined}
              className={cn(
                btn,
                n === page
                  ? 'bg-[#ff5a00] border border-[#ff5a00] text-white'
                  : 'text-[#475569] hover:bg-slate-100 border border-slate-200/50 rounded-lg shadow-sm'
              )}
            >
              {n}
            </button>
          )
        )}
        <button
          disabled={page === pages}
          onClick={() => onPage(page + 1)}
          aria-label="Próxima página"
          className={cn(
            btn,
            'text-[#475569] hover:bg-slate-100 border border-slate-200/50 rounded-lg shadow-sm'
          )}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </nav>
    </div>
  );
}

function DataTable({
  rows,
  fields,
  offset = 0,
  onView,
  onEdit,
  onDelete,
}: {
  rows: DynamicValue[];
  fields: CrudField[];
  offset?: number;
  onView: (row: DynamicValue) => void;
  onEdit: (row: DynamicValue) => void;
  onDelete: (row: DynamicValue) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[980px] text-left text-[13.5px]">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50/50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            <th className="w-12 px-5 py-3.5">#</th>
            {fields.map((f) => (
              <th key={f.name} className="px-3 py-3.5">
                {f.label}
              </th>
            ))}
            <th className="px-5 py-3.5 text-right">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row, i) => (
            <tr key={row.id} className="hover:bg-slate-50/30 transition-colors">
              <td className="px-5 py-4 font-bold text-slate-800">{offset + i + 1}</td>
              {fields.map((f) => (
                <td
                  key={f.name}
                  className="max-w-[240px] truncate px-3 py-4 text-slate-655 font-medium"
                >
                  {f.name === 'status' || f.name === 'resultado' ? (
                    <StatusPill value={fmtValue(row, f)} />
                  ) : (
                    fmtValue(row, f)
                  )}
                </td>
              ))}
              <td className="whitespace-nowrap px-5 py-4 text-right">
                <button
                  title="Ver detalhes"
                  onClick={() => onView(row)}
                  className="mr-1.5 rounded-lg p-2 text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <Eye className="h-4 w-4 stroke-[2]" />
                </button>
                <button
                  title="Editar"
                  onClick={() => onEdit(row)}
                  className="mr-1.5 rounded-lg p-2 text-[#ff5a00] hover:bg-orange-50 transition-colors cursor-pointer"
                >
                  <Edit3 className="h-4 w-4 stroke-[2]" />
                </button>
                <button
                  title="Excluir"
                  onClick={() => onDelete(row)}
                  className="rounded-lg p-2 text-red-650 hover:bg-red-50 transition-colors cursor-pointer"
                >
                  <Trash2 className="h-4 w-4 stroke-[2]" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatusPill({ value }: { value: string }) {
  const v = value.toUpperCase();
  const danger = /VENC|REPROV|CANCEL|CRIT|ABERTA|NAO/.test(v);
  const warn = /PEND|ABERTO|ELABORACAO|TRATAMENTO|EXECUCAO|MEDIO/.test(v);
  return (
    <span
      className={cn(
        'inline-flex rounded-full px-2.5 py-1 text-[11px] font-black',
        danger
          ? 'bg-red-50 text-red-700'
          : warn
            ? 'bg-amber-50 text-amber-700'
            : 'bg-green-50 text-green-700'
      )}
    >
      {value}
    </span>
  );
}

function PremiumModal({
  mode,
  cfg,
  row,
  options,
  saving,
  error,
  onClose,
  onSave,
}: {
  mode: ModalMode;
  cfg: DynamicValue;
  row: DynamicValue;
  options: Options;
  saving: boolean;
  error?: string;
  onClose: () => void;
  onSave: (e: FormEvent<HTMLFormElement>) => void;
}) {
  const readOnly = mode === 'view';
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#050b11]/45 p-4 backdrop-blur-sm"
      onClick={() => {
        if (readOnly) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={cfg.title}
        className="max-h-[92vh] w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_24px_50px_rgba(0,0,0,0.12)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-slate-100 bg-white px-7 py-5 text-slate-800">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#ff5a00]">
              {mode === 'create' ? 'Cadastro' : mode === 'edit' ? 'Edição' : 'Detalhes'}
            </p>
            <h2 className="mt-1 font-heading text-xl font-bold uppercase tracking-tight text-slate-900">
              {cfg.title}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 font-medium">
              Os dados inseridos são sincronizados imediatamente com o banco.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={onSave}>
          <div className="grid max-h-[60vh] gap-5 overflow-y-auto p-7 md:grid-cols-2">
            {error && (
              <div className="md:col-span-2 rounded-lg border border-red-200 bg-red-50 p-3.5 text-[13px] font-semibold text-red-700">
                {error}
              </div>
            )}
            {cfg.fields.map((field: CrudField) => (
              <Field
                key={field.name}
                field={field}
                value={inputValue(row, field)}
                options={options}
                readOnly={readOnly}
              />
            ))}
          </div>
          <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-7 py-4">
            <p className="text-xs font-semibold text-slate-450">
              {readOnly
                ? 'Modo somente visualização de registros.'
                : 'Campos com asterisco (*) são de preenchimento obrigatório.'}
            </p>
            <div className="flex gap-2.5">
              <Button
                type="button"
                variant="outline"
                className="rounded-lg font-bold text-xs h-10 px-4"
                onClick={onClose}
              >
                Fechar
              </Button>
              {!readOnly && (
                <Button
                  className="rounded-lg bg-[#ff5a00] font-bold text-xs text-white hover:bg-[#ef5200] h-10 px-5 transition-all shadow-md"
                  disabled={saving}
                >
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar dados
                </Button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function TableSkeleton({ cols }: { cols: number }) {
  const widths = ['w-2/3', 'w-1/2', 'w-3/4', 'w-2/5', 'w-1/3', 'w-3/5'];
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
            <div
              key={j}
              className={cn(
                'h-4 flex-1 animate-pulse rounded bg-slate-100',
                widths[(i + j) % widths.length]
              )}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function Field({
  field,
  value,
  options,
  readOnly,
}: {
  field: CrudField;
  value: DynamicValue;
  options: Options;
  readOnly: boolean;
}) {
  const relOpts = field.relation ? options[field.relation] || [] : [];
  const cls =
    'h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] text-slate-800 outline-none focus:border-[#ff5a00] focus:ring-4 focus:ring-[#ff5a00]/10 disabled:bg-slate-50/50 disabled:text-slate-500 transition-all duration-200';
  return (
    <label className="block space-y-2">
      <span className="text-[11.5px] font-bold text-slate-700 uppercase tracking-wide">
        {field.label}
        {field.required && <span className="text-[#ff5a00]"> *</span>}
      </span>
      {field.type === 'file' ? (
        <div className="space-y-2">
          {!readOnly && (
            <input
              name={field.name}
              type="file"
              accept={field.accept}
              required={field.required && !value}
              className="block w-full cursor-pointer rounded-lg border border-slate-200 bg-white text-[13px] text-slate-600 file:mr-3 file:border-0 file:border-r file:border-slate-200 file:bg-slate-50 file:px-4 file:py-2.5 file:text-xs file:font-bold file:text-slate-700 hover:file:bg-orange-50 hover:file:text-[#ff5a00] focus:outline-none focus:ring-4 focus:ring-[#ff5a00]/10"
            />
          )}
          {value ? (
            <a
              href={String(value)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-xs font-bold text-[#d94c09] hover:underline"
            >
              <Download className="h-3.5 w-3.5" />
              {readOnly ? 'Abrir arquivo' : 'Abrir arquivo atual'}
            </a>
          ) : readOnly ? (
            <span className="text-xs font-medium text-slate-400">Nenhum arquivo enviado</span>
          ) : (
            <p className="text-[11px] font-medium text-slate-400">Máximo de 10 MB</p>
          )}
        </div>
      ) : field.type === 'textarea' ? (
        <textarea
          disabled={readOnly}
          name={field.name}
          defaultValue={value || ''}
          required={field.required}
          className="min-h-[96px] w-full rounded-lg border border-slate-200 p-3 text-[13px] text-slate-800 outline-none focus:border-[#ff5a00] focus:ring-4 focus:ring-[#ff5a00]/10 disabled:bg-slate-50/50 disabled:text-slate-500 transition-all duration-200"
        />
      ) : field.type === 'select' ? (
        <select
          disabled={readOnly}
          name={field.name}
          defaultValue={value || ''}
          required={field.required}
          className={cls}
        >
          <option value="">Selecione...</option>
          {field.options?.map((o) => (
            <option key={o} value={o}>
              {o.replaceAll('_', ' ')}
            </option>
          ))}
          {relOpts.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : field.type === 'boolean' ? (
        <div className="flex h-10 items-center">
          <input
            disabled={readOnly}
            name={field.name}
            type="checkbox"
            defaultChecked={Boolean(value)}
            className="h-5 w-5 rounded border-slate-350 text-[#ff5a00] focus:ring-[#ff5a00]/20 cursor-pointer"
          />
        </div>
      ) : (
        <input
          disabled={readOnly}
          name={field.name}
          type={
            field.type === 'date'
              ? 'date'
              : field.type === 'number' || field.type === 'currency'
                ? 'number'
                : 'text'
          }
          step={field.type === 'currency' ? '0.01' : field.type === 'number' ? 'any' : undefined}
          defaultValue={value || ''}
          required={field.required}
          className={cls}
        />
      )}
    </label>
  );
}
