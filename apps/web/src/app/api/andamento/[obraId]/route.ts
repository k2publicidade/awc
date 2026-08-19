import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireSession } from '@/lib/session-context';
import { canAccessResource, tenantOwnsObra } from '@/lib/authorization';

/** GET /api/andamento/[obraId] */
export async function GET(req: NextRequest, { params }: { params: Promise<{ obraId: string }> }) {
  const { obraId } = await params;
  const context = await requireSession();
  if (!context) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  if (!canAccessResource(context.role, 'etapas'))
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
  if (!(await tenantOwnsObra(obraId, context.tenantId, context.userId, context.role)))
    return NextResponse.json({ error: 'Obra não encontrada' }, { status: 404 });

  const etapas = await prisma.etapa.findMany({
    where: { obraId },
    orderBy: { ordem: 'asc' },
    include: { predecessoras: true },
  });

  const medicoes = await prisma.medicao.findMany({
    where: { obraId },
    orderBy: { numero: 'desc' },
    include: { itens: true },
  });

  return NextResponse.json({ etapas, medicoes });
}
