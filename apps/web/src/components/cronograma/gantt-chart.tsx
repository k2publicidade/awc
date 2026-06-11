"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface Etapa {
  id: string; nome: string; ordem: number; dataInicio?: string; dataFim?: string;
  percentualPrevisto: number; percentualRealizado: number;
  dataInicioReal?: string; dataFimReal?: string;
}

interface GanttChartProps { etapas: Etapa[]; onUpdateEtapa: (id: string, data: any) => void }

export function GanttChart({ etapas, onUpdateEtapa }: GanttChartProps) {
  const [editId, setEditId] = useState<string | null>(null);
  const [editPercent, setEditPercent] = useState(0);

  const { minDate, maxDate, totalDays } = useMemo(() => {
    const allDates = etapas.flatMap((e: Etapa) => [e.dataInicio, e.dataFim].filter(Boolean) as string[]);
    if (allDates.length === 0) return { minDate: new Date(), maxDate: new Date(), totalDays: 30 };
    const mins = allDates.map((d: string) => new Date(d).getTime());
    const min = new Date(Math.min(...mins));
    const max = new Date(Math.max(...mins));
    min.setDate(min.getDate() - 7);
    max.setDate(max.getDate() + 14);
    return { minDate: min, maxDate: max, totalDays: Math.ceil((max.getTime() - min.getTime()) / 86400000) };
  }, [etapas]);

  const months = useMemo(() => {
    const result: { label: string; startDay: number; width: number }[] = [];
    const d = new Date(minDate);
    while (d <= maxDate) {
      const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
      const startDay = Math.max(0, Math.ceil((monthStart.getTime() - minDate.getTime()) / 86400000));
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      const endDay = Math.min(totalDays, Math.ceil((monthEnd.getTime() - minDate.getTime()) / 86400000));
      result.push({ label: monthStart.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }), startDay, width: endDay - startDay });
      d.setMonth(d.getMonth() + 1);
    }
    return result;
  }, [minDate, maxDate, totalDays]);

  const todayDay = Math.ceil((Date.now() - minDate.getTime()) / 86400000);
  const dayWidth = 3;
  const rowHeight = 36;

  const getBarStyle = (etapa: Etapa) => {
    if (!etapa.dataInicio || !etapa.dataFim) return { left: 0, width: 0 };
    const start = Math.max(0, Math.ceil((new Date(etapa.dataInicio).getTime() - minDate.getTime()) / 86400000));
    const end = Math.min(totalDays, Math.ceil((new Date(etapa.dataFim).getTime() - minDate.getTime()) / 86400000));
    return { left: start * dayWidth, width: (end - start) * dayWidth };
  };

  const startEdit = (etapa: Etapa) => { setEditId(etapa.id); setEditPercent(etapa.percentualRealizado); };
  const saveEdit = () => { if (editId) { onUpdateEtapa(editId, { percentualRealizado: editPercent }); setEditId(null); } };

  return (
    <div className="min-w-[800px]">
      {/* Month headers */}
      <div className="flex border-b border-gray-200 pb-1 mb-2" style={{ paddingLeft: 180 }}>
        {months.map((m, i) => (
          <div key={i} className="text-xs text-awc-gray font-medium text-center border-l border-gray-100 px-1"
            style={{ width: m.width * dayWidth, minWidth: m.width * dayWidth }}>
            {m.label}
          </div>
        ))}
      </div>

      {/* Rows */}
      <div className="space-y-1">
        {etapas.map((etapa) => {
          const bar = getBarStyle(etapa);
          const desvio = etapa.percentualRealizado - etapa.percentualPrevisto;
          const barColor = desvio >= -5 ? "bg-awc-success" : desvio >= -15 ? "bg-awc-warning" : "bg-awc-danger";
          const realWidth = bar.width * (etapa.percentualRealizado / 100);

          return (
            <div key={etapa.id} className="flex items-center" style={{ height: rowHeight }}>
              {/* Label */}
              <div className="flex-shrink-0 w-[180px] pr-3 flex items-center gap-2" style={{ height: rowHeight }}>
                <span className="text-xs text-awc-gray font-mono w-5">{etapa.ordem}</span>
                <span className="text-sm font-medium text-awc-dark truncate flex-1">{etapa.nome}</span>
              </div>

              {/* Bar area */}
              <div className="relative flex-1" style={{ height: rowHeight }}>
                {/* Today line */}
                {todayDay >= 0 && todayDay <= totalDays && (
                  <div className="absolute top-0 bottom-0 w-0.5 bg-awc-danger/40 z-10" style={{ left: todayDay * dayWidth }} />
                )}
                {/* Baseline bar */}
                <div className="absolute top-2 rounded bg-awc-gray/20" style={{ left: bar.left, width: bar.width, height: 12 }} />
                {/* Real progress bar */}
                <div className={cn("absolute top-2 rounded", barColor)} style={{ left: bar.left, width: realWidth, height: 12 }} />
                {/* Percent label */}
                <div className="absolute text-xs font-medium" style={{ left: bar.left + bar.width + 4, top: 2 }}>
                  <span className={cn(desvio < -10 ? "text-awc-danger" : desvio < 0 ? "text-awc-warning" : "text-awc-success")}>
                    {etapa.percentualRealizado}%
                  </span>
                </div>
                {/* Click to edit */}
                <div className="absolute cursor-pointer hover:bg-awc-orange/10 rounded" style={{ left: bar.left, width: bar.width, top: 0, height: rowHeight }}
                  onClick={() => startEdit(etapa)} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit modal */}
      {editId && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setEditId(null)}>
          <div className="bg-white rounded-xl p-6 shadow-xl w-80" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-heading font-semibold text-awc-dark mb-4">Atualizar Progresso</h3>
            <label className="text-sm text-awc-gray">Percentual Realizado (%)</label>
            <input type="range" min={0} max={100} value={editPercent} onChange={(e) => setEditPercent(Number(e.target.value))}
              className="w-full mt-2 accent-awc-orange" />
            <p className="text-center text-2xl font-heading font-bold text-awc-dark mt-2">{editPercent}%</p>
            <div className="flex gap-2 mt-4">
              <Button variant="outline" className="flex-1" onClick={() => setEditId(null)}>Cancelar</Button>
              <Button className="flex-1 bg-awc-orange" onClick={saveEdit}>Salvar</Button>
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-6 mt-4 pt-3 border-t border-gray-100 text-xs text-awc-gray">
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-awc-gray/20" />Previsto</div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-awc-success" />No prazo</div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-awc-warning" />Em risco</div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-awc-danger" />Atrasado</div>
        <div className="flex items-center gap-1.5"><div className="w-0.5 h-3 bg-awc-danger/40" />Hoje</div>
      </div>
    </div>
  );
}
