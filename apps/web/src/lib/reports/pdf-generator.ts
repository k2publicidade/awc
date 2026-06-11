/**
 * ObrasAWC PDF Generator
 * Uses Puppeteer to generate professional PDF reports with AWC branding.
 * For serverless environments, falls back to HTML-to-PDF with @react-pdf/renderer.
 */

export const AWC_COLORS = {
  orange: "#FF6B00", dark: "#1E2832", gray: "#4A5568",
  light: "#F7F8FA", white: "#FFFFFF",
  success: "#22C55E", warning: "#F59E0B", danger: "#EF4444", info: "#3B82F6",
};

export function reportHeader(title: string, obraNome?: string) {
  return `
    <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid ${AWC_COLORS.orange};padding-bottom:12px;margin-bottom:24px">
      <div>
        <div style="background:${AWC_COLORS.dark};display:inline-block;padding:8px 16px;border-radius:6px">
          <span style="color:${AWC_COLORS.orange};font-size:20px;font-weight:800">AWC</span>
          <span style="color:#fff;font-size:11px;margin-left:6px">Pré Moldados</span>
        </div>
        <h1 style="color:${AWC_COLORS.dark};font-size:18px;margin:8px 0 0 0;font-weight:700">${title}</h1>
        ${obraNome ? `<p style="color:${AWC_COLORS.gray};font-size:12px;margin:2px 0 0 0">Obra: ${obraNome}</p>` : ""}
      </div>
      <div style="text-align:right">
        <p style="color:${AWC_COLORS.gray};font-size:11px">Gerado em: ${new Date().toLocaleDateString("pt-BR")} ${new Date().toLocaleTimeString("pt-BR")}</p>
        <p style="color:${AWC_COLORS.gray};font-size:10px">ObrasAWC — Sistema de Gestão</p>
      </div>
    </div>
  `;
}

export function reportFooter() {
  return `
    <div style="border-top:1px solid #E5E7EB;padding-top:8px;margin-top:32px;display:flex;justify-content:space-between">
      <span style="color:${AWC_COLORS.gray};font-size:9px">AWC Pré Moldados — Documento gerado automaticamente pelo ObrasAWC</span>
      <span style="color:${AWC_COLORS.gray};font-size:9px">Página <span class="pageNumber"></span> de <span class="totalPages"></span></span>
    </div>
  `;
}

export function statusBadge(color: string, text: string) {
  return `<span style="background:${color};color:#fff;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:600">${text}</span>`;
}

export function progressBar(pct: number, width = 120) {
  const color = pct >= 100 ? AWC_COLORS.success : pct >= 70 ? AWC_COLORS.warning : AWC_COLORS.danger;
  return `<div style="width:${width}px;height:8px;background:#E5E7EB;border-radius:4px;overflow:hidden;display:inline-block;vertical-align:middle">
    <div style="width:${Math.min(pct, 100)}%;height:100%;background:${color};border-radius:4px"></div>
  </div> <span style="font-size:10px;font-weight:600;color:${color}">${pct.toFixed(0)}%</span>`;
}

export function formatCurrency(value: number | string | { toString(): string }) {
  const n = Number(value ?? 0);
  return `R$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function baseHtmlStyle() {
  return `
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif; font-size: 11px; color: ${AWC_COLORS.dark}; padding: 24px; background: #fff; }
      table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 10px; }
      th { background: ${AWC_COLORS.dark}; color: #fff; padding: 6px 8px; text-align: left; font-weight: 600; font-size: 9px; text-transform: uppercase; }
      td { padding: 5px 8px; border-bottom: 1px solid #E5E7EB; }
      tr:nth-child(even) td { background: ${AWC_COLORS.light}; }
      h2 { color: ${AWC_COLORS.dark}; font-size: 13px; font-weight: 700; margin: 16px 0 8px 0; padding-bottom: 4px; border-bottom: 1px solid #E5E7EB; }
      .metric-card { display: inline-block; background: ${AWC_COLORS.light}; border-radius: 8px; padding: 12px 16px; margin: 4px; min-width: 120px; }
      .metric-label { font-size: 9px; color: ${AWC_COLORS.gray}; text-transform: uppercase; letter-spacing: 0.5px; }
      .metric-value { font-size: 18px; font-weight: 700; color: ${AWC_COLORS.dark}; margin-top: 4px; }
      @page { margin: 16mm; size: A4; }
    </style>
  `;
}

export function wrapReport(content: string, title: string, obraNome?: string): string {
  return `<!DOCTYPE html><html><head>${baseHtmlStyle()}</head><body>
    ${reportHeader(title, obraNome)}
    ${content}
    ${reportFooter()}
  </body></html>`;
}
