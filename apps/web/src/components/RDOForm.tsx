"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Building2,
  Cloud,
  CloudRain,
  CloudSun,
  Sun,
  Users,
  ClipboardList,
  Camera,
  Pen,
  Trash2,
  Plus,
  CalendarIcon,
  ChevronDown,
  Check,
  Loader2,
  ArrowLeft,
} from "lucide-react";

// ─── Types ───
interface EfetivoRow {
  id?: string;
  funcao: string;
  previsto: number;
  presente: number;
  faltaJustificada: number;
  ausente: number;
}

interface Atividade {
  id: string;
  etapa: string;
  descricao: string;
  percentual: number;
}

interface Foto {
  id: string;
  src: string;
  legenda: string;
}

// ─── Componente Principal ───
export function RDOForm({ rdoId }: { rdoId?: string }) {
  const router = useRouter();
  const isEditing = Boolean(rdoId);

  // Loading states
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [carregandoObras, setCarregandoObras] = useState(true);
  const [error, setError] = useState("");

  // Data from API
  const [obras, setObras] = useState<{ id: string; nome: string }[]>([]);
  const [engenheiros, setEngenheiros] = useState<{ id: string; name: string }[]>([]);

  // Identificação
  const [obraId, setObraId] = useState("");
  const [showObraDropdown, setShowObraDropdown] = useState(false);
  const [obraNome, setObraNome] = useState("");
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const [engenheiro, setEngenheiro] = useState("");
  const [engenheiroId, setEngenheiroId] = useState("");
  const [rdoNumero, setRdoNumero] = useState("");
  const [showEngDropdown, setShowEngDropdown] = useState(false);

  // Condições Climáticas
  const [climaManha, setClimaManha] = useState<"sol" | "nublado" | "chuva" | "encoberto">("sol");
  const [climaTarde, setClimaTarde] = useState<"sol" | "nublado" | "chuva" | "encoberto">("nublado");
  const [tempManha, setTempManha] = useState("");
  const [tempTarde, setTempTarde] = useState("");

  // Efetivo Presente
  const [efetivo, setEfetivo] = useState<EfetivoRow[]>([]);
  const [novaFuncao, setNovaFuncao] = useState("");

  // Atividades
  const [atividades, setAtividades] = useState<Atividade[]>([]);
  const [novaEtapa, setNovaEtapa] = useState("");
  const [novaDescricao, setNovaDescricao] = useState("");
  const [novoPercentual, setNovoPercentual] = useState("");
  const [showAddAtividade, setShowAddAtividade] = useState(false);

  // Fotos
  const [fotos, setFotos] = useState<Foto[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Assinatura
  const [assinado, setAssinado] = useState(false);
  const [confirmado, setConfirmado] = useState(false);
  const [crea, setCrea] = useState("");
  const [nomeAssinatura, setNomeAssinatura] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Load obras and engineers on mount
  useEffect(() => {
    async function load() {
      try {
        const [obrasRes, usersRes] = await Promise.all([
          fetch("/api/crud/obras?search="),
          fetch("/api/crud-options"),
        ]);
        const obrasData = await obrasRes.json();
        const usersData = await usersRes.json().catch(() => ({}));

        setObras(obrasData.rows || []);
        const engenheirosList = (usersData as any)?.users || [];
        setEngenheiros(engenheirosList);
      } catch (e) {
        console.error("Erro ao carregar dados:", e);
      } finally {
        setCarregandoObras(false);
      }
    }
    load();
  }, []);

  // Load RDO data when editing
  useEffect(() => {
    if (!rdoId) return;
    setLoading(true);
    fetch(`/api/rdo/${rdoId}`)
      .then((r) => r.json())
      .then((rdo) => {
        setObraId(rdo.obraId || "");
        setObraNome(rdo.obra?.nome || "");
        setData(rdo.data ? new Date(rdo.data).toISOString().slice(0, 10) : "");
        setEngenheiro(rdo.responsavel?.name || rdo.assinaturaNome || "");
        setEngenheiroId(rdo.responsavelId || "");
        setRdoNumero(String(rdo.numero || ""));
        setCrea(rdo.assinaturaCrea || "");
        setNomeAssinatura(rdo.assinaturaNome || "");
        setConfirmado(rdo.status === "APROVADO");

        // Clima
        const climaMap: Record<string, "sol" | "nublado" | "chuva" | "encoberto"> = {
          ENSOLARADO: "sol",
          NUBLADO: "nublado",
          CHUVOSO: "chuva",
          PARCIALMENTE_NUBLADO: "encoberto",
        };
        if (rdo.climaManha) setClimaManha(climaMap[rdo.climaManha] || "sol");
        if (rdo.climaTarde) setClimaTarde(climaMap[rdo.climaTarde] || "nublado");
        if (rdo.temperaturaManha != null) setTempManha(String(rdo.temperaturaManha));
        if (rdo.temperaturaTarde != null) setTempTarde(String(rdo.temperaturaTarde));

        // Efetivo
        if (rdo.efetivos?.length) {
          setEfetivo(
            rdo.efetivos.map((e: any) => ({
              id: e.id,
              funcao: e.funcao,
              previsto: e.quantidadePresente + e.quantidadeAusente + e.quantidadeFaltaJustificada,
              presente: e.quantidadePresente,
              faltaJustificada: e.quantidadeFaltaJustificada,
              ausente: e.quantidadeAusente,
            }))
          );
        }

        // Atividades
        if (rdo.atividades?.length) {
          setAtividades(
            rdo.atividades.map((a: any) => ({
              id: a.id,
              etapa: a.etapa?.nome || a.descricao || "",
              descricao: a.descricao || "",
              percentual: a.percentualExecutado || 0,
            }))
          );
        }

        // Fotos
        if (rdo.fotos?.length) {
          setFotos(
            rdo.fotos.map((f: any) => ({
              id: f.id,
              src: f.url,
              legenda: f.legenda || "",
            }))
          );
        }

        // Assinatura
        if (rdo.assinaturaBase64) {
          setAssinado(true);
        }
      })
      .catch((e) => setError("Erro ao carregar RDO: " + e.message))
      .finally(() => setLoading(false));
  }, [rdoId]);

  // ─── Handlers ───
  const handleAddFuncao = () => {
    if (!novaFuncao.trim()) return;
    setEfetivo([...efetivo, { funcao: novaFuncao, previsto: 0, presente: 0, faltaJustificada: 0, ausente: 0 }]);
    setNovaFuncao("");
  };

  const handleAddAtividade = () => {
    if (!novaEtapa.trim() || !novaDescricao.trim()) return;
    const newAtividade: Atividade = {
      id: String(Date.now()),
      etapa: novaEtapa,
      descricao: novaDescricao,
      percentual: Number(novoPercentual) || 0,
    };
    setAtividades([...atividades, newAtividade]);
    setNovaEtapa("");
    setNovaDescricao("");
    setNovoPercentual("");
    setShowAddAtividade(false);
  };

  const handleRemoveAtividade = (id: string) => {
    setAtividades(atividades.filter((a) => a.id !== id));
  };

  const handleAddFoto = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const newFoto: Foto = {
        id: String(Date.now()),
        src: event.target?.result as string,
        legenda: file.name,
      };
      setFotos([...fotos, newFoto]);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveFoto = (id: string) => {
    setFotos(fotos.filter((f) => f.id !== id));
  };

  // Canvas signature
  const getCanvasPos = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const { x, y } = getCanvasPos(e);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const { x, y } = getCanvasPos(e);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.lineTo(x, y);
    ctx.stroke();
    setAssinado(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setAssinado(false);
  };

  const getSignatureDataUrl = () => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return canvas.toDataURL("image/png");
  };

  const mapClimaToEnum = (clima: string) => {
    const map: Record<string, string> = {
      sol: "ENSOLARADO",
      nublado: "NUBLADO",
      chuva: "CHUVOSO",
      encoberto: "PARCIALMENTE_NUBLADO",
    };
    return map[clima] || "ENSOLARADO";
  };

  // Save
  const handleSalvar = async (status: "RASCUNHO" | "APROVADO" = "RASCUNHO") => {
    setSaving(true);
    setError("");

    try {
      const body: any = {
        obraId: obraId || undefined,
        data: data || new Date().toISOString(),
        responsavelId: engenheiroId || undefined,
        numero: rdoNumero ? parseInt(rdoNumero) : undefined,
        climaManha: mapClimaToEnum(climaManha),
        climaTarde: mapClimaToEnum(climaTarde),
        temperaturaManha: tempManha ? parseFloat(tempManha) : undefined,
        temperaturaTarde: tempTarde ? parseFloat(tempTarde) : undefined,
        assinaturaNome: nomeAssinatura || engenheiro,
        assinaturaCrea: crea || undefined,
        assinaturaImagem: assinado ? getSignatureDataUrl() : undefined,
        status,
        observacoes: `RDO gerado em ${new Date().toLocaleDateString("pt-BR")} - ${atividades.length} atividades, ${efetivo.length} funções`,
      };

      const efetivosPayload = efetivo.map((e) => ({
        funcao: e.funcao,
        quantidadePresente: e.presente,
        quantidadeAusente: e.ausente,
        quantidadeFaltaJustificada: e.faltaJustificada,
      }));

      const atividadesPayload = atividades.map((a) => ({
        descricao: a.descricao,
        etapa: a.etapa,
        percentualExecutado: a.percentual,
        etapaId: null,
      }));

      let res: Response;
      if (isEditing) {
        // For edits, use the PUT endpoint
        res = await fetch(`/api/rdo/${rdoId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } else {
        // For new RDOs, create via the POST endpoint
        body.efetivos = efetivosPayload;
        body.atividades = atividadesPayload;
        body.status = status;

        res = await fetch("/api/rdo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      }

      const dataRes = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(dataRes.error || "Erro ao salvar RDO");

      router.push("/rdo");
    } catch (e: any) {
      setError(e.message || "Erro ao salvar RDO");
    } finally {
      setSaving(false);
    }
  };

  // Totais
  const totalPrevisto = efetivo.reduce((sum, row) => sum + row.previsto, 0);
  const totalPresente = efetivo.reduce((sum, row) => sum + row.presente, 0);
  const totalFalta = efetivo.reduce((sum, row) => sum + row.faltaJustificada, 0);
  const totalAusente = efetivo.reduce((sum, row) => sum + row.ausente, 0);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center text-[13px] text-[#68727d]">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Carregando RDO...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f7f9] pb-12">
      {/* Breadcrumb */}
      <div className="mb-6 flex items-center gap-2">
        <button onClick={() => router.push("/rdo")} className="flex items-center gap-1 text-[12px] text-[#64707c] hover:text-[#17212b] transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" />
          Voltar
        </button>
        <span className="text-[#d1d5db]">|</span>
        <nav className="flex items-center gap-2 text-[12px] text-[#64707c]">
          <span className="hover:text-[#17212b] cursor-pointer">Obras</span>
          <span>›</span>
          <span className="hover:text-[#17212b] cursor-pointer">RDO</span>
          <span>›</span>
          <span className="font-semibold text-[#17212b]">{isEditing ? `RDO #${rdoNumero}` : "Novo RDO"}</span>
        </nav>
      </div>

      {/* Título */}
      <div className="mb-8">
        <h1 className="text-[26px] font-bold text-[#17212b] tracking-tight">
          {isEditing ? `RDO #${rdoNumero} — ${new Date(data).toLocaleDateString("pt-BR")}` : `Novo RDO — ${new Date(data + "T12:00:00").toLocaleDateString("pt-BR")}`}
        </h1>
        <p className="mt-1 text-[14px] text-[#64707c]">Registre as informações diárias da obra</p>
      </div>

      {error && (
        <div className="mb-4 rounded-[4px] border border-red-200 bg-red-50 p-3 text-[13px] font-semibold text-red-700">
          {error}
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-6">
        {/* ─── COLUNA ESQUERDA ─── */}
        <div className="space-y-6">
          {/* Card 1: Identificação */}
          <Card numero={1} titulo="IDENTIFICAÇÃO" icone={<Building2 className="h-5 w-5 text-[#ff5a00]" />}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Obra - Dropdown */}
              <div className="relative">
                <label className="block text-[12px] font-medium text-[#64707c] mb-1.5">Obra</label>
                {carregandoObras ? (
                  <div className="flex h-[42px] items-center text-[13px] text-[#9aa3ad]">
                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                    Carregando...
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => setShowObraDropdown(!showObraDropdown)}
                      className="flex h-[42px] w-full items-center justify-between rounded-[6px] border border-[#e5e7eb] bg-white px-3 text-[13px] text-[#374151]"
                    >
                      <span className="truncate">{obraNome || "Selecione uma obra..."}</span>
                      <ChevronDown className="h-4 w-4 text-[#9aa3ad] shrink-0" />
                    </button>
                    {showObraDropdown && (
                      <div className="absolute z-20 mt-1 w-full rounded-[6px] border border-[#e5e7eb] bg-white shadow-lg max-h-48 overflow-y-auto">
                        {obras.map((o) => (
                          <button
                            key={o.id}
                            onClick={() => {
                              setObraId(o.id);
                              setObraNome(o.nome);
                              setShowObraDropdown(false);
                            }}
                            className={cn(
                              "flex w-full items-center px-3 py-2 text-[13px] hover:bg-[#f3f4f6] text-left",
                              obraId === o.id ? "text-[#ff5a00] font-medium" : "text-[#374151]"
                            )}
                          >
                            {obraId === o.id && <Check className="mr-2 h-4 w-4 shrink-0" />}
                            <span className="truncate">{o.nome}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
              <div>
                <label className="block text-[12px] font-medium text-[#64707c] mb-1.5">Data</label>
                <div className="relative">
                  <Input
                    type="date"
                    value={data}
                    onChange={(e) => setData(e.target.value)}
                    className="h-[42px] bg-white border-[#e5e7eb] text-[13px] text-[#374151] rounded-[6px] pr-10"
                  />
                  <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9aa3ad] pointer-events-none" />
                </div>
              </div>
              <div className="relative">
                <label className="block text-[12px] font-medium text-[#64707c] mb-1.5">Engenheiro responsável</label>
                <button
                  onClick={() => setShowEngDropdown(!showEngDropdown)}
                  className="flex h-[42px] w-full items-center justify-between rounded-[6px] border border-[#e5e7eb] bg-white px-3 text-[13px] text-[#374151]"
                >
                  <span className="truncate">{engenheiro || "Selecione..."}</span>
                  <ChevronDown className="h-4 w-4 text-[#9aa3ad] shrink-0" />
                </button>
                {showEngDropdown && (
                  <div className="absolute z-20 mt-1 w-full rounded-[6px] border border-[#e5e7eb] bg-white shadow-lg max-h-48 overflow-y-auto">
                    {engenheiros.map((e) => (
                      <button
                        key={e.id}
                        onClick={() => {
                          setEngenheiro(e.name);
                          setEngenheiroId(e.id);
                          setNomeAssinatura(e.name);
                          setShowEngDropdown(false);
                        }}
                        className={cn(
                          "flex w-full items-center px-3 py-2 text-[13px] hover:bg-[#f3f4f6]",
                          engenheiro === e.name ? "text-[#ff5a00] font-medium" : "text-[#374151]"
                        )}
                      >
                        {engenheiro === e.name && <Check className="mr-2 h-4 w-4 shrink-0" />}
                        {e.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-[12px] font-medium text-[#64707c] mb-1.5">RDO n°</label>
                <Input
                  value={rdoNumero}
                  onChange={(e) => setRdoNumero(e.target.value)}
                  className="h-[42px] bg-[#f3f4f6] border-[#e5e7eb] text-[13px] text-[#374151] rounded-[6px]"
                  placeholder="Automático"
                />
              </div>
            </div>
          </Card>

          {/* Card 3: Efetivo Presente */}
          <Card numero={3} titulo="EFETIVO PRESENTE" icone={<Users className="h-5 w-5 text-[#ff5a00]" />}>
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-[#e5e7eb]">
                    <th className="py-2.5 px-3 text-left text-[12px] font-semibold text-[#374151]">Função</th>
                    <th className="py-2.5 px-3 text-center text-[12px] font-semibold text-[#374151]">Previsto</th>
                    <th className="py-2.5 px-3 text-center text-[12px] font-semibold text-[#374151]">Presente</th>
                    <th className="py-2.5 px-3 text-center text-[12px] font-semibold text-[#374151]">Falta Justificada</th>
                    <th className="py-2.5 px-3 text-center text-[12px] font-semibold text-[#374151]">Ausente</th>
                  </tr>
                </thead>
                <tbody>
                  {efetivo.map((row, idx) => (
                    <tr key={idx} className="border-b border-[#f3f4f6]">
                      <td className="py-2.5 px-3 text-[#374151]">{row.funcao}</td>
                      <td className="py-2.5 px-3 text-center">
                        <input
                          type="number"
                          value={row.previsto}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 0;
                            setEfetivo(efetivo.map((r, i) => i === idx ? { ...r, previsto: val } : r));
                          }}
                          className="w-12 h-[32px] text-center rounded-[4px] border border-[#e5e7eb] text-[13px] text-[#374151] bg-white outline-none focus:border-[#ff5a00]"
                        />
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <input
                          type="number"
                          value={row.presente}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 0;
                            setEfetivo(efetivo.map((r, i) => i === idx ? { ...r, presente: val } : r));
                          }}
                          className="w-12 h-[32px] text-center rounded-[4px] border border-[#e5e7eb] text-[13px] text-[#374151] bg-white outline-none focus:border-[#ff5a00]"
                        />
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <input
                          type="number"
                          value={row.faltaJustificada}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 0;
                            setEfetivo(efetivo.map((r, i) => i === idx ? { ...r, faltaJustificada: val } : r));
                          }}
                          className="w-12 h-[32px] text-center rounded-[4px] border border-[#e5e7eb] text-[13px] text-[#374151] bg-white outline-none focus:border-[#ff5a00]"
                        />
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <input
                          type="number"
                          value={row.ausente}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 0;
                            setEfetivo(efetivo.map((r, i) => i === idx ? { ...r, ausente: val } : r));
                          }}
                          className="w-12 h-[32px] text-center rounded-[4px] border border-[#e5e7eb] text-[13px] text-[#374151] bg-white outline-none focus:border-[#ff5a00]"
                        />
                      </td>
                    </tr>
                  ))}
                  {efetivo.length > 0 && (
                    <tr className="bg-[#fff7f0]">
                      <td className="py-3 px-3 font-bold text-[#ff5a00] text-[13px]">TOTAL</td>
                      <td className="py-3 px-3 text-center font-bold text-[#ff5a00] text-[13px]">{totalPrevisto}</td>
                      <td className="py-3 px-3 text-center font-bold text-[#ff5a00] text-[13px]">{totalPresente}</td>
                      <td className="py-3 px-3 text-center font-bold text-[#ff5a00] text-[13px]">{totalFalta}</td>
                      <td className="py-3 px-3 text-center font-bold text-[#ff5a00] text-[13px]">{totalAusente}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {efetivo.length === 0 && (
              <p className="text-[13px] text-[#9aa3ad] text-center py-4">Nenhuma função cadastrada. Adicione abaixo.</p>
            )}
            <div className="mt-3 flex items-center gap-2">
              <input
                type="text"
                value={novaFuncao}
                onChange={(e) => setNovaFuncao(e.target.value)}
                placeholder="Nova função..."
                className="h-[36px] flex-1 rounded-[4px] border border-[#e5e7eb] px-3 text-[13px] text-[#374151] outline-none focus:border-[#ff5a00]"
                onKeyDown={(e) => e.key === "Enter" && handleAddFuncao()}
              />
              <Button
                onClick={handleAddFuncao}
                variant="outline"
                className="h-[36px] border-[#ff5a00] text-[#ff5a00] hover:bg-[#fff7f0] text-[13px] font-medium"
              >
                <Plus className="h-4 w-4 mr-1" /> Adicionar função
              </Button>
            </div>
          </Card>

          {/* Card 5: Fotos do Dia */}
          <Card numero={5} titulo="FOTOS DO DIA" icone={<Camera className="h-5 w-5 text-[#ff5a00]" />}>
            <div className="flex justify-between items-center mb-3">
              <span className="text-[12px] text-[#64707c]">{fotos.length}/10 fotos</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {fotos.map((foto) => (
                <div key={foto.id} className="relative group rounded-[8px] overflow-hidden border border-[#e5e7eb] bg-white">
                  <img src={foto.src} alt={foto.legenda} className="w-full h-[120px] object-cover" />
                  <button
                    onClick={() => handleRemoveFoto(foto.id)}
                    className="absolute top-2 right-2 h-6 w-6 rounded-full bg-white/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow-sm"
                  >
                    <Trash2 className="h-3 w-3 text-red-500" />
                  </button>
                  <p className="px-2 py-1.5 text-[11px] text-[#64707c] truncate">{foto.legenda}</p>
                </div>
              ))}
              {fotos.length < 10 && (
                <button
                  onClick={handleAddFoto}
                  className="flex flex-col items-center justify-center rounded-[8px] border-2 border-dashed border-[#d1d5db] bg-[#f9fafb] h-[158px] hover:border-[#ff5a00] hover:bg-[#fff7f0] transition"
                >
                  <Camera className="h-8 w-8 text-[#9aa3ad] mb-1" />
                  <span className="text-[12px] text-[#9aa3ad]">+ Adicionar foto</span>
                </button>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
          </Card>
        </div>

        {/* ─── COLUNA DIREITA ─── */}
        <div className="space-y-6">
          {/* Card 2: Condições Climáticas */}
          <Card numero={2} titulo="CONDIÇÕES CLIMÁTICAS" icone={<CloudSun className="h-5 w-5 text-[#ff5a00]" />}>
            <div className="grid grid-cols-2 gap-6">
              {/* Manhã */}
              <div>
                <label className="block text-[12px] font-medium text-[#64707c] mb-2">Manhã</label>
                <div className="flex gap-2 mb-3">
                  {(["sol", "nublado", "chuva", "encoberto"] as const).map((tipo) => (
                    <button
                      key={tipo}
                      onClick={() => setClimaManha(tipo)}
                      className={cn(
                        "h-10 w-10 rounded-full flex items-center justify-center border-2 transition",
                        climaManha === tipo ? "border-[#ff5a00] bg-[#fff7f0]" : "border-[#e5e7eb] bg-white hover:border-[#ff5a00]/50"
                      )}
                    >
                      {tipo === "sol" && <Sun className="h-5 w-5 text-orange-400" />}
                      {tipo === "nublado" && <CloudSun className="h-5 w-5 text-gray-400" />}
                      {tipo === "chuva" && <CloudRain className="h-5 w-5 text-blue-400" />}
                      {tipo === "encoberto" && <Cloud className="h-5 w-5 text-gray-500" />}
                    </button>
                  ))}
                </div>
                <label className="block text-[12px] font-medium text-[#64707c] mb-1">Temperatura</label>
                <div className="relative">
                  <Input
                    type="number"
                    value={tempManha}
                    onChange={(e) => setTempManha(e.target.value)}
                    className="h-[42px] w-full pr-8 bg-white border-[#e5e7eb] text-[13px] text-[#374151] rounded-[6px]"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-[#9aa3ad]">°C</span>
                </div>
              </div>
              {/* Tarde */}
              <div>
                <label className="block text-[12px] font-medium text-[#64707c] mb-2">Tarde</label>
                <div className="flex gap-2 mb-3">
                  {(["sol", "nublado", "chuva", "encoberto"] as const).map((tipo) => (
                    <button
                      key={tipo}
                      onClick={() => setClimaTarde(tipo)}
                      className={cn(
                        "h-10 w-10 rounded-full flex items-center justify-center border-2 transition",
                        climaTarde === tipo ? "border-[#ff5a00] bg-[#fff7f0]" : "border-[#e5e7eb] bg-white hover:border-[#ff5a00]/50"
                      )}
                    >
                      {tipo === "sol" && <Sun className="h-5 w-5 text-orange-400" />}
                      {tipo === "nublado" && <CloudSun className="h-5 w-5 text-gray-400" />}
                      {tipo === "chuva" && <CloudRain className="h-5 w-5 text-blue-400" />}
                      {tipo === "encoberto" && <Cloud className="h-5 w-5 text-gray-500" />}
                    </button>
                  ))}
                </div>
                <label className="block text-[12px] font-medium text-[#64707c] mb-1">Temperatura</label>
                <div className="relative">
                  <Input
                    type="number"
                    value={tempTarde}
                    onChange={(e) => setTempTarde(e.target.value)}
                    className="h-[42px] w-full pr-8 bg-white border-[#e5e7eb] text-[13px] text-[#374151] rounded-[6px]"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-[#9aa3ad]">°C</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Card 4: Atividades Executadas */}
          <Card numero={4} titulo="ATIVIDADES EXECUTADAS" icone={<ClipboardList className="h-5 w-5 text-[#ff5a00]" />}>
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-[#e5e7eb]">
                    <th className="py-2.5 px-3 text-left text-[12px] font-semibold text-[#374151]">Etapa</th>
                    <th className="py-2.5 px-3 text-left text-[12px] font-semibold text-[#374151]">Descrição</th>
                    <th className="py-2.5 px-3 text-center text-[12px] font-semibold text-[#374151]">% exec. hoje</th>
                    <th className="py-2.5 px-3 text-center text-[12px] font-semibold text-[#374151]">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {atividades.map((at) => (
                    <tr key={at.id} className="border-b border-[#f3f4f6]">
                      <td className="py-2.5 px-3 text-[#374151] font-medium">{at.etapa}</td>
                      <td className="py-2.5 px-3 text-[#64707c]">{at.descricao}</td>
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <input
                            type="number"
                            value={at.percentual}
                            onChange={(e) => {
                              const val = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                              setAtividades(atividades.map(a => a.id === at.id ? { ...a, percentual: val } : a));
                            }}
                            className="w-12 h-[32px] text-center rounded-[4px] border border-[#e5e7eb] text-[13px] text-[#374151] bg-white outline-none focus:border-[#ff5a00]"
                          />
                          <span className="text-[12px] text-[#9aa3ad]">%</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button onClick={() => handleRemoveAtividade(at.id)} className="p-1 hover:bg-red-50 rounded">
                          <Trash2 className="h-4 w-4 text-red-400 hover:text-red-600" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {atividades.length === 0 && (
              <p className="text-[13px] text-[#9aa3ad] text-center py-4">Nenhuma atividade registrada.</p>
            )}
            {/* Adicionar atividade */}
            {!showAddAtividade ? (
              <button
                onClick={() => setShowAddAtividade(true)}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-[6px] border-2 border-dashed border-[#ff5a00]/40 py-3 text-[13px] font-medium text-[#ff5a00] hover:bg-[#fff7f0] transition"
              >
                <Plus className="h-4 w-4" /> Adicionar atividade
              </button>
            ) : (
              <div className="mt-3 space-y-2 rounded-[6px] border border-[#e5e7eb] bg-white p-3">
                <input
                  value={novaEtapa}
                  onChange={(e) => setNovaEtapa(e.target.value)}
                  placeholder="Etapa"
                  className="h-[36px] w-full rounded-[4px] border border-[#e5e7eb] px-3 text-[13px] text-[#374151] outline-none focus:border-[#ff5a00]"
                />
                <input
                  value={novaDescricao}
                  onChange={(e) => setNovaDescricao(e.target.value)}
                  placeholder="Descrição"
                  className="h-[36px] w-full rounded-[4px] border border-[#e5e7eb] px-3 text-[13px] text-[#374151] outline-none focus:border-[#ff5a00]"
                />
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={novoPercentual}
                    onChange={(e) => setNovoPercentual(e.target.value)}
                    placeholder="%"
                    className="h-[36px] w-24 rounded-[4px] border border-[#e5e7eb] px-3 text-[13px] text-[#374151] outline-none focus:border-[#ff5a00]"
                  />
                  <Button onClick={handleAddAtividade} className="h-[36px] bg-[#ff5a00] text-white hover:bg-[#ef5200]">
                    <Plus className="h-4 w-4 mr-1" /> Adicionar
                  </Button>
                  <Button onClick={() => setShowAddAtividade(false)} variant="outline" className="h-[36px]">Cancelar</Button>
                </div>
              </div>
            )}
          </Card>

          {/* Card 6: Assinatura Digital */}
          <Card numero={6} titulo="ASSINATURA DIGITAL" icone={<Pen className="h-5 w-5 text-[#ff5a00]" />}>
            <div className="grid grid-cols-1 md:grid-cols-[1fr_280px] gap-4">
              <div className="relative">
                <canvas
                  ref={canvasRef}
                  width={300}
                  height={120}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="w-full h-[120px] rounded-[6px] border border-dashed border-[#d1d5db] bg-[#f9fafb] touch-none"
                  style={{ cursor: "crosshair" }}
                />
                {!assinado && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="flex flex-col items-center text-[#9aa3ad]">
                      <Pen className="h-5 w-5 mb-1" />
                      <span className="text-[12px]">Assine aqui</span>
                    </span>
                  </div>
                )}
                <div className="flex gap-2 mt-2">
                  <Button onClick={clearSignature} variant="outline" size="sm" className="text-[11px] h-7">
                    Limpar
                  </Button>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-[12px] font-medium text-[#64707c] mb-1.5">CREA</label>
                  <Input
                    value={crea}
                    onChange={(e) => setCrea(e.target.value)}
                    placeholder="CREA/SP 123456-D"
                    className="h-[42px] bg-white border-[#e5e7eb] text-[13px] text-[#374151] rounded-[6px]"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[#64707c] mb-1.5">Nome</label>
                  <Input
                    value={nomeAssinatura}
                    onChange={(e) => setNomeAssinatura(e.target.value)}
                    placeholder="Nome do responsável"
                    className="h-[42px] bg-white border-[#e5e7eb] text-[13px] text-[#374151] rounded-[6px]"
                  />
                </div>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <button
                onClick={() => setConfirmado(!confirmado)}
                className={cn(
                  "flex h-5 w-5 items-center justify-center rounded border-2 transition",
                  confirmado ? "border-[#ff5a00] bg-[#ff5a00]" : "border-[#d1d5db] bg-white"
                )}
              >
                {confirmado && <Check className="h-3 w-3 text-white" />}
              </button>
              <span className="text-[12px] text-[#64707c]">Confirmo que as informações acima são verdadeiras</span>
            </div>
          </Card>
        </div>
      </div>

      {/* Rodapé - Botões */}
      <div className="mt-8 flex items-center justify-between gap-3">
        <Button
          variant="outline"
          onClick={() => router.push("/rdo")}
          className="h-[44px] px-6 border-[#d1d5db] text-[#374151] text-[14px] font-medium rounded-[6px]"
        >
          Cancelar
        </Button>
        <div className="flex items-center gap-3">
          <span className="text-[12px] text-[#9aa3ad]">Rascunho salvo automaticamente</span>
          <Button
            variant="outline"
            onClick={() => handleSalvar("RASCUNHO")}
            disabled={saving}
            className="h-[44px] px-6 border-[#d1d5db] text-[#374151] text-[14px] font-medium rounded-[6px]"
          >
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Salvar Rascunho
          </Button>
          <Button
            onClick={() => handleSalvar("APROVADO")}
            disabled={saving || !confirmado}
            className="h-[44px] px-6 bg-[#ff5a00] text-white text-[14px] font-medium rounded-[6px] hover:bg-[#ef5200] shadow-[0_4px_12px_rgba(255,90,0,.2)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Assinar e Finalizar RDO
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Card Component ───
function Card({
  numero,
  titulo,
  icone,
  children,
}: {
  numero: number;
  titulo: string;
  icone: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[8px] border border-[#e5e7eb] bg-white shadow-[0_1px_3px_rgba(0,0,0,.04)]">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-[#f3f4f6]">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#ff5a00] text-white text-[12px] font-bold">
          {numero}
        </div>
        <div className="flex items-center gap-2">
          {icone}
          <span className="text-[14px] font-bold text-[#17212b] tracking-wide">{titulo}</span>
        </div>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}