import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const lida = searchParams.get("lida");
  const where: any = { userId: (session.user as any).id };
  if (lida !== null) where.lida = lida === "true";

  const notificacoes = await prisma.notificacao.findMany({
    where, orderBy: { createdAt: "desc" }, take: 50,
  });

  const naoLidas = await prisma.notificacao.count({ where: { userId: (session.user as any).id, lida: false } });

  return NextResponse.json({ notificacoes, naoLidas });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const body = await req.json();
  const notificacao = await prisma.notificacao.create({
    data: {
      titulo: body.titulo, mensagem: body.mensagem, tipo: body.tipo,
      userId: body.userId, tenantId: (session.user as any).tenantId,
      canal: body.canal || "IN_APP", lida: false,
    },
  });

  return NextResponse.json(notificacao, { status: 201 });
}
