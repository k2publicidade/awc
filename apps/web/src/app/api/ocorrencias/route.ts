import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const obraId = searchParams.get("obraId");
  const status = searchParams.get("status");
  const where: any = {};
  if (obraId) where.obraId = obraId;
  if (status) where.status = status;

  const ocorrencias = await prisma.ocorrencia.findMany({
    where, include: { obra: { select: { nome: true } } },
    orderBy: { dataAbertura: "desc" },
  });

  return NextResponse.json(ocorrencias);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const body = await req.json();
  const ocorrencia = await prisma.ocorrencia.create({
    data: {
      dataAbertura: body.data ? new Date(body.data) : new Date(),
      tipo: body.tipo, descricao: body.descricao,
      obraId: body.obraId, etapaId: body.etapaId || null,
      impactoDias: body.impactoPrazoDias || body.impactoDias || 0,
      responsavelAberturaId: (session.user as any).id || null,
      status: "ABERTO",
    },
  });

  return NextResponse.json(ocorrencia, { status: 201 });
}
