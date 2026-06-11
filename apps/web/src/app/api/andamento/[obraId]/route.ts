import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/** GET /api/andamento/[obraId] */
export async function GET(req: NextRequest, { params }: { params: Promise<{ obraId: string }> }) {
  const { obraId } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const etapas = await prisma.etapa.findMany({
    where: { obraId },
    orderBy: { ordem: "asc" },
    include: { predecessoras: true },
  });

  const medicoes = await prisma.medicao.findMany({
    where: { obraId },
    orderBy: { numero: "desc" },
    include: { itens: true },
  });

  return NextResponse.json({ etapas, medicoes });
}
