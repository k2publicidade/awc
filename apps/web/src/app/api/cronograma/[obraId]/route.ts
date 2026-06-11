import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/** GET /api/cronograma/[obraId] */
export async function GET(req: NextRequest, { params }: { params: Promise<{ obraId: string }> }) {
  const { obraId } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const etapas = await prisma.etapa.findMany({
    where: { obraId },
    orderBy: { ordem: "asc" },
    include: {
      predecessoras: true,
      sucessoras: true,
    },
  });

  const versoes = await prisma.cronogramaVersao.findMany({
    where: { obraId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ etapas, versoes });
}

/** POST /api/cronograma/[obraId] — save baseline version */
export async function POST(req: NextRequest, { params }: { params: Promise<{ obraId: string }> }) {
  const { obraId } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const etapas = await prisma.etapa.findMany({ where: { obraId } });
  const ultima = await prisma.cronogramaVersao.findFirst({
    where: { obraId },
    orderBy: { versao: "desc" },
  });
  const versao = await prisma.cronogramaVersao.create({
    data: {
      obraId,
      versao: (ultima?.versao ?? 0) + 1,
      justificativa: `Baseline salvo em ${new Date().toLocaleDateString("pt-BR")}`,
      baseline: JSON.parse(JSON.stringify(etapas)),
    },
  });
  return NextResponse.json(versao);
}
