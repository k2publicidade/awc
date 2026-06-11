import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/** GET /api/obras — List obras with filters */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const tipo = searchParams.get("tipo");
  const search = searchParams.get("search");

  const where: any = {};
  if (status) where.status = status;
  if (tipo) where.tipo = tipo;
  if (search) where.nome = { contains: search, mode: "insensitive" };

  const obras = await prisma.obra.findMany({
    where,
    include: {
      engenheiro: { select: { id: true, name: true, email: true } },
      cliente: { select: { id: true, name: true, email: true } },
      etapas: { select: { id: true, percentualRealizado: true, percentualPrevisto: true } },
      _count: { select: { rdos: true, documentos: true, ocorrencias: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const result = obras.map((obra) => {
    const etapas = obra.etapas;
    const avgRealizado = etapas.length > 0
      ? etapas.reduce((sum: number, e: any) => sum + e.percentualRealizado, 0) / etapas.length
      : 0;
    const avgPrevisto = etapas.length > 0
      ? etapas.reduce((sum: number, e: any) => sum + e.percentualPrevisto, 0) / etapas.length
      : 0;

    let semaforo: "verde" | "amarelo" | "vermelho" = "verde";
    if (avgRealizado < avgPrevisto - 20) semaforo = "vermelho";
    else if (avgRealizado < avgPrevisto - 10) semaforo = "amarelo";

    return { ...obra, avancoRealizado: Math.round(avgRealizado), avancoPrevisto: Math.round(avgPrevisto), semaforo };
  });

  return NextResponse.json(result);
}

/** POST /api/obras — Create obra */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const userRole = (session.user as any)?.role;
  if (!["SUPER_ADMIN", "ADMIN", "ENGENHEIRO"].includes(userRole))
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const body = await req.json();
  const { nome, codigo, tipo, endereco, cidade, estado, latitude, longitude, valorContratado, dataInicio, dataPrevisaoFim, engenheiroId, clienteId, descricao } = body;

  if (!nome || !codigo || !tipo)
    return NextResponse.json({ error: "Nome, código e tipo são obrigatórios" }, { status: 400 });

  const existing = await prisma.obra.findUnique({ where: { codigo } });
  if (existing) return NextResponse.json({ error: "Código já existe" }, { status: 409 });

  const obra = await prisma.obra.create({
    data: {
      nome, codigo, tipo, endereco, cidade, estado, latitude, longitude,
      valorContratado: valorContratado ? parseFloat(valorContratado) : 0,
      dataInicio: dataInicio ? new Date(dataInicio) : null,
      dataPrevisaoFim: dataPrevisaoFim ? new Date(dataPrevisaoFim) : null,
      engenheiroId: engenheiroId || null,
      clienteId: clienteId || null,
      descricao: descricao || null,
      tenantId: (session.user as any)?.tenantId || "default",
      status: "PLANEJAMENTO",
    },
  });

  return NextResponse.json(obra, { status: 201 });
}
