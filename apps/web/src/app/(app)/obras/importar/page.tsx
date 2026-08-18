'use client';

import Link from 'next/link';
import { ChangeEvent, DragEvent, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Building2,
  CalendarRange,
  Check,
  CheckCircle2,
  Coins,
  Download,
  FileCode2,
  FileSpreadsheet,
  FileText,
  FileType2,
  Layers,
  Loader2,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
  UploadCloud,
} from 'lucide-react';
import type {
  ImportedEtapa,
  ImportedObra,
  ObraImportPreview,
  ObraImportResult,
} from '@/types/obra-import';

const obraTypes = [
  ['GALPAO', 'Galpão / Industrial'],
  ['EDIFICIO', 'Edifício / Predial'],
  ['PONTE', 'Ponte / Infraestrutura'],
  ['MURO_ARRIMO', 'Muro de arrimo / Contenção'],
  ['ELEMENTO_ISOLADO', 'Elemento isolado'],
  ['OUTRO', 'Outro'],
] as const;

const inputClass =
  'mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-[#ff5a00] focus:ring-4 focus:ring-orange-100/70';

export default function ImportarObraPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ObraImportPreview | null>(null);
  const [result, setResult] = useState<ObraImportResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');

  function chooseFile(nextFile?: File) {
    if (!nextFile) return;
    setError('');
    setPreview(null);
    setResult(null);
    setFile(nextFile);
  }

  async function analyze() {
    if (!file) return;
    setAnalyzing(true);
    setError('');
    try {
      const body = new FormData();
      body.append('file', file);
      const response = await fetch('/api/import/obras/preview', { method: 'POST', body });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Não foi possível analisar o arquivo');
      setPreview(data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível analisar o arquivo');
    } finally {
      setAnalyzing(false);
    }
  }

  async function commit() {
    if (!preview) return;
    setSaving(true);
    setError('');
    try {
      const response = await fetch('/api/import/obras/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: preview.file.name,
          obra: preview.obra,
          etapas: preview.etapas,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Não foi possível importar a obra');
      setResult(data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível importar a obra');
    } finally {
      setSaving(false);
    }
  }

  function reset() {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError('');
    if (inputRef.current) inputRef.current.value = '';
  }

  function updateObra<K extends keyof ImportedObra>(field: K, value: ImportedObra[K]) {
    setPreview((current) =>
      current ? { ...current, obra: { ...current.obra, [field]: value } } : current
    );
  }

  function updateEtapa<K extends keyof ImportedEtapa>(
    index: number,
    field: K,
    value: ImportedEtapa[K]
  ) {
    setPreview((current) => {
      if (!current) return current;
      const etapas = [...current.etapas];
      etapas[index] = { ...etapas[index], [field]: value };
      return { ...current, etapas };
    });
  }

  function addEtapa() {
    setPreview((current) =>
      current
        ? {
            ...current,
            etapas: [
              ...current.etapas,
              {
                nome: '',
                descricao: '',
                dataInicio: current.obra.dataInicio || '',
                dataFim: current.obra.dataPrevisaoFim || '',
                percentualPrevisto: 0,
                percentualRealizado: 0,
                valorFinanceiro: 0,
                ordem: current.etapas.length + 1,
              },
            ],
          }
        : current
    );
  }

  function removeEtapa(index: number) {
    setPreview((current) =>
      current ? { ...current, etapas: current.etapas.filter((_, item) => item !== index) } : current
    );
  }

  function drop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    chooseFile(event.dataTransfer.files[0]);
  }

  return (
    <div className="mx-auto w-full max-w-[1450px] pb-14 text-slate-800">
      <Link
        href="/obras"
        className="mb-5 inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[.12em] text-slate-500 transition hover:text-[#ff5a00]"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Voltar às obras
      </Link>

      {/* Header Banner com Alto Contraste */}
      <header className="relative overflow-hidden rounded-2xl bg-[#060b11] px-6 py-8 text-white shadow-xl sm:px-9 lg:px-11 lg:py-10 border border-slate-800/80">
        <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.06)_1px,transparent_1px)] [background-size:32px_32px]" />
        <div className="absolute -right-20 -top-24 h-96 w-96 rounded-full bg-[#ff5a00]/25 blur-3xl pointer-events-none" />
        <div className="relative grid gap-7 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="max-w-3xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-3.5 py-1.5 text-[11px] font-black uppercase tracking-[.18em] text-[#ff7a29]">
              <Sparkles className="h-3.5 w-3.5" /> Importação Inteligente Assistida
            </div>
            <h1 className="rigor-title text-3xl font-black tracking-tight text-white sm:text-4xl lg:text-5xl leading-tight">
              Do arquivo para a obra, <span className="text-[#ff5a00]">com revisão completa.</span>
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-300 font-medium">
              Importe cronogramas do <strong>Microsoft Project (.mpp, .xml)</strong>, relatórios em <strong>PDF</strong>, planilhas <strong>Excel</strong> ou documentos <strong>Word</strong>. O RIGOR reconhece os dados da obra e gera uma prévia pronta para conferência.
            </p>
          </div>
          <a
            href="/api/import/obras/template"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/[.08] px-5 text-xs font-black uppercase tracking-[.08em] text-white shadow-sm transition hover:border-[#ff6a1a]/60 hover:bg-[#ff6a1a]/20"
          >
            <Download className="h-4 w-4 text-[#ff7a29]" /> Baixar modelo Excel
          </a>
        </div>
      </header>

      {/* Stepper */}
      <div className="my-6 grid grid-cols-3 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <Step number="01" label="Arquivo" active={!preview && !result} complete={Boolean(preview || result)} />
        <Step number="02" label="Revisão do Cronograma" active={Boolean(preview && !result)} complete={Boolean(result)} />
        <Step number="03" label="Obra Cadastrada" active={Boolean(result)} complete={false} />
      </div>

      {error && (
        <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {result ? (
        <Success result={result} onReset={reset} />
      ) : preview ? (
        <PreviewEditor
          preview={preview}
          saving={saving}
          onObraChange={updateObra}
          onEtapaChange={updateEtapa}
          onAddEtapa={addEtapa}
          onRemoveEtapa={removeEtapa}
          onBack={() => setPreview(null)}
          onCommit={commit}
        />
      ) : (
        <UploadStage
          file={file}
          inputRef={inputRef}
          analyzing={analyzing}
          dragging={dragging}
          onDragState={setDragging}
          onDrop={drop}
          onFileChange={(event) => chooseFile(event.target.files?.[0])}
          onBrowse={() => inputRef.current?.click()}
          onAnalyze={analyze}
        />
      )}
    </div>
  );
}

function Step({ number, label, active, complete }: { number: string; label: string; active: boolean; complete: boolean }) {
  return (
    <div className={`flex items-center gap-3 border-r border-slate-100 px-3 py-4 last:border-0 sm:px-6 ${active ? 'bg-orange-50/70' : ''}`}>
      <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-[11px] font-black ${complete ? 'bg-emerald-500 text-white' : active ? 'bg-[#ff5a00] text-white shadow-md shadow-orange-500/20' : 'bg-slate-100 text-slate-400'}`}>
        {complete ? <Check className="h-4 w-4" /> : number}
      </span>
      <span className={`hidden text-xs font-black uppercase tracking-[.08em] sm:block ${active ? 'text-[#d94c09]' : 'text-slate-500'}`}>{label}</span>
    </div>
  );
}

function UploadStage({ file, inputRef, analyzing, dragging, onDragState, onDrop, onFileChange, onBrowse, onAnalyze }: {
  file: File | null;
  inputRef: React.RefObject<HTMLInputElement | null>;
  analyzing: boolean;
  dragging: boolean;
  onDragState: (value: boolean) => void;
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onBrowse: () => void;
  onAnalyze: () => void;
}) {
  const fileExt = file?.name.split('.').pop()?.toLowerCase() || '';

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_390px]">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div
          onDragOver={(event) => { event.preventDefault(); onDragState(true); }}
          onDragLeave={() => onDragState(false)}
          onDrop={onDrop}
          className={`grid min-h-[360px] place-items-center rounded-xl border-2 border-dashed p-8 text-center transition ${dragging ? 'border-[#ff5a00] bg-orange-50/80 scale-[0.99]' : file ? 'border-emerald-400 bg-emerald-50/40' : 'border-slate-300 bg-slate-50/60 hover:border-orange-400 hover:bg-orange-50/20'}`}
        >
          <div className="max-w-lg">
            <div className={`mx-auto grid h-16 w-16 place-items-center rounded-2xl shadow-sm ${file ? 'bg-emerald-500 text-white' : 'bg-[#0a111a] text-[#ff5a00]'}`}>
              {file ? <CheckCircle2 className="h-8 w-8" /> : <UploadCloud className="h-8 w-8" />}
            </div>
            {file ? (
              <>
                <div className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-orange-400">
                  Formato .{fileExt.toUpperCase()}
                </div>
                <p className="mt-2 text-lg font-black text-slate-900">{file.name}</p>
                <p className="mt-1 text-xs font-semibold text-slate-500">{formatBytes(file.size)} · pronto para processamento</p>
                <button type="button" onClick={onBrowse} className="mt-4 text-xs font-black text-[#e85109] hover:underline">Escolher outro arquivo</button>
              </>
            ) : (
              <>
                <h2 className="mt-5 text-2xl font-black tracking-[-.025em] text-slate-900">Solte o arquivo do projeto ou obra aqui</h2>
                <p className="mx-auto mt-3 max-w-md text-xs leading-relaxed text-slate-500 font-medium">
                  Suporta arquivos <strong>Microsoft Project (.mpp, .xml)</strong>, documentos <strong>PDF (.pdf)</strong>, planilhas <strong>Excel (.xlsx, .csv)</strong> e <strong>Word (.docx)</strong>.
                </p>
                <button type="button" onClick={onBrowse} className="mt-6 rounded-lg bg-[#071018] px-6 py-3 text-xs font-black uppercase tracking-[.08em] text-white transition hover:bg-[#ff5a00] shadow-md">
                  Selecionar do Computador
                </button>
              </>
            )}
            <input
              ref={inputRef}
              className="sr-only"
              type="file"
              accept=".mpp,.xml,.pdf,.xlsx,.xls,.csv,.docx"
              onChange={onFileChange}
            />
          </div>
        </div>

        <button
          type="button"
          disabled={!file || analyzing}
          onClick={onAnalyze}
          className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#ff5a00] text-sm font-black uppercase tracking-wider text-white shadow-lg shadow-orange-600/20 transition hover:bg-[#e85109] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {analyzing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
          {analyzing ? 'Processando e estruturando dados…' : 'Analisar e Gerar Prévia'}
        </button>
      </section>

      {/* Cards Laterais Informativos */}
      <aside className="space-y-4">
        <FormatCard
          badge="Cronograma & WBS"
          badgeColor="bg-orange-100 text-orange-800"
          icon={<FileCode2 className="text-[#ff5a00]" />}
          title="Microsoft Project (.mpp / .xml)"
          text="Importa a estrutura WBS, tarefas resumo, marcos, datas de início/fim planejadas, percentuais de avanço físico e custos por atividade."
        />
        <FormatCard
          badge="Documentos & Memoriais"
          badgeColor="bg-rose-100 text-rose-800"
          icon={<FileType2 className="text-rose-600" />}
          title="Documento PDF (.pdf)"
          text="Extrai automaticamente identificação da obra, escopo, memorial descritivo, orçamentos e listas de etapas numeradas do documento."
        />
        <FormatCard
          badge="Planilhas"
          badgeColor="bg-emerald-100 text-emerald-800"
          icon={<FileSpreadsheet className="text-emerald-600" />}
          title="Excel ou CSV (.xlsx / .csv)"
          text="Reconhece dados cadastrais em colunas ou formulário. Abas chamadas Etapas, Cronograma ou Planejamento entram diretamente."
        />
        <FormatCard
          badge="Textos"
          badgeColor="bg-blue-100 text-blue-800"
          icon={<FileText className="text-blue-600" />}
          title="Documento Word (.docx)"
          text="Mapeia seções e tópicos como Nome da Obra, Código, Cidade, Valor e listas de etapas estruturadas."
        />

        <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-5">
          <p className="text-[10px] font-black uppercase tracking-[.14em] text-amber-800">Segurança e Privacidade</p>
          <p className="mt-2 text-xs leading-5 text-amber-900/80">
            O arquivo é processado exclusivamente para montar a prévia editável. Nenhum dado é persistido no banco até você revisar e confirmar.
          </p>
          <p className="mt-3 text-[10px] font-bold text-amber-800">Tamanho máximo: até 30 MB</p>
        </div>
      </aside>
    </div>
  );
}

function FormatCard({ badge, badgeColor, icon, title, text }: { badge: string; badgeColor: string; icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-slate-100 [&>svg]:h-5 [&>svg]:w-5">{icon}</span>
          <h3 className="text-sm font-black text-slate-900">{title}</h3>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${badgeColor}`}>{badge}</span>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-slate-600">{text}</p>
    </div>
  );
}

function PreviewEditor({ preview, saving, onObraChange, onEtapaChange, onAddEtapa, onRemoveEtapa, onBack, onCommit }: {
  preview: ObraImportPreview;
  saving: boolean;
  onObraChange: <K extends keyof ImportedObra>(field: K, value: ImportedObra[K]) => void;
  onEtapaChange: <K extends keyof ImportedEtapa>(index: number, field: K, value: ImportedEtapa[K]) => void;
  onAddEtapa: () => void;
  onRemoveEtapa: (index: number) => void;
  onBack: () => void;
  onCommit: () => void;
}) {
  const valid = preview.obra.nome.trim().length >= 3 && preview.obra.codigo.trim().length >= 2;

  const totalValorEtapas = preview.etapas.reduce((acc, curr) => acc + (curr.valorFinanceiro || 0), 0);

  return (
    <div className="space-y-6">
      {/* Resumo de Destaque / KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiSummaryCard
          icon={<Building2 className="text-[#ff5a00]" />}
          label="Obra Identificada"
          value={preview.obra.nome || 'Não informada'}
          subvalue={`Código: ${preview.obra.codigo || '—'}`}
        />
        <KpiSummaryCard
          icon={<CalendarRange className="text-blue-500" />}
          label="Período Previsto"
          value={preview.obra.dataInicio ? `${preview.obra.dataInicio} › ${preview.obra.dataPrevisaoFim || '—'}` : 'Datas a definir'}
          subvalue={preview.obra.dataInicio && preview.obra.dataPrevisaoFim ? 'Cronograma estruturado' : 'Ajuste se necessário'}
        />
        <KpiSummaryCard
          icon={<Coins className="text-emerald-500" />}
          label="Valor Contratado"
          value={preview.obra.valorContratado > 0 ? formatMoney(preview.obra.valorContratado) : (totalValorEtapas > 0 ? formatMoney(totalValorEtapas) : 'R$ 0,00')}
          subvalue={preview.obra.valorContratado > 0 ? 'Origem do arquivo' : 'Calculado das etapas'}
        />
        <KpiSummaryCard
          icon={<Layers className="text-purple-500" />}
          label="Etapas no Cronograma"
          value={`${preview.etapas.length} tarefas / etapas`}
          subvalue={preview.confidence === 'alta' ? 'Alta precisão' : `Confiança ${preview.confidence}`}
        />
      </div>

      {/* Formulário Principal de Cadastro da Obra */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.14em] text-[#ff5a00]">Dados Principais</p>
            <h2 className="mt-1 text-2xl font-black tracking-[-.025em] text-slate-900">Revise e edite as informações da obra</h2>
            <p className="mt-1 text-xs font-semibold text-slate-400">{preview.file.name} · {formatBytes(preview.file.size)}</p>
          </div>
          <span className={`w-fit rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-[.1em] ${preview.confidence === 'alta' ? 'bg-emerald-100 text-emerald-700' : preview.confidence === 'media' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'}`}>
            Confiança {preview.confidence}
          </span>
        </div>

        {/* Campos Detectados */}
        <div className="mt-5 flex flex-wrap gap-2">
          {preview.detectedFields.map((field) => (
            <span key={field} className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-bold text-emerald-700">
              <Check className="mr-1 inline h-3 w-3" /> {field}
            </span>
          ))}
        </div>

        {preview.warnings.length > 0 && (
          <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-[10px] font-black uppercase tracking-[.12em] text-amber-800">Observações do processamento</p>
            <ul className="mt-2 space-y-1.5 text-xs leading-5 text-amber-900/90">
              {preview.warnings.map((warning) => <li key={warning}>• {warning}</li>)}
            </ul>
          </div>
        )}

        <div className="mt-7 grid gap-x-5 gap-y-4 sm:grid-cols-2 xl:grid-cols-4">
          <Field label="Nome da obra *" className="xl:col-span-2">
            <input className={inputClass} value={preview.obra.nome} onChange={(event) => onObraChange('nome', event.target.value)} placeholder="Ex.: Hangar Obra CHC" />
          </Field>
          <Field label="Código *">
            <input className={inputClass} value={preview.obra.codigo} onChange={(event) => onObraChange('codigo', event.target.value.toUpperCase())} placeholder="Ex.: CHC-001" />
          </Field>
          <Field label="Tipo da Obra">
            <select className={inputClass} value={preview.obra.tipo} onChange={(event) => onObraChange('tipo', event.target.value as ImportedObra['tipo'])}>
              {obraTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </Field>
          <Field label="Endereço" className="xl:col-span-2">
            <input className={inputClass} value={preview.obra.endereco} onChange={(event) => onObraChange('endereco', event.target.value)} placeholder="Ex.: Av. das Nações, 1200" />
          </Field>
          <Field label="Cidade">
            <input className={inputClass} value={preview.obra.cidade} onChange={(event) => onObraChange('cidade', event.target.value)} placeholder="Ex.: São Paulo" />
          </Field>
          <Field label="UF">
            <input maxLength={2} className={inputClass} value={preview.obra.estado} onChange={(event) => onObraChange('estado', event.target.value.toUpperCase())} placeholder="Ex.: SP" />
          </Field>
          <Field label="Valor contratado (R$)">
            <input type="number" min="0" step="0.01" className={inputClass} value={preview.obra.valorContratado} onChange={(event) => onObraChange('valorContratado', Number(event.target.value))} />
          </Field>
          <Field label="Data de início">
            <input type="date" className={inputClass} value={preview.obra.dataInicio} onChange={(event) => onObraChange('dataInicio', event.target.value)} />
          </Field>
          <Field label="Previsão de término">
            <input type="date" className={inputClass} value={preview.obra.dataPrevisaoFim} onChange={(event) => onObraChange('dataPrevisaoFim', event.target.value)} />
          </Field>
          <Field label="Descrição / Escopo do Projeto" className="sm:col-span-2 xl:col-span-4">
            <textarea className={`${inputClass} min-h-24 py-3`} value={preview.obra.descricao} onChange={(event) => onObraChange('descricao', event.target.value)} placeholder="Observações e detalhes do escopo..." />
          </Field>
        </div>
      </section>

      {/* Tabela de Etapas do Cronograma */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.14em] text-[#ff5a00]">Planejamento de Atividades</p>
            <h2 className="mt-1 text-xl font-black text-slate-900">{preview.etapas.length} etapas no cronograma inicial</h2>
          </div>
          <button
            type="button"
            onClick={onAddEtapa}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 text-xs font-black text-slate-700 transition hover:border-[#ff5a00] hover:bg-orange-50 hover:text-[#e85109]"
          >
            <Plus className="h-3.5 w-3.5" /> Adicionar etapa
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] text-left text-sm">
            <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-[.1em] text-slate-500 border-b border-slate-100">
              <tr>
                <th className="px-4 py-3.5">#</th>
                <th className="px-4 py-3.5">Nome da Etapa / WBS</th>
                <th className="px-4 py-3.5">Início Previsto</th>
                <th className="px-4 py-3.5">Fim Previsto</th>
                <th className="px-4 py-3.5">% Prev.</th>
                <th className="px-4 py-3.5">% Real.</th>
                <th className="px-4 py-3.5">Custo / Valor (R$)</th>
                <th className="px-4 py-3.5 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {preview.etapas.map((etapa, index) => (
                <tr key={`${index}-${etapa.ordem}`} className="hover:bg-slate-50/60 transition">
                  <td className="px-4 py-3 text-xs font-black text-slate-400">{String(index + 1).padStart(2, '0')}</td>
                  <td className="px-4 py-3">
                    <input
                      aria-label={`Nome da etapa ${index + 1}`}
                      className="h-9 w-full max-w-sm rounded-md border border-slate-200 px-3 text-xs font-bold text-slate-800 outline-none focus:border-[#ff5a00]"
                      value={etapa.nome}
                      onChange={(event) => onEtapaChange(index, 'nome', event.target.value)}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      aria-label={`Início da etapa ${index + 1}`}
                      type="date"
                      className="h-9 rounded-md border border-slate-200 px-2.5 text-xs font-medium outline-none focus:border-[#ff5a00]"
                      value={etapa.dataInicio}
                      onChange={(event) => onEtapaChange(index, 'dataInicio', event.target.value)}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      aria-label={`Fim da etapa ${index + 1}`}
                      type="date"
                      className="h-9 rounded-md border border-slate-200 px-2.5 text-xs font-medium outline-none focus:border-[#ff5a00]"
                      value={etapa.dataFim}
                      onChange={(event) => onEtapaChange(index, 'dataFim', event.target.value)}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      aria-label={`Previsto da etapa ${index + 1}`}
                      type="number"
                      min="0"
                      max="100"
                      className="h-9 w-20 rounded-md border border-slate-200 px-2.5 text-xs font-bold outline-none focus:border-[#ff5a00]"
                      value={etapa.percentualPrevisto}
                      onChange={(event) => onEtapaChange(index, 'percentualPrevisto', Number(event.target.value))}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      aria-label={`Realizado da etapa ${index + 1}`}
                      type="number"
                      min="0"
                      max="100"
                      className="h-9 w-20 rounded-md border border-slate-200 px-2.5 text-xs font-bold outline-none focus:border-[#ff5a00]"
                      value={etapa.percentualRealizado}
                      onChange={(event) => onEtapaChange(index, 'percentualRealizado', Number(event.target.value))}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      aria-label={`Valor da etapa ${index + 1}`}
                      type="number"
                      min="0"
                      step="0.01"
                      className="h-9 w-32 rounded-md border border-slate-200 px-2.5 text-xs font-bold outline-none focus:border-[#ff5a00]"
                      value={etapa.valorFinanceiro}
                      onChange={(event) => onEtapaChange(index, 'valorFinanceiro', Number(event.target.value))}
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      aria-label={`Remover etapa ${index + 1}`}
                      onClick={() => onRemoveEtapa(index)}
                      className="inline-grid h-8 w-8 place-items-center rounded-md text-slate-300 transition hover:bg-red-50 hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {!preview.etapas.length && (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-sm font-semibold text-slate-400">
                    Nenhuma etapa identificada no arquivo. Você pode cadastrar etapas manualmente ou importar apenas os dados cadastrais da obra.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Barra de Ação Fixa Inferior */}
      <div className="sticky bottom-4 z-20 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-2xl backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-xs font-black text-slate-700 transition hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" /> Trocar arquivo
        </button>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <p className="text-center text-[11px] font-semibold text-slate-500 sm:text-right">
            A obra será gravada em <strong>Planejamento</strong> com {preview.etapas.length} etapas.
          </p>
          <button
            type="button"
            disabled={!valid || saving}
            onClick={onCommit}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#ff5a00] px-7 text-xs font-black uppercase tracking-[.08em] text-white shadow-lg shadow-orange-600/20 transition hover:bg-[#e85109] disabled:opacity-40"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
            {saving ? 'Gravando obra e etapas…' : `Salvar Obra e ${preview.etapas.length} Etapas`}
          </button>
        </div>
      </div>
    </div>
  );
}

function KpiSummaryCard({ icon, label, value, subvalue }: { icon: React.ReactNode; label: string; value: string; subvalue: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-slate-500">
        <span className="[&>svg]:h-4 [&>svg]:w-4">{icon}</span>
        {label}
      </div>
      <p className="mt-2 text-base font-black text-slate-900 truncate" title={value}>{value}</p>
      <p className="mt-0.5 text-[11px] font-semibold text-slate-400">{subvalue}</p>
    </div>
  );
}

function Field({ label, className = '', children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <label className={`block text-[10px] font-black uppercase tracking-[.08em] text-slate-600 ${className}`}>
      {label}
      {children}
    </label>
  );
}

function Success({ result, onReset }: { result: ObraImportResult; onReset: () => void }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-xl">
      <div className="grid gap-8 bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent p-8 sm:p-11 lg:grid-cols-[auto_1fr] lg:items-center">
        <span className="grid h-20 w-20 place-items-center rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-600/30">
          <CheckCircle2 className="h-10 w-10" />
        </span>
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-800">
            Importação Concluída com Sucesso
          </div>
          <h2 className="mt-3 text-3xl font-black tracking-[-.035em] text-slate-900 sm:text-4xl">{result.nome}</h2>
          <p className="mt-2 text-sm text-slate-600 font-medium">
            Código <strong>{result.codigo}</strong> · <strong>{result.etapasCriadas} etapas</strong> cadastradas no cronograma inicial da obra.
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-3 border-t border-slate-100 p-6 sm:flex-row sm:justify-end bg-slate-50/50">
        <button
          type="button"
          onClick={onReset}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-xs font-black text-slate-700 transition hover:bg-slate-50"
        >
          <RotateCcw className="h-4 w-4" /> Importar outro projeto
        </button>
        <Link
          href={`/obras/${result.id}`}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#071018] px-6 text-xs font-black uppercase tracking-wider text-white shadow-md transition hover:bg-[#ff5a00]"
        >
          Acessar Obra <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}
