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

  const [inspecoes, ncs] = await Promise.all([
    prisma.inspecao.findMany({ where, include: { itens: true }, orderBy: { data: "desc" } }),
    prisma.naoConformidade.findMany({ where, orderBy: { createdAt: "desc" } }),
  ]);

  return NextResponse.json({ inspecoes, ncs });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const body = await req.json();

  if (body.type === "inspecao") {
    const inspecao = await prisma.inspecao.create({
      data: {
        data: body.data ? new Date(body.data) : new Date(),
        etapaId: body.etapaId || body.etapa,
        tipo: body.tipo || "ESTRUTURA",
        responsavelId: body.responsavelId || body.responsavel || (session.user as any).id,
        obraId: body.obraId,
        resultado: body.resultado === "NAO_CONFORME" ? "NAO_CONFORME" : "CONFORME",
        itens: { create: body.itens || [] },
      },
      include: { itens: true },
    });
    return NextResponse.json(inspecao, { status: 201 });
  }

  if (body.type === "nc") {
    const nc = await prisma.naoConformidade.create({
      data: {
        descricao: body.descricao, causaRaiz: body.causaRaiz || null,
        severidade: body.severidade, obraId: body.obraId,
        responsavelId: body.responsavelId || body.responsavel || null,
        prazo: body.prazo ? new Date(body.prazo) : null,
        acaoCorretiva: body.acaoCorretiva || null, status: "ABERTA",
      },
    });
    return NextResponse.json(nc, { status: 201 });
  }

  return NextResponse.json({ error: "Tipo inválido" }, { status: 400 });
}
