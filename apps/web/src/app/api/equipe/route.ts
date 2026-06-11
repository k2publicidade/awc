import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const trabalhadores = await prisma.trabalhador.findMany({
    include: { epiEntregas: true, exames: true, presencas: { orderBy: { data: "desc" }, take: 5 } },
    orderBy: { nome: "asc" },
  });

  return NextResponse.json(trabalhadores);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const body = await req.json();
  const tenantId = (session.user as any).tenantId as string;
  const trabalhador = await prisma.trabalhador.create({
    data: {
      tenantId,
      nome: body.nome, cpf: body.cpf, funcao: body.funcao, vinculo: body.vinculo,
      telefone: body.telefone || null, email: body.email || null,
      dataAdmissao: body.dataAdmissao ? new Date(body.dataAdmissao) : null,
      ...(body.dataExameMedico
        ? { exames: { create: { tipo: "ASO", dataRealizacao: new Date(body.dataExameMedico) } } }
        : {}),
    },
  });

  return NextResponse.json(trabalhador, { status: 201 });
}
