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

  const [ddsList, acidentes] = await Promise.all([
    prisma.dDS.findMany({ where, orderBy: { data: "desc" } }),
    prisma.acidente.findMany({ where, orderBy: { dataHora: "desc" } }),
  ]);

  return NextResponse.json({ dds: ddsList, acidentes });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const body = await req.json();

  if (body.type === "dds") {
    const dds = await prisma.dDS.create({
      data: {
        data: body.data ? new Date(body.data) : new Date(),
        tema: body.tema, obraId: body.obraId,
        participantes: body.participantes || null,
        responsavelId: body.responsavelId || (session.user as any).id,
      },
    });
    return NextResponse.json(dds, { status: 201 });
  }

  if (body.type === "acidente") {
    const acidente = await prisma.acidente.create({
      data: {
        dataHora: body.data ? new Date(body.data) : new Date(),
        tipo: body.tipo, descricao: body.descricao,
        obraId: body.obraId, local: body.local || null,
        vitimaId: body.vitimaId || null, testemunhas: body.testemunhas || null,
        causaRaiz: body.causaRaiz || null,
        acaoPreventiva: body.planoAcao || body.acaoPreventiva || null,
        catAberto: body.catAberto || false,
      },
    });
    return NextResponse.json(acidente, { status: 201 });
  }

  return NextResponse.json({ error: "Tipo inválido" }, { status: 400 });
}
