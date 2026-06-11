import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/** POST /api/medicao — Create medição */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const userId = (session.user as any)?.id;

  const body = await req.json();
  const medicao = await prisma.medicao.create({
    data: {
      numero: body.numero, periodoInicio: new Date(body.periodoInicio), periodoFim: new Date(body.periodoFim),
      obraId: body.obraId, createdBy: userId, status: "EM_ELABORACAO",
      itens: { create: body.itens || [] },
    },
    include: { itens: true },
  });

  return NextResponse.json(medicao, { status: 201 });
}

/** PUT /api/medicao — Update medição status */
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const body = await req.json();
  const medicao = await prisma.medicao.update({
    where: { id: body.id },
    data: { status: body.status, observacao: body.observacoes ?? body.observacao },
  });

  return NextResponse.json(medicao);
}
