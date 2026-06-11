import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// Default notification preferences per role
const defaultPreferences: Record<string, Record<string, { app: boolean; email: boolean; whatsapp: boolean; push: boolean }>> = {
  SUPER_ADMIN: { ETAPA_ATRASADA: { app: true, email: true, whatsapp: true, push: false }, RDO_PENDENTE: { app: true, email: true, whatsapp: true, push: false }, ESTOQUE_MINIMO: { app: true, email: true, whatsapp: false, push: false }, DOCUMENTO_VENCENDO: { app: true, email: true, whatsapp: false, push: false }, NC_CRITICA: { app: true, email: true, whatsapp: true, push: true }, ACIDENTE: { app: true, email: true, whatsapp: true, push: true }, EXAME_VENCENDO: { app: true, email: true, whatsapp: false, push: false }, MEDICAO_PENDENTE: { app: true, email: true, whatsapp: true, push: false }, ORCAMENTO_90: { app: true, email: true, whatsapp: true, push: false }, RESUMO_SEMANAL: { app: true, email: true, whatsapp: false, push: false } },
  ENGENHEIRO: { ETAPA_ATRASADA: { app: true, email: true, whatsapp: true, push: true }, RDO_PENDENTE: { app: true, email: true, whatsapp: true, push: true }, ESTOQUE_MINIMO: { app: true, email: false, whatsapp: false, push: false }, DOCUMENTO_VENCENDO: { app: true, email: true, whatsapp: false, push: false }, NC_CRITICA: { app: true, email: true, whatsapp: true, push: true }, ACIDENTE: { app: true, email: true, whatsapp: true, push: true }, EXAME_VENCENDO: { app: true, email: true, whatsapp: false, push: false } },
  ENCARREGADO: { RDO_PENDENTE: { app: true, email: false, whatsapp: true, push: true }, REQUISICAO_MATERIAL: { app: true, email: true, whatsapp: false, push: true } },
  FINANCEIRO: { MEDICAO_PENDENTE: { app: true, email: true, whatsapp: true, push: false }, ORCAMENTO_90: { app: true, email: true, whatsapp: true, push: false }, RESUMO_SEMANAL: { app: true, email: true, whatsapp: false, push: false } },
  ALMOXARIFE: { ESTOQUE_MINIMO: { app: true, email: true, whatsapp: false, push: true }, REQUISICAO_MATERIAL: { app: true, email: true, whatsapp: false, push: true } },
};

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const role = (session.user as any).role || "ENGENHEIRO";
  const prefs = defaultPreferences[role] || defaultPreferences.ENGENHEIRO;

  return NextResponse.json({ preferences: prefs, silenceHours: { start: "22:00", end: "07:00" } });
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const body = await req.json();
  // In production, save to user preferences table
  return NextResponse.json({ success: true, preferences: body.preferences });
}
