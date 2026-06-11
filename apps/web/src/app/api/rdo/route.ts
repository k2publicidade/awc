import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/** GET /api/rdo — List RDOs with filters */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const obraId = searchParams.get("obraId");
  const dataInicio = searchParams.get("dataInicio");
  const dataFim = searchParams.get("dataFim");

  const where: any = {};
  if (obraId) where.obraId = obraId;
  if (dataInicio || dataFim) {
    where.data = {};
    if (dataInicio) where.data.gte = new Date(dataInicio);
    if (dataFim) where.data.lte = new Date(dataFim);
  }

  const rdos = await prisma.rDO.findMany({
    where,
    include: {
      obra: { select: { id: true, nome: true, codigo: true } },
      responsavel: { select: { id: true, name: true } },
      climas: true,
      efetivos: true,
      atividades: true,
      ocorrenciasRdo: true,
      equipamentos: true,
      fotos: true,
    },
    orderBy: { data: "desc" },
  });

  return NextResponse.json(rdos);
}

/** POST /api/rdo — Create RDO */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const body = await req.json();
  const userId = (session.user as any)?.id;

  const ultimo = await prisma.rDO.findFirst({
    where: { obraId: body.obraId },
    orderBy: { numero: "desc" },
    select: { numero: true },
  });

  const rdo = await prisma.rDO.create({
    data: {
      data: new Date(body.data),
      numero: body.numero != null && body.numero !== "" ? Number(body.numero) : (ultimo?.numero ?? 0) + 1,
      obraId: body.obraId,
      responsavelId: body.responsavelId || userId,
      status: body.status === "APROVADO" ? "APROVADO" : "RASCUNHO",
      climaManha: body.climaManha || null,
      climaTarde: body.climaTarde || null,
      temperaturaManha: body.temperaturaManha != null ? Number(body.temperaturaManha) : null,
      temperaturaTarde: body.temperaturaTarde != null ? Number(body.temperaturaTarde) : null,
      observacoes: body.observacoes || null,
      assinaturaNome: body.assinaturaNome || null,
      assinaturaCrea: body.assinaturaCrea || null,
      assinaturaBase64: body.assinaturaImagem || body.assinaturaBase64 || null,
      climas: { create: (body.climas || []).map((c: any) => ({
        periodo: c.periodo, condicao: c.condicao,
        temperatura: c.temperatura != null ? Number(c.temperatura) : null,
        observacao: c.observacao || null,
      })) },
      efetivos: { create: (body.efetivos || []).map((e: any) => ({
        funcao: e.funcao,
        quantidadePresente: Number(e.quantidadePresente) || 0,
        quantidadeAusente: Number(e.quantidadeAusente) || 0,
        quantidadeFaltaJustificada: Number(e.quantidadeFaltaJustificada) || 0,
      })) },
      atividades: { create: (body.atividades || []).map((a: any) => ({
        descricao: a.descricao || a.etapa || "",
        etapaId: a.etapaId || null,
        percentualExecutado: Number(a.percentualExecutado) || 0,
      })) },
      ocorrenciasRdo: { create: (body.ocorrencias || []).map((o: any) => ({
        tipo: o.tipo, descricao: o.descricao,
      })) },
      equipamentos: { create: (body.equipamentos || []).map((e: any) => ({
        equipamento: e.equipamento || e.nome || "",
        horasTrabalhadas: Number(e.horasTrabalhadas ?? e.horas) || 0,
        observacao: e.observacao || null,
      })) },
    },
    include: { obra: true, climas: true, efetivos: true, atividades: true, ocorrenciasRdo: true, equipamentos: true },
  });

  // Update etapa progress from atividades
  for (const atividade of body.atividades || []) {
    if (atividade.etapaId && atividade.percentualExecutado) {
      await prisma.etapa.update({
        where: { id: atividade.etapaId },
        data: { percentualRealizado: { increment: atividade.percentualExecutado } },
      });
    }
  }

  return NextResponse.json(rdo, { status: 201 });
}
