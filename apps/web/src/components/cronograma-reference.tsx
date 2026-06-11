import { Button } from "@/components/ui/button";
import { CalendarDays, ChevronDown, ChevronRight, Plus, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

const rows = [
  { name: "1. Fundações e Terraplanagem", level: 0, open: true, pct: 45, tone: "green" },
  { name: "1.1  Locação e terraplanagem", level: 1, pct: 100, tone: "green" },
  { name: "1.2  Escavação de blocos", level: 1, pct: 60, tone: "green" },
  { name: "1.3  Concretagem de blocos", level: 1, pct: 0, tone: "gray" },
  { name: "2. Montagem de Pilares", level: 0, open: true, pct: 20, tone: "orange" },
  { name: "2.1  Montagem pilares eixo A", level: 1, pct: 35, tone: "orange" },
  { name: "2.2  Montagem pilares eixo B", level: 1, pct: 5, tone: "orange" },
  { name: "3. Montagem de Vigas", level: 0, open: false, pct: 0, tone: "gray" },
  { name: "4. Laje Pré-Moldada", level: 0, open: false, pct: 0, tone: "gray" },
  { name: "5. Fechamento e Cobertura", level: 0, open: false, pct: 0, tone: "gray" },
  { name: "6. Instalações", level: 0, open: false, pct: 0, tone: "gray" },
  { name: "7. Acabamento e Entrega", level: 0, open: false, pct: 0, tone: "gray" },
];

const months = [
  { label: "Jan 2026", days: ["05", "12", "19", "26"] },
  { label: "Fev 2026", days: ["02", "09", "16", "23"] },
  { label: "Mar 2026", days: ["02", "09", "16", "23", "30"] },
  { label: "Abr 2026", days: ["06", "13", "20", "27"] },
  { label: "Mai 2026", days: ["04", "11", "18", "25"] },
  { label: "Jun 2026", days: ["01", "08", "15", "22", "29"] },
  { label: "Jul 2026", days: ["06", "13", "20", "27"] },
];

const bars = [
  { row: 0, left: 2, width: 39, color: "green", fade: true, depTo: [43, 165] },
  { row: 1, left: 2, width: 15, color: "green", depTo: [22, 70] },
  { row: 2, left: 13.5, width: 11, color: "green", depTo: [28, 103] },
  { row: 3, left: 23.5, width: 9.5, color: "gray" },
  { row: 4, left: 24, width: 27.5, color: "orange", fade: true, depTo: [56, 165] },
  { row: 5, left: 29.5, width: 11.5, color: "orange", depTo: [45, 125], tooltip: true },
  { row: 6, left: 39, width: 3, color: "orange", depTo: [49, 156] },
  { row: 7, left: 36.5, width: 20.5, color: "gray", baseline: true, depTo: [60, 190] },
  { row: 8, left: 46.5, width: 20.5, color: "gray", baseline: true, depTo: [72, 220] },
  { row: 9, left: 51, width: 24, color: "gray", baseline: true, depTo: [80, 252] },
  { row: 10, left: 62, width: 20.5, color: "gray", baseline: true, depTo: [86, 280] },
  { row: 11, left: 76, width: 13.5, color: "gray", baseline: true },
];

function ProgressCircle({ pct, tone }: { pct: number; tone: string }) {
  const color = tone === "green" ? "#20b55b" : tone === "orange" ? "#ff5a00" : "#cfd5dc";
  return (
    <div className="relative grid h-8 w-8 place-items-center rounded-full bg-white text-[9px] font-black text-[#202b36] shadow-[inset_0_0_0_2px_#d6dbe1]">
      <div className="absolute inset-0 rounded-full" style={{ background: `conic-gradient(${color} ${pct * 3.6}deg, transparent 0)` }} />
      <div className="absolute inset-[3px] rounded-full bg-white" />
      <span className="relative">{pct}%</span>
    </div>
  );
}

function Bar({ bar }: { bar: (typeof bars)[number] }) {
  const cls = bar.color === "green" ? "bg-[#20b55b]" : bar.color === "orange" ? "bg-[#ff5a00]" : "bg-[#bfc5cb]";
  return (
    <>
      {bar.baseline && <div className="absolute h-[2px] border-t border-dashed border-[#202b36]/70" style={{ left: `${bar.left}%`, top: bar.row * 38 + 27, width: `${bar.width}%` }} />}
      <div className="absolute h-[18px] rounded-[2px]" style={{ left: `${bar.left}%`, top: bar.row * 38 + 17, width: `${bar.width}%` }}>
        <div className={cn("h-full rounded-[2px] shadow-[0_2px_4px_rgba(0,0,0,.06)]", cls)} />
        {bar.fade && <div className={cn("absolute right-0 top-0 h-full w-[40%] rounded-r-[2px] opacity-25", cls)} />}
      </div>
      {bar.depTo && <Dependency row={bar.row} left={bar.left + bar.width} x2={bar.depTo[0]} h={bar.depTo[1]} />}
      {bar.tooltip && <Tooltip />}
    </>
  );
}

function Dependency({ row, left, x2, h }: { row: number; left: number; x2: number; h: number }) {
  const top = row * 38 + 35;
  return <div className="absolute border-r border-t border-[#89939e]" style={{ left: `${left}%`, top, width: `${Math.max(x2 / 10, 3)}%`, height: h / 5 }}><span className="absolute -bottom-1 -right-[3px] h-0 w-0 border-l-[4px] border-r-[4px] border-t-[5px] border-l-transparent border-r-transparent border-t-[#89939e]" /></div>;
}

function Tooltip() {
  return (
    <div className="absolute z-10 w-[190px] rounded-[6px] border border-[#e0e5ea] bg-white p-4 text-[12px] shadow-[0_12px_30px_rgba(23,33,43,.16)]" style={{ left: "22%", top: 220 }}>
      <p className="mb-2 text-[13px] font-black text-[#1f2a35]">Montagem Pilares Eixo A</p>
      <p className="mb-2 text-[#51606d]">▣&nbsp; 15 Mar&nbsp; → &nbsp;20 Mai</p>
      <p className="mb-2 text-[#51606d]">Responsável: José Santos</p>
      <p className="mb-2 font-black text-[#ff5a00]">35% <span className="font-medium text-[#51606d]">concluído</span></p>
      <p className="flex items-center gap-2 font-black text-[#ff2b1d]"><AlertTriangle className="h-4 w-4" />5 dias de atraso</p>
    </div>
  );
}

export function CronogramaReference() {
  return (
    <div className="h-full w-full text-[#1e2a35]">
      <div className="mb-5 flex items-center gap-3 text-[12px] font-medium text-[#52606d]">
        <span>Obras</span><ChevronRight className="h-3.5 w-3.5" /><span>Galpão Logístico Suzano</span><ChevronRight className="h-3.5 w-3.5" /><span>Cronograma</span>
      </div>

      <div className="mb-5 flex items-start justify-between gap-5">
        <div>
          <h1 className="font-['Arial_Narrow',Arial,sans-serif] text-[32px] font-black uppercase leading-none tracking-[-.045em] text-[#1a2b3a]">CRONOGRAMA — GALPÃO LOGÍSTICO SUZANO</h1>
          <div className="mt-6 flex gap-12 border-b border-[#d9dfe6] text-[14px] font-bold text-[#4c5864]">
            {['Gantt', 'Físico-Financeiro', 'Versões', 'Curva S'].map((tab, index) => <button key={tab} className={cn("pb-3", index === 0 ? "border-b-2 border-[#ff5a00] text-[#1a2b3a]" : "")}>{tab}</button>)}
          </div>
        </div>
        <div className="flex items-center gap-4 pt-2">
          <Button className="h-[40px] rounded-[4px] bg-[#ff5a00] px-5 text-[14px] font-bold text-white hover:bg-[#ec5200]"><Plus className="mr-2 h-4 w-4" />Etapa</Button>
          <Button variant="outline" className="h-[40px] rounded-[4px] border-[#d9dfe6] bg-white px-6 text-[14px] font-semibold text-[#3d4852]">Exportar <ChevronDown className="ml-4 h-4 w-4" /></Button>
          <Button variant="outline" className="h-[40px] rounded-[4px] border-[#d9dfe6] bg-white px-5 text-[14px] font-semibold text-[#3d4852]">Baseline: v1 (Jan/26)<CalendarDays className="ml-4 h-4 w-4" /></Button>
        </div>
      </div>

      <section className="overflow-hidden rounded-[5px] border border-[#dfe5eb] bg-white shadow-[0_6px_18px_rgba(23,33,43,.08)]">
        <div className="grid grid-cols-[320px_1fr]">
          <div className="grid h-[64px] grid-cols-[1fr_80px] border-b border-r border-[#dfe5eb] bg-white px-5 text-[12px] font-black text-[#1f2a35]">
            <div className="flex items-center">Etapas / Sub-etapas</div><div className="flex items-center justify-end">Avanço</div>
          </div>
          <div className="h-[64px] border-b border-[#dfe5eb] bg-white">
            <div className="grid h-8" style={{ gridTemplateColumns: "repeat(7, 1fr)" }}>{months.map((m) => <div key={m.label} className="flex items-end justify-center pb-1 text-[13px] font-black text-[#26323d]">{m.label}</div>)}</div>
            <div className="grid h-8" style={{ gridTemplateColumns: `repeat(${months.reduce((a, m) => a + m.days.length, 0)}, 1fr)` }}>{months.flatMap((m) => m.days).map((d, i) => <div key={`${d}-${i}`} className="text-center text-[10px] font-semibold text-[#5a6671]">{d}</div>)}</div>
          </div>

          <div className="border-r border-[#dfe5eb]">
            {rows.map((row, i) => <div key={row.name} className="grid h-[38px] grid-cols-[1fr_80px] items-center border-b border-[#e9edf1] px-5 text-[12.5px]"><div className={cn("flex items-center gap-2 truncate", row.level === 0 ? "font-black text-[#202b36]" : "pl-7 font-medium text-[#43505b]")}>{row.level === 0 && (row.open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />)}<span>{row.name}</span></div><div className="flex justify-end"><ProgressCircle pct={row.pct} tone={row.tone} /></div></div>)}
          </div>

          <div className="relative overflow-hidden" style={{ height: rows.length * 38 }}>
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#e7ebef_1px,transparent_1px),linear-gradient(to_bottom,#e9edf1_1px,transparent_1px)] bg-[length:32px_38px]" />
            <div className="absolute bottom-0 top-0 border-l border-dashed border-[#ff2b1d]" style={{ left: "74%" }}><div className="absolute -top-2 -translate-x-2 text-[#ff2b1d]"><span className="block h-0 w-0 border-l-[6px] border-r-[6px] border-t-[12px] border-l-transparent border-r-transparent border-t-[#ff2b1d]" /><span className="absolute left-4 top-0 whitespace-nowrap text-[12px] font-black">08 Jun</span></div></div>
            {bars.map((bar, i) => <Bar key={i} bar={bar} />)}
          </div>
        </div>
        <div className="flex h-[56px] items-center gap-10 border-t border-[#dfe5eb] px-7 text-[14px] text-[#4d5964]">
          <span>7 etapas</span><span className="text-[#aab2ba]">|</span><span>23 sub-etapas</span><span className="text-[#aab2ba]">|</span><span>Avanço geral: <b className="text-[#ff5a00]">34%</b></span><span className="text-[#aab2ba]">|</span><span>Baseline: 52% esperado</span><span className="text-[#aab2ba]">|</span><span>Desvio: <b className="text-[#ff2b1d]">-18 dias</b></span>
        </div>
      </section>
    </div>
  );
}
