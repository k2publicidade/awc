import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const obraId = searchParams.get("obraId");
  const where: any = {};
  if (obraId) where.obraId = obraId;

  const [aPagar, aReceber, nfs] = await Promise.all([
    prisma.lancamentoFinanceiro.findMany({ where: { ...where, tipo: "DESPESA" }, include: { obra: { select: { nome: true } } }, orderBy: { dataVencimento: "asc" } }),
    prisma.lancamentoFinanceiro.findMany({ where: { ...where, tipo: "RECEITA" }, include: { obra: { select: { nome: true } } }, orderBy: { dataVencimento: "asc" } }),
    prisma.notaFiscal.findMany({ where, orderBy: { dataEmissao: "desc" } }),
  ]);

  const totalAPagar = aPagar.filter(l => l.status === "ABERTO" || l.status === "VENCIDO").reduce((s, l) => s + Number(l.valor), 0);
  const totalAReceber = aReceber.filter(l => l.status === "ABERTO").reduce((s, l) => s + Number(l.valor), 0);
  const totalVencido = aPagar.filter(l => l.status === "VENCIDO").reduce((s, l) => s + Number(l.valor), 0);

  return NextResponse.json({ aPagar, aReceber, nfs, totalAPagar, totalAReceber, totalVencido });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const body = await req.json();
  const lancamento = await prisma.lancamentoFinanceiro.create({
    data: {
      tipo: body.tipo, descricao: body.descricao, valor: parseFloat(body.valor),
      dataVencimento: new Date(body.vencimento || body.dataVencimento),
      status: body.status || "ABERTO",
      obraId: body.obraId, categoria: body.categoria || null,
      fornecedorId: body.fornecedorId || null, nfNumero: body.nfNumero || null,
    },
  });

  return NextResponse.json(lancamento, { status: 201 });
}
