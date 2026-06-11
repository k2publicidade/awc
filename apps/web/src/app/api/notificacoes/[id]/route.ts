import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/** GET /api/notificacoes/[id] */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const notificacao = await prisma.notificacao.findUnique({ where: { id } });
  if (!notificacao) return NextResponse.json({ error: "Notificação não encontrada" }, { status: 404 });
  return NextResponse.json(notificacao);
}

/** PUT /api/notificacoes/[id] — mark as read */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const body = await req.json();
  const notificacao = await prisma.notificacao.update({
    where: { id },
    data: { lida: body.lida ?? true },
  });
  return NextResponse.json(notificacao);
}

/** DELETE /api/notificacoes/[id] */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  await prisma.notificacao.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
