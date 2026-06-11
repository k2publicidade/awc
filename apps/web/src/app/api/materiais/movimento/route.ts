import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const materialId = searchParams.get("materialId");
  const obraId = searchParams.get("obraId");
  const where: any = {};
  if (materialId) where.materialId = materialId;
  if (obraId) where.obraId = obraId;

  const movimentos = await prisma.estoqueMovimento.findMany({
    where, include: { material: true, fornecedor: true },
    orderBy: { data: "desc" },
  });

  return NextResponse.json(movimentos);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const body = await req.json();
  const movimento = await prisma.estoqueMovimento.create({
    data: {
      tipo: body.tipo, materialId: body.materialId, obraId: body.obraId,
      quantidade: body.quantidade, data: body.data ? new Date(body.data) : new Date(),
      precoUnitario: body.precoUnitario != null ? parseFloat(body.precoUnitario) : 0,
      fornecedorId: body.fornecedorId || null, nfNumero: body.notaFiscal || body.nfNumero || null,
      etapaId: body.etapaId || null, justificativa: body.observacao || body.justificativa || null,
      responsavelId: (session.user as any).id || null,
    },
  });

  return NextResponse.json(movimento, { status: 201 });
}
