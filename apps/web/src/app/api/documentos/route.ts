import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const obraId = searchParams.get("obraId");
  const categoria = searchParams.get("categoria");
  const where: any = {};
  if (obraId) where.obraId = obraId;
  if (categoria) where.categoria = categoria;

  const documentos = await prisma.documento.findMany({
    where, orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(documentos);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const body = await req.json();
  const documento = await prisma.documento.create({
    data: {
      nome: body.nome, categoria: body.categoria, obraId: body.obraId,
      numero: body.numero || null,
      profissionalResponsavel: body.profissional || body.profissionalResponsavel || null,
      dataEmissao: body.dataEmissao ? new Date(body.dataEmissao) : null,
      validade: body.dataValidade || body.validade ? new Date(body.dataValidade || body.validade) : null,
      status: body.status || "PENDENTE", arquivoUrl: body.arquivoUrl || null,
      accessHash: body.hashPublico || body.accessHash || null,
    },
  });

  return NextResponse.json(documento, { status: 201 });
}
