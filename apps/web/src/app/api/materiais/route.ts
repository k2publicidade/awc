import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const materiais = await prisma.material.findMany({
    include: { _count: { select: { estoqueMovimentos: true } } },
    orderBy: { descricao: "asc" },
  });

  // Saldo atual em uma única query agrupada (evita N+1 no pool de conexões)
  const movimentos = await prisma.estoqueMovimento.groupBy({
    by: ["materialId", "tipo"],
    _sum: { quantidade: true },
  });
  const saldo = new Map<string, number>();
  for (const mov of movimentos) {
    const atual = saldo.get(mov.materialId) || 0;
    const qtd = mov._sum.quantidade || 0;
    saldo.set(mov.materialId, mov.tipo === "ENTRADA" ? atual + qtd : atual - qtd);
  }
  const result = materiais.map((m) => {
    const estoqueAtual = saldo.get(m.id) || 0;
    return { ...m, estoqueAtual, estoqueMinimo: m.estoqueMinimo, alerta: estoqueAtual <= m.estoqueMinimo };
  });

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const body = await req.json();
  const material = await prisma.material.create({
    data: { codigo: body.codigo, descricao: body.descricao, unidade: body.unidade, estoqueMinimo: body.estoqueMinimo || 0, categoria: body.categoria || null, tenantId: (session.user as any).tenantId },
  });

  return NextResponse.json(material, { status: 201 });
}
