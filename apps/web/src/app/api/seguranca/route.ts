import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireSession } from '@/lib/session-context';
import { assertTenantRelations, canAccessResource } from '@/lib/authorization';

export async function GET(req: NextRequest) {
  const context = await requireSession();
  if (!context) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  if (!canAccessResource(context.role, 'seguranca'))
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const obraId = searchParams.get('obraId');
  const where: DynamicValue = { obra: { tenantId: context.tenantId } };
  if (obraId) where.obraId = obraId;

  const [ddsList, acidentes] = await Promise.all([
    prisma.dDS.findMany({ where, orderBy: { data: 'desc' } }),
    prisma.acidente.findMany({ where, orderBy: { dataHora: 'desc' } }),
  ]);

  return NextResponse.json({ dds: ddsList, acidentes });
}

export async function POST(req: NextRequest) {
  const context = await requireSession();
  if (!context) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  if (!canAccessResource(context.role, 'seguranca', true))
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });

  const body = await req.json();

  if (body.type === 'dds') {
    await assertTenantRelations(
      { obraId: body.obraId, responsavelId: body.responsavelId || context.userId },
      context.tenantId
    );
    const dds = await prisma.dDS.create({
      data: {
        data: body.data ? new Date(body.data) : new Date(),
        tema: body.tema,
        obraId: body.obraId,
        participantes: body.participantes || null,
        responsavelId: body.responsavelId || context.userId,
      },
    });
    return NextResponse.json(dds, { status: 201 });
  }

  if (body.type === 'acidente') {
    await assertTenantRelations(
      { obraId: body.obraId, vitimaId: body.vitimaId },
      context.tenantId
    );
    const acidente = await prisma.acidente.create({
      data: {
        dataHora: body.data ? new Date(body.data) : new Date(),
        tipo: body.tipo,
        descricao: body.descricao,
        obraId: body.obraId,
        local: body.local || null,
        vitimaId: body.vitimaId || null,
        testemunhas: body.testemunhas || null,
        causaRaiz: body.causaRaiz || null,
        acaoPreventiva: body.planoAcao || body.acaoPreventiva || null,
        catAberto: body.catAberto || false,
      },
    });
    return NextResponse.json(acidente, { status: 201 });
  }

  return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 });
}
