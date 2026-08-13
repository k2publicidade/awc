import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireSession } from '@/lib/session-context';

async function ownNotification(id: string) {
  const context = await requireSession();
  if (!context) return null;
  const notification = await prisma.notificacao.findFirst({
    where: { id, tenantId: context.tenantId, userId: context.userId },
  });
  return notification ? { context, notification } : null;
}

/** GET /api/notificacoes/[id] */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await ownNotification(id);
  if (!result)
    return NextResponse.json({ error: 'Notificação não encontrada' }, { status: 404 });
  return NextResponse.json(result.notification);
}

/** PUT /api/notificacoes/[id] — mark as read */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await ownNotification(id);
  if (!result)
    return NextResponse.json({ error: 'Notificação não encontrada' }, { status: 404 });

  const body = await req.json();
  const notificacao = await prisma.notificacao.update({
    where: { id },
    data: { lida: body.lida ?? true },
  });
  return NextResponse.json(notificacao);
}

/** DELETE /api/notificacoes/[id] */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await ownNotification(id);
  if (!result)
    return NextResponse.json({ error: 'Notificação não encontrada' }, { status: 404 });

  await prisma.notificacao.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
