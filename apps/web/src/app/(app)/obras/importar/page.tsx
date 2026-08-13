'use client';

import Link from 'next/link';
import { ChangeEvent, DragEvent, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileText,
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
  ['GALPAO', 'Galpão'],
  ['EDIFICIO', 'Edifício'],
  ['PONTE', 'Ponte / viaduto'],
  ['MURO_ARRIMO', 'Muro de arrimo'],
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
                dataInicio: '',
                dataFim: '',
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
    <div className="mx-auto w-full max-w-[1450px] pb-12 text-slate-800">
      <Link
        href="/obras"
        className="mb-5 inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[.12em] text-slate-400 transition hover:text-[#ff5a00]"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Voltar às obras
      </Link>

      <header className="relative overflow-hidden rounded-2xl bg-[#071018] px-6 py-8 text-white shadow-xl sm:px-9 lg:px-11 lg:py-10">
        <div className="absolute inset-0 opacity-25 [background-image:linear-gradient(rgba(255,255,255,.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.05)_1px,transparent_1px)] [background-size:30px_30px]" />
        <div className="absolute -right-24 -top-28 h-80 w-80 rounded-full bg-[#ff5a00]/20 blur-3xl" />
        <div className="relative grid gap-7 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="max-w-3xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#ff6a1a]/25 bg-[#ff6a1a]/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.18em] text-[#ff8a4d]">
              <Sparkles className="h-3.5 w-3.5" /> Importação assistida
            </div>
            <h1 className="rigor-title text-3xl font-black tracking-[-.035em] sm:text-4xl lg:text-5xl">
              Do arquivo para a obra, com revisão humana.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-400">
              Envie a documentação que sua equipe já usa. O RIGOR identifica os dados gerais e o
              cronograma, organiza uma prévia editável e grava tudo somente após sua confirmação.
            </p>
          </div>
          <a
            href="/api/import/obras/template"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/[.06] px-5 text-xs font-black uppercase tracking-[.08em] text-white transition hover:border-[#ff6a1a]/50 hover:bg-[#ff6a1a]/10"
          >
            <Download className="h-4 w-4" /> Baixar modelo Excel
          </a>
        </div>
      </header>

      <div className="my-6 grid grid-cols-3 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <Step number="01" label="Arquivo" active={!preview && !result} complete={Boolean(preview || result)} />
        <Step number="02" label="Revisão" active={Boolean(preview && !result)} complete={Boolean(result)} />
        <Step number="03" label="Concluído" active={Boolean(result)} complete={false} />
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
    <div className={`flex items-center gap-3 border-r border-slate-100 px-3 py-4 last:border-0 sm:px-6 ${active ? 'bg-orange-50/60' : ''}`}>
      <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-[10px] font-black ${complete ? 'bg-emerald-500 text-white' : active ? 'bg-[#ff5a00] text-white' : 'bg-slate-100 text-slate-400'}`}>
        {complete ? <Check className="h-4 w-4" /> : number}
      </span>
      <span className={`hidden text-xs font-black uppercase tracking-[.08em] sm:block ${active ? 'text-[#d94c09]' : 'text-slate-400'}`}>{label}</span>
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
  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div
          onDragOver={(event) => { event.preventDefault(); onDragState(true); }}
          onDragLeave={() => onDragState(false)}
          onDrop={onDrop}
          className={`grid min-h-[340px] place-items-center rounded-xl border-2 border-dashed p-7 text-center transition ${dragging ? 'border-[#ff5a00] bg-orange-50' : file ? 'border-emerald-300 bg-emerald-50/30' : 'border-slate-200 bg-slate-50/60 hover:border-slate-300'}`}
        >
          <div className="max-w-lg">
            <div className={`mx-auto grid h-16 w-16 place-items-center rounded-2xl ${file ? 'bg-emerald-500 text-white' : 'bg-[#071018] text-[#ff6a1a]'}`}>
              {file ? <CheckCircle2 className="h-7 w-7" /> : <UploadCloud className="h-7 w-7" />}
            </div>
            {file ? (
              <>
                <p className="mt-5 text-lg font-black text-slate-900">{file.name}</p>
                <p className="mt-1 text-xs font-semibold text-slate-400">{formatBytes(file.size)} · pronto para análise</p>
                <button type="button" onClick={onBrowse} className="mt-5 text-xs font-black text-[#e85109] hover:underline">Escolher outro arquivo</button>
              </>
            ) : (
              <>
                <h2 className="mt-5 text-2xl font-black tracking-[-.025em] text-slate-900">Solte o arquivo da obra aqui</h2>
                <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-500">Excel com abas de dados e cronograma, CSV de cadastro ou Word com campos identificados por título.</p>
                <button type="button" onClick={onBrowse} className="mt-6 rounded-lg bg-[#071018] px-5 py-3 text-xs font-black uppercase tracking-[.08em] text-white transition hover:bg-[#ff5a00]">Selecionar arquivo</button>
              </>
            )}
            <input ref={inputRef} className="sr-only" type="file" accept=".xlsx,.csv,.docx" onChange={onFileChange} />
          </div>
        </div>
        <button type="button" disabled={!file || analyzing} onClick={onAnalyze} className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#ff5a00] text-sm font-black text-white shadow-lg shadow-orange-600/20 transition hover:bg-[#e85109] disabled:cursor-not-allowed disabled:opacity-40">
          {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {analyzing ? 'Lendo e organizando dados…' : 'Analisar arquivo'}
        </button>
      </section>

      <aside className="space-y-4">
        <InfoCard icon={<FileSpreadsheet />} title="Excel ou CSV" text="Reconhece dados gerais em linhas ou colunas. Abas chamadas Etapas, Cronograma ou Planejamento entram automaticamente." />
        <InfoCard icon={<FileText />} title="Documento Word" text="Identifica rótulos como Nome da obra, Código, Cidade, Valor contratado e datas. Use .docx sem imagens pesadas." />
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <p className="text-[10px] font-black uppercase tracking-[.12em] text-amber-700">Controle de dados</p>
          <p className="mt-2 text-xs leading-5 text-amber-800/80">O arquivo é processado somente para gerar a prévia. Nada é cadastrado até você confirmar e o documento original não fica armazenado.</p>
          <p className="mt-3 text-[10px] font-bold text-amber-700">Formatos: .xlsx, .csv e .docx · até 4 MB</p>
        </div>
      </aside>
    </div>
  );
}

function InfoCard({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-lg bg-slate-100 text-slate-700 [&>svg]:h-4 [&>svg]:w-4">{icon}</span><h3 className="text-sm font-black text-slate-900">{title}</h3></div>
      <p className="mt-3 text-xs leading-5 text-slate-500">{text}</p>
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
  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-start sm:justify-between">
          <div><p className="text-[10px] font-black uppercase tracking-[.14em] text-[#ff5a00]">Prévia editável</p><h2 className="mt-2 text-2xl font-black tracking-[-.025em] text-slate-900">Revise antes de gravar</h2><p className="mt-1 text-xs font-semibold text-slate-400">{preview.file.name} · {formatBytes(preview.file.size)}</p></div>
          <span className={`w-fit rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-[.1em] ${preview.confidence === 'alta' ? 'bg-emerald-100 text-emerald-700' : preview.confidence === 'media' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>Confiança {preview.confidence}</span>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {preview.detectedFields.map((field) => <span key={field} className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-bold text-emerald-700"><Check className="mr-1 inline h-3 w-3" /> {field}</span>)}
        </div>

        {preview.warnings.length > 0 && (
          <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4"><p className="text-[10px] font-black uppercase tracking-[.12em] text-amber-700">Pontos para revisar</p><ul className="mt-2 space-y-1.5 text-xs leading-5 text-amber-800">{preview.warnings.map((warning) => <li key={warning}>• {warning}</li>)}</ul></div>
        )}

        <div className="mt-7 grid gap-x-5 gap-y-4 sm:grid-cols-2 xl:grid-cols-4">
          <Field label="Nome da obra *" className="xl:col-span-2"><input className={inputClass} value={preview.obra.nome} onChange={(event) => onObraChange('nome', event.target.value)} /></Field>
          <Field label="Código *"><input className={inputClass} value={preview.obra.codigo} onChange={(event) => onObraChange('codigo', event.target.value.toUpperCase())} /></Field>
          <Field label="Tipo"><select className={inputClass} value={preview.obra.tipo} onChange={(event) => onObraChange('tipo', event.target.value as ImportedObra['tipo'])}>{obraTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
          <Field label="Endereço" className="xl:col-span-2"><input className={inputClass} value={preview.obra.endereco} onChange={(event) => onObraChange('endereco', event.target.value)} /></Field>
          <Field label="Cidade"><input className={inputClass} value={preview.obra.cidade} onChange={(event) => onObraChange('cidade', event.target.value)} /></Field>
          <Field label="UF"><input maxLength={2} className={inputClass} value={preview.obra.estado} onChange={(event) => onObraChange('estado', event.target.value.toUpperCase())} /></Field>
          <Field label="Valor contratado"><input type="number" min="0" step="0.01" className={inputClass} value={preview.obra.valorContratado} onChange={(event) => onObraChange('valorContratado', Number(event.target.value))} /></Field>
          <Field label="Data de início"><input type="date" className={inputClass} value={preview.obra.dataInicio} onChange={(event) => onObraChange('dataInicio', event.target.value)} /></Field>
          <Field label="Previsão de término"><input type="date" className={inputClass} value={preview.obra.dataPrevisaoFim} onChange={(event) => onObraChange('dataPrevisaoFim', event.target.value)} /></Field>
          <Field label="Descrição" className="sm:col-span-2 xl:col-span-4"><textarea className={`${inputClass} min-h-24 py-3`} value={preview.obra.descricao} onChange={(event) => onObraChange('descricao', event.target.value)} /></Field>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7"><div><p className="text-[10px] font-black uppercase tracking-[.14em] text-[#ff5a00]">Cronograma inicial</p><h2 className="mt-1 text-xl font-black text-slate-900">{preview.etapas.length} etapas identificadas</h2></div><button type="button" onClick={onAddEtapa} className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 text-xs font-black text-slate-700 hover:border-[#ff5a00] hover:text-[#e85109]"><Plus className="h-3.5 w-3.5" /> Adicionar etapa</button></div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] text-left">
            <thead className="bg-slate-50 text-[9px] font-black uppercase tracking-[.1em] text-slate-400"><tr><th className="px-4 py-3">#</th><th className="px-4 py-3">Etapa</th><th className="px-4 py-3">Início</th><th className="px-4 py-3">Fim</th><th className="px-4 py-3">Previsto</th><th className="px-4 py-3">Realizado</th><th className="px-4 py-3">Valor</th><th className="px-4 py-3" /></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {preview.etapas.map((etapa, index) => (
                <tr key={`${index}-${etapa.ordem}`} className="align-top">
                  <td className="px-4 py-3 text-xs font-black text-slate-400">{String(index + 1).padStart(2, '0')}</td>
                  <td className="px-4 py-3"><input aria-label={`Nome da etapa ${index + 1}`} className="h-9 w-64 rounded-md border border-slate-200 px-2.5 text-xs font-bold outline-none focus:border-[#ff5a00]" value={etapa.nome} onChange={(event) => onEtapaChange(index, 'nome', event.target.value)} /></td>
                  <td className="px-4 py-3"><input aria-label={`Início da etapa ${index + 1}`} type="date" className="h-9 rounded-md border border-slate-200 px-2 text-xs outline-none focus:border-[#ff5a00]" value={etapa.dataInicio} onChange={(event) => onEtapaChange(index, 'dataInicio', event.target.value)} /></td>
                  <td className="px-4 py-3"><input aria-label={`Fim da etapa ${index + 1}`} type="date" className="h-9 rounded-md border border-slate-200 px-2 text-xs outline-none focus:border-[#ff5a00]" value={etapa.dataFim} onChange={(event) => onEtapaChange(index, 'dataFim', event.target.value)} /></td>
                  <td className="px-4 py-3"><input aria-label={`Previsto da etapa ${index + 1}`} type="number" min="0" max="100" className="h-9 w-20 rounded-md border border-slate-200 px-2 text-xs outline-none focus:border-[#ff5a00]" value={etapa.percentualPrevisto} onChange={(event) => onEtapaChange(index, 'percentualPrevisto', Number(event.target.value))} /></td>
                  <td className="px-4 py-3"><input aria-label={`Realizado da etapa ${index + 1}`} type="number" min="0" max="100" className="h-9 w-20 rounded-md border border-slate-200 px-2 text-xs outline-none focus:border-[#ff5a00]" value={etapa.percentualRealizado} onChange={(event) => onEtapaChange(index, 'percentualRealizado', Number(event.target.value))} /></td>
                  <td className="px-4 py-3"><input aria-label={`Valor da etapa ${index + 1}`} type="number" min="0" step="0.01" className="h-9 w-32 rounded-md border border-slate-200 px-2 text-xs outline-none focus:border-[#ff5a00]" value={etapa.valorFinanceiro} onChange={(event) => onEtapaChange(index, 'valorFinanceiro', Number(event.target.value))} /></td>
                  <td className="px-4 py-3"><button type="button" aria-label={`Remover etapa ${index + 1}`} onClick={() => onRemoveEtapa(index)} className="grid h-9 w-9 place-items-center rounded-md text-slate-300 hover:bg-red-50 hover:text-red-500"><Trash2 className="h-4 w-4" /></button></td>
                </tr>
              ))}
              {!preview.etapas.length && <tr><td colSpan={8} className="px-6 py-12 text-center text-sm font-semibold text-slate-400">Nenhuma etapa identificada. Você pode importar apenas a obra ou adicionar etapas manualmente.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <div className="sticky bottom-4 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white/95 p-4 shadow-2xl backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <button type="button" onClick={onBack} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 text-xs font-black text-slate-600 hover:bg-slate-50"><ArrowLeft className="h-3.5 w-3.5" /> Trocar arquivo</button>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center"><p className="text-center text-[10px] font-semibold text-slate-400 sm:text-right">A obra será criada em Planejamento<br />e poderá ser editada normalmente.</p><button type="button" disabled={!valid || saving} onClick={onCommit} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#ff5a00] px-6 text-xs font-black uppercase tracking-[.07em] text-white shadow-lg shadow-orange-600/20 hover:bg-[#e85109] disabled:opacity-40">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}{saving ? 'Importando…' : `Importar obra e ${preview.etapas.length} etapas`}</button></div>
      </div>
    </div>
  );
}

function Field({ label, className = '', children }: { label: string; className?: string; children: React.ReactNode }) {
  return <label className={`text-[10px] font-black uppercase tracking-[.08em] text-slate-500 ${className}`}>{label}{children}</label>;
}

function Success({ result, onReset }: { result: ObraImportResult; onReset: () => void }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-lg">
      <div className="grid gap-8 bg-emerald-50/60 p-7 sm:p-10 lg:grid-cols-[auto_1fr] lg:items-center"><span className="grid h-20 w-20 place-items-center rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-600/20"><CheckCircle2 className="h-9 w-9" /></span><div><p className="text-[10px] font-black uppercase tracking-[.16em] text-emerald-700">Importação concluída</p><h2 className="mt-2 text-3xl font-black tracking-[-.035em] text-slate-900">{result.nome}</h2><p className="mt-2 text-sm text-slate-500">Código {result.codigo} · {result.etapasCriadas} etapas criadas no cronograma inicial.</p></div></div>
      <div className="flex flex-col gap-3 p-6 sm:flex-row sm:justify-end"><button type="button" onClick={onReset} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 px-5 text-xs font-black text-slate-600 hover:bg-slate-50"><RotateCcw className="h-4 w-4" /> Importar outra</button><Link href={`/obras/${result.id}`} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#071018] px-6 text-xs font-black text-white hover:bg-[#ff5a00]">Abrir obra <ArrowRight className="h-4 w-4" /></Link></div>
    </section>
  );
}

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}
