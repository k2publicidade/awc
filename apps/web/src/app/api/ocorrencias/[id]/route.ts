import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/** GET /api/ocorrencias/[id] */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const ocorrencia = await prisma.ocorrencia.findUnique({
    where: { id },
    include: { obra: { select: { nome: true } }, etapa: { select: { nome: true } } },
  });
  if (!ocorrencia) return NextResponse.json({ error: "Ocorrência não encontrada" }, { status: 404 });
  return NextResponse.json(ocorrencia);
}

/** PUT /api/ocorrencias/[id] */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const body = await req.json();
  const ocorrencia = await prisma.ocorrencia.update({ where: { id }, data: body });
  return NextResponse.json(ocorrencia);
}

/** DELETE /api/ocorrencias/[id] */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  await prisma.ocorrencia.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
