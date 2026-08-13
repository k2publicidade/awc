import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireMasterSession, writeMasterAudit } from '@/lib/master-auth';
import { updateMasterUserSchema, validationMessage } from '@/lib/master-validation';

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const context = await requireMasterSession();
  if (!context) return NextResponse.json({ error: 'Acesso exclusivo do MASTER ADMIN' }, { status: 403 });
  const userId = (await params).id;
  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, tenantId: true, role: true, isActive: true, tenant: { select: { isInternal: true } } },
  });
  if (!target || target.tenant.isInternal || target.role === 'MASTER_ADMIN') {
    return NextResponse.json({ error: 'Usuário de cliente não encontrado' }, { status: 404 });
  }
  const parsed = updateMasterUserSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: validationMessage(parsed.error) }, { status: 400 });
  }
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { isActive: parsed.data.isActive },
    select: { id: true, name: true, email: true, role: true, isActive: true },
  });
  await writeMasterAudit(request, context.userId, {
    tenantId: target.tenantId,
    action: parsed.data.isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
    targetType: 'User',
    targetId: target.id,
    metadata: { previousActive: target.isActive, email: updated.email },
  }).catch((error) => console.error('Falha ao gravar auditoria', error));
  return NextResponse.json(updated);
}
