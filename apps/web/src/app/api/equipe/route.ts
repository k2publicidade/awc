import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireSession } from '@/lib/session-context';
import { canAccessResource } from '@/lib/authorization';

export async function GET() {
  const context = await requireSession();
  if (!context) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  if (!canAccessResource(context.role, 'equipe'))
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });

  const trabalhadores = await prisma.trabalhador.findMany({
    where: { tenantId: context.tenantId },
    include: { epiEntregas: true, exames: true, presencas: { orderBy: { data: 'desc' }, take: 5 } },
    orderBy: { nome: 'asc' },
  });

  return NextResponse.json(trabalhadores);
}

export async function POST(req: NextRequest) {
  const context = await requireSession();
  if (!context) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  if (!canAccessResource(context.role, 'equipe', true))
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });

  const body = await req.json();
  const tenantId = context.tenantId;
  const trabalhador = await prisma.trabalhador.create({
    data: {
      tenantId,
      nome: body.nome,
      cpf: body.cpf,
      funcao: body.funcao,
      vinculo: body.vinculo,
      telefone: body.telefone || null,
      email: body.email || null,
      dataAdmissao: body.dataAdmissao ? new Date(body.dataAdmissao) : null,
      ...(body.dataExameMedico
        ? { exames: { create: { tipo: 'ASO', dataRealizacao: new Date(body.dataExameMedico) } } }
        : {}),
    },
  });

  return NextResponse.json(trabalhador, { status: 201 });
}
