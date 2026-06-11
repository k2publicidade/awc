import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generateRelatorioExecutivo } from "@/lib/reports/executivo";
import { generateBoletimMedicao } from "@/lib/reports/boletim-medicao";
import { generateRDOCompilado } from "@/lib/reports/rdo-compilado";
import { generateCurvaS } from "@/lib/reports/curva-s";
import { generateRelatorioQualidade } from "@/lib/reports/qualidade";
import { generateRelatorioSeguranca } from "@/lib/reports/seguranca";
import { generateRelatorioFinanceiro } from "@/lib/reports/financeiro";
import { generateDatabook } from "@/lib/reports/databook";

/**
 * GET /api/relatorios?type=executivo&obraId=xxx
 * Generates a report as HTML (ready for Puppeteer PDF conversion).
 * Query params:
 *   type: executivo | medicao | rdo | curva-s | qualidade | seguranca | financeiro | databook
 *   obraId: required for most reports
 *   medicaoId: required for type=medicao
 *   dataInicio / dataFim: required for type=rdo
 *   format: html (default) | pdf
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") || "executivo";
  const obraId = searchParams.get("obraId") || "";
  const format = searchParams.get("format") || "html";

  let html = "";

  try {
    switch (type) {
      case "executivo":
        html = await generateRelatorioExecutivo(obraId);
        break;
      case "medicao":
        const medicaoId = searchParams.get("medicaoId") || "";
        html = await generateBoletimMedicao(medicaoId);
        break;
      case "rdo":
        const dataInicio = searchParams.get("dataInicio") || new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
        const dataFim = searchParams.get("dataFim") || new Date().toISOString().split("T")[0];
        html = await generateRDOCompilado(obraId, dataInicio, dataFim);
        break;
      case "curva-s":
        html = await generateCurvaS(obraId);
        break;
      case "qualidade":
        html = await generateRelatorioQualidade(obraId);
        break;
      case "seguranca":
        html = await generateRelatorioSeguranca(obraId);
        break;
      case "financeiro":
        html = await generateRelatorioFinanceiro(obraId);
        break;
      case "databook":
        html = await generateDatabook(obraId);
        break;
      default:
        return NextResponse.json({ error: "Tipo de relatório inválido" }, { status: 400 });
    }

    if (format === "pdf") {
      // In production, use Puppeteer to convert HTML → PDF
      // For now, return HTML with PDF content-type hint
      return new NextResponse(html, {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Content-Disposition": `attachment; filename="relatorio-${type}.pdf"`,
        },
      });
    }

    return new NextResponse(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (error: any) {
    console.error("Report generation error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
