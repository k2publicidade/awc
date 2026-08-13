import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireSession } from '@/lib/session-context';
import { assertTenantRelations } from '@/lib/authorization';

export async function GET(req: NextRequest) {
  const context = await requireSession();
  if (!context) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const lida = searchParams.get('lida');
  const where: DynamicValue = { userId: context.userId, tenantId: context.tenantId };
  if (lida !== null) where.lida = lida === 'true';

  const notificacoes = await prisma.notificacao.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  const naoLidas = await prisma.notificacao.count({
    where: { userId: context.userId, tenantId: context.tenantId, lida: false },
  });

  return NextResponse.json({ notificacoes, naoLidas });
}

export async function POST(req: NextRequest) {
  const context = await requireSession(['ADMIN', 'SUPER_ADMIN']);
  if (!context) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });

  const body = await req.json();
  await assertTenantRelations({ userId: body.userId }, context.tenantId);
  const notificacao = await prisma.notificacao.create({
    data: {
      titulo: body.titulo,
      mensagem: body.mensagem,
      tipo: body.tipo,
      userId: body.userId,
      tenantId: context.tenantId,
      canal: body.canal || 'IN_APP',
      lida: false,
    },
  });

  return NextResponse.json(notificacao, { status: 201 });
}
