import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/** GET /api/obras/[id] */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const obra = await prisma.obra.findUnique({
    where: { id },
    include: {
      engenheiro: { select: { id: true, name: true, email: true } },
      cliente: { select: { id: true, name: true, email: true } },
      etapas: { orderBy: { ordem: "asc" } },
      rdos: { orderBy: { data: "desc" }, take: 5 },
      orcamentos: { orderBy: { createdAt: "desc" } },
      documentos: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!obra) return NextResponse.json({ error: "Obra não encontrada" }, { status: 404 });
  return NextResponse.json(obra);
}

/** PUT /api/obras/[id] */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const body = await req.json();
  const obra = await prisma.obra.update({ where: { id }, data: body });
  return NextResponse.json(obra);
}

/** DELETE /api/obras/[id] */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  await prisma.obra.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
