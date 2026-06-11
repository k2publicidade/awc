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

  const orcamentos = await prisma.orcamento.findMany({
    where, include: { obra: { select: { nome: true, codigo: true } }, versoes: { orderBy: { versao: "desc" }, take: 1 } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(orcamentos);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const body = await req.json();
  const orcamento = await prisma.orcamento.create({
    data: {
      obraId: body.obraId, status: "EM_ELABORACAO",
      valorTotal: body.valorTotal || 0,
      justificativa: body.nome || body.justificativa || null,
      createdBy: (session.user as any).id || null,
      versoes: { create: { versao: 1, valorTotal: body.valorTotal || 0, justificativa: "Versão inicial" } },
    },
  });

  return NextResponse.json(orcamento, { status: 201 });
}
