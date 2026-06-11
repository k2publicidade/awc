import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const obraId = searchParams.get("obraId");
  const etapaId = searchParams.get("etapaId");
  const where: any = {};
  if (obraId) where.obraId = obraId;
  if (etapaId) where.etapaId = etapaId;

  const fotos = await prisma.foto.findMany({
    where, include: { etapa: { select: { nome: true } } },
    orderBy: { data: "desc" },
  });

  return NextResponse.json(fotos);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const body = await req.json();
  const foto = await prisma.foto.create({
    data: {
      url: body.url, legenda: body.legenda || null, data: new Date(body.data || Date.now()),
      obraId: body.obraId, etapaId: body.etapaId || null, rdoId: body.rdoId || null,
      tags: body.tags || body.tipo || null,
      uploadedBy: (session.user as any).id || null,
    },
  });

  return NextResponse.json(foto, { status: 201 });
}
