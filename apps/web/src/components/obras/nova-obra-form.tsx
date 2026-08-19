'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import {
  ArrowLeft,
  Building,
  Building2,
  Check,
  Coins,
  FileSpreadsheet,
  HardHat,
  Layers,
  Loader2,
  MapPin,
  Sparkles,
  Warehouse,
  Waypoints,
} from 'lucide-react';

interface Option {
  value: string;
  label: string;
  role?: string;
  email?: string;
}

const TIPO_OBRA_OPTIONS = [
  {
    tipo: 'GALPAO',
    label: 'Galpão Industrial / Logístico',
    desc: 'Estruturas pré-moldadas, metálicas, piso industrial e logística',
    icon: Warehouse,
  },
  {
    tipo: 'EDIFICIO',
    label: 'Edifício Residencial / Comercial',
    desc: 'Construção vertical, alvenaria, múltiplos pavimentos e acabamento',
    icon: Building2,
  },
  {
    tipo: 'PONTE',
    label: 'Ponte / Infraestrutura',
    desc: 'Obras de arte especiais, terraplanagem, drenagem e pavimentação',
    icon: Waypoints,
  },
  {
    tipo: 'MURO_ARRIMO',
    label: 'Muro de Arrimo / Contenção',
    desc: 'Estabilização de encostas, contenções, solo grampeado e drenos',
    icon: Layers,
  },
  {
    tipo: 'ELEMENTO_ISOLADO',
    label: 'Elemento Isolado',
    desc: 'Fundações especiais, reservatórios, bases industriais isoladas',
    icon: Building,
  },
  {
    tipo: 'OUTRO',
    label: 'Outro Tipo de Obra',
    desc: 'Projetos customizados, reformas, retrofit ou instalações especiais',
    icon: HardHat,
  },
] as const;

const ETAPAS_PADRAO: Record<string, string[]> = {
  GALPAO: [
    '1. Serviços Preliminares e Terraplanagem',
    '2. Fundações e Blocos',
    '3. Montagem de Pilares Pré-Moldados',
    '4. Montagem de Vigas e Cobertura',
    '5. Piso Industrial e Pavimentação',
    '6. Fechamentos e Alvenarias',
    '7. Instalações Elétricas e Hidráulicas',
    '8. Acabamento e Entrega',
  ],
  EDIFICIO: [
    '1. Serviços Preliminares e Canteiro',
    '2. Fundações e Contenções',
    '3. Estrutura de Concreto Armado',
    '4. Alvenaria e Fechamentos',
    '5. Instalações Hidráulicas, Elétricas e HVAC',
    '6. Revestimentos e Acabamentos',
    '7. Esquadrias, Vidros e Pintura',
    '8. Vistoria Final e Entrega das Chaves',
  ],
  DEFAULT: [
    '1. Serviços Preliminares',
    '2. Fundações e Estrutura',
    '3. Instalações e Fechamentos',
    '4. Acabamento e Entrega',
  ],
};

function generateInitialCode() {
  const ano = new Date().getFullYear();
  const rand = Math.floor(100 + Math.random() * 900);
  return `OBR-${ano}-${rand}`;
}

function getInitialDates() {
  const now = new Date();
  const inicio = now.toISOString().slice(0, 10);
  const future = new Date(now.getTime() + 180 * 86400000);
  const fim = future.toISOString().slice(0, 10);
  return { inicio, fim };
}

export function NovaObraForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [tipoSelecionado, setTipoSelecionado] = useState<string>('GALPAO');
  const [codigoSugerido] = useState(generateInitialCode);
  const [initialDates] = useState(getInitialDates);
  const [incluirEtapasPadrao, setIncluirEtapasPadrao] = useState(true);
  const [usuarios, setUsuarios] = useState<Option[]>([]);
  const [loadingUsuarios, setLoadingUsuarios] = useState(true);
  const [valorFormatado, setValorFormatado] = useState('');

  useEffect(() => {
    fetch('/api/crud-options')
      .then((r) => (r.ok ? r.json() : {}))
      .then((data: DynamicValue) => {
        setUsuarios(data?.users || []);
      })
      .catch(() => {})
      .finally(() => setLoadingUsuarios(false));
  }, []);

  function handleValorChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, '');
    if (!raw) {
      setValorFormatado('');
      return;
    }
    const num = Number(raw) / 100;
    setValorFormatado(
      num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    );
  }

  function parseCurrencyToNumber(val: string): number {
    if (!val) return 0;
    const clean = val.replace(/[^\d,]/g, '').replace(',', '.');
    return parseFloat(clean) || 0;
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const nome = String(formData.get('nome') || '').trim();
    const codigo = String(formData.get('codigo') || '').trim();
    const tipo = tipoSelecionado;
    const endereco = String(formData.get('endereco') || '').trim();
    const cidade = String(formData.get('cidade') || '').trim();
    const estado = String(formData.get('estado') || '').trim();
    const dataInicio = formData.get('dataInicio') ? String(formData.get('dataInicio')) : null;
    const dataPrevisaoFim = formData.get('dataPrevisaoFim')
      ? String(formData.get('dataPrevisaoFim'))
      : null;
    const engenheiroId = formData.get('engenheiroId')
      ? String(formData.get('engenheiroId'))
      : null;
    const clienteId = formData.get('clienteId') ? String(formData.get('clienteId')) : null;
    const descricao = String(formData.get('descricao') || '').trim();
    const valorContratado = parseCurrencyToNumber(valorFormatado);

    try {
      // 1. Cria a Obra
      const res = await fetch('/api/obras', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome,
          codigo,
          tipo,
          endereco: endereco || null,
          cidade: cidade || null,
          estado: estado || null,
          valorContratado,
          dataInicio,
          dataPrevisaoFim,
          engenheiroId: engenheiroId || undefined,
          clienteId: clienteId || undefined,
          descricao: descricao || null,
        }),
      });

      const obraCriada = await res.json();
      if (!res.ok) {
        throw new Error(obraCriada.error || 'Não foi possível cadastrar a obra');
      }

      // 2. Se optou por criar etapas padrão, cria cada etapa em lote
      if (incluirEtapasPadrao && obraCriada.id) {
        const listaEtapas = ETAPAS_PADRAO[tipo] || ETAPAS_PADRAO.DEFAULT;
        const totalEtapas = listaEtapas.length;
        const valorPorEtapa = valorContratado > 0 ? valorContratado / totalEtapas : 0;

        await Promise.all(
          listaEtapas.map((nomeEtapa, index) =>
            fetch('/api/crud/etapas', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                obraId: obraCriada.id,
                nome: nomeEtapa,
                ordem: index + 1,
                percentualPrevisto: Math.round((100 / totalEtapas) * (index + 1)),
                percentualRealizado: 0,
                valorFinanceiro: Math.round(valorPorEtapa * 100) / 100,
              }),
            })
          )
        );
      }

      toast({
        title: 'Obra cadastrada com sucesso! 🎉',
        description: `A obra "${nome}" (${codigo}) foi criada e configurada.`,
      });

      // Redireciona diretamente para o cockpit da obra
      router.push(`/obras/${obraCriada.id}`);
    } catch (err: DynamicValue) {
      toast({
        variant: 'destructive',
        title: 'Erro ao cadastrar obra',
        description: err.message || 'Verifique as informações e tente novamente.',
      });
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1240px] pb-12 text-[#1e293b]">
      {/* Breadcrumb & Navigation */}
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/obras"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 transition-colors hover:text-[#ff4d00]"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para Lista de Obras
        </Link>
        <Link
          href="/obras/importar"
          className="inline-flex items-center gap-2 rounded-lg border border-orange-200 bg-orange-50/80 px-3.5 py-1.5 text-xs font-bold text-[#ff4d00] transition-colors hover:bg-orange-100"
        >
          <FileSpreadsheet className="h-3.5 w-3.5" />
          Prefere importar via Excel/Word?
        </Link>
      </div>

      {/* Header */}
      <div className="mb-8">
        <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[#ff4d00]">
          Cadastro de Empreendimento
        </div>
        <h1 className="rigor-title text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
          Nova Obra
        </h1>
        <p className="mt-2 max-w-2xl text-sm font-medium text-slate-500">
          Preencha os dados contratuais e técnicos da sua obra. O RIGOR configurará automaticamente
          o cronograma, controles financeiros e relatórios executivos.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Card 1: Tipo de Obra */}
        <section className="rigor-card p-6 sm:p-7">
          <div className="mb-5 flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50 text-[#ff4d00]">
              <Building2 className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-black text-slate-900">1. Tipo de Empreendimento</h2>
              <p className="text-xs text-slate-500">
                Selecione a tipologia da obra para carregar as métricas e etapas recomendadas
              </p>
            </div>
          </div>

          <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {TIPO_OBRA_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const isSelected = tipoSelecionado === opt.tipo;
              return (
                <button
                  type="button"
                  key={opt.tipo}
                  onClick={() => setTipoSelecionado(opt.tipo)}
                  className={cn(
                    'flex flex-col text-left p-4 rounded-xl border transition-all duration-200 cursor-pointer relative',
                    isSelected
                      ? 'border-[#ff4d00] bg-orange-50/40 ring-2 ring-[#ff4d00]/20 shadow-sm'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div
                      className={cn(
                        'flex h-10 w-10 items-center justify-center rounded-lg',
                        isSelected
                          ? 'bg-[#ff4d00] text-white shadow-md shadow-orange-500/20'
                          : 'bg-slate-100 text-slate-600'
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    {isSelected && (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#ff4d00] text-white">
                        <Check className="h-3 w-3 stroke-[3]" />
                      </span>
                    )}
                  </div>
                  <span className="font-bold text-sm text-slate-900">{opt.label}</span>
                  <span className="text-xs text-slate-500 mt-1 leading-relaxed">{opt.desc}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Card 2: Informações Principais & Contratuais */}
        <section className="rigor-card p-6 sm:p-7">
          <div className="mb-6 flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50 text-[#ff4d00]">
              <Coins className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-black text-slate-900">2. Identificação e Contrato</h2>
              <p className="text-xs text-slate-500">
                Dados básicos, código de rastreio e valor contratado da obra
              </p>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Nome da Obra *
                <input
                  name="nome"
                  required
                  placeholder="Ex.: Galpão Logístico Suzano Fase 1"
                  className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-[#ff4d00] focus:ring-4 focus:ring-[#ff4d00]/10"
                />
              </label>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Código de Identificação *
                <input
                  name="codigo"
                  required
                  defaultValue={codigoSugerido}
                  className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 font-mono text-sm font-bold text-slate-800 outline-none transition focus:border-[#ff4d00] focus:bg-white focus:ring-4 focus:ring-[#ff4d00]/10"
                />
              </label>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Valor Contratado (R$)
                <input
                  type="text"
                  value={valorFormatado}
                  onChange={handleValorChange}
                  placeholder="R$ 0,00"
                  className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-900 outline-none transition focus:border-[#ff4d00] focus:ring-4 focus:ring-[#ff4d00]/10"
                />
              </label>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Data de Início Prevista
                <input
                  name="dataInicio"
                  type="date"
                  defaultValue={initialDates.inicio}
                  className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-800 outline-none transition focus:border-[#ff4d00] focus:ring-4 focus:ring-[#ff4d00]/10"
                />
              </label>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Previsão de Conclusão
                <input
                  name="dataPrevisaoFim"
                  type="date"
                  defaultValue={initialDates.fim}
                  className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-800 outline-none transition focus:border-[#ff4d00] focus:ring-4 focus:ring-[#ff4d00]/10"
                />
              </label>
            </div>
          </div>
        </section>

        {/* Card 3: Localização e Equipe Responsável */}
        <section className="rigor-card p-6 sm:p-7">
          <div className="mb-6 flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50 text-[#ff4d00]">
              <MapPin className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-black text-slate-900">3. Localização e Responsáveis</h2>
              <p className="text-xs text-slate-500">
                Endereço físico do canteiro e engenheiro/cliente vinculados
              </p>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Endereço do Canteiro
                <input
                  name="endereco"
                  placeholder="Ex.: Rodovia Índio Tibiriçá, km 42"
                  className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-800 outline-none transition focus:border-[#ff4d00] focus:ring-4 focus:ring-[#ff4d00]/10"
                />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Cidade
                  <input
                    name="cidade"
                    placeholder="Suzano"
                    className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 outline-none transition focus:border-[#ff4d00] focus:ring-4 focus:ring-[#ff4d00]/10"
                  />
                </label>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  UF
                  <input
                    name="estado"
                    placeholder="SP"
                    maxLength={2}
                    className="mt-2 h-11 w-full uppercase rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800 outline-none transition focus:border-[#ff4d00] focus:ring-4 focus:ring-[#ff4d00]/10 text-center"
                  />
                </label>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Engenheiro Responsável
                <select
                  name="engenheiroId"
                  disabled={loadingUsuarios}
                  className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 outline-none transition focus:border-[#ff4d00] focus:ring-4 focus:ring-[#ff4d00]/10"
                >
                  <option value="">Selecione o engenheiro...</option>
                  {usuarios.map((u) => (
                    <option key={u.value} value={u.value}>
                      {u.label}
                      {u.role
                        ? ` — ${
                            u.role === 'SUPER_ADMIN'
                              ? 'Super Admin'
                              : u.role === 'ADMIN'
                                ? 'Admin'
                                : u.role === 'ENGENHEIRO'
                                  ? 'Engenheiro'
                                  : u.role === 'ENCARREGADO'
                                    ? 'Encarregado'
                                    : u.role
                          }`
                        : ''}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Cliente / Contratante
                <select
                  name="clienteId"
                  disabled={loadingUsuarios}
                  className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 outline-none transition focus:border-[#ff4d00] focus:ring-4 focus:ring-[#ff4d00]/10"
                >
                  <option value="">Selecione o cliente...</option>
                  {usuarios.map((u) => (
                    <option key={u.value} value={u.value}>
                      {u.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Observações / Descrição
                <input
                  name="descricao"
                  placeholder="Escopo resumido, contrato ou notas"
                  className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-800 outline-none transition focus:border-[#ff4d00] focus:ring-4 focus:ring-[#ff4d00]/10"
                />
              </label>
            </div>
          </div>
        </section>

        {/* Card 4: Etapas Iniciais Automáticas */}
        <section className="rigor-card p-6 sm:p-7 bg-gradient-to-br from-white to-slate-50/70 border-orange-100">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#ff4d00] text-white shadow-md shadow-orange-500/20">
                <Sparkles className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-lg font-black text-slate-900">
                  4. Cronograma e Etapas Recomendadas
                </h2>
                <p className="text-xs text-slate-500">
                  Gera automaticamente a estrutura analítica de etapas da obra com base no tipo
                  escolhido
                </p>
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer rounded-lg bg-white border border-slate-200 px-3.5 py-2 shadow-sm">
              <input
                type="checkbox"
                checked={incluirEtapasPadrao}
                onChange={(e) => setIncluirEtapasPadrao(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-[#ff4d00] focus:ring-[#ff4d00]/20"
              />
              <span className="text-xs font-bold text-slate-800">Gerar etapas iniciais</span>
            </label>
          </div>

          {incluirEtapasPadrao && (
            <div className="mt-5 rounded-xl border border-slate-200/80 bg-white p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">
                Etapas que serão adicionadas ao Gantt da obra:
              </p>
              <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-4">
                {(ETAPAS_PADRAO[tipoSelecionado] || ETAPAS_PADRAO.DEFAULT).map((etapa) => (
                  <div
                    key={etapa}
                    className="flex items-center gap-2 rounded-lg bg-slate-50 p-2 text-xs font-semibold text-slate-700 border border-slate-100"
                  >
                    <Check className="h-3.5 w-3.5 text-[#ff4d00] shrink-0" />
                    <span className="truncate">{etapa}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Footer Actions */}
        <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-4 border-t border-slate-200">
          <Link
            href="/obras"
            className="w-full sm:w-auto inline-flex h-12 items-center justify-center rounded-xl border border-slate-200 bg-white px-6 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
          >
            Cancelar
          </Link>
          <Button
            type="submit"
            disabled={loading}
            className="rigor-btn-primary w-full sm:w-auto h-12 rounded-xl px-8 text-sm font-bold text-white shadow-lg transition-all"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Criando e configurando obra...
              </>
            ) : (
              <>
                <Check className="mr-2 h-5 w-5 stroke-[2.5]" />
                Concluir Cadastro e Abrir Obra
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
