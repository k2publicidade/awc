import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import { requireMasterSession, writeMasterAudit } from '@/lib/master-auth';
import { masterPasswordSchema, validationMessage } from '@/lib/master-validation';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: RouteContext) {
  const context = await requireMasterSession();
  if (!context) return NextResponse.json({ error: 'Acesso exclusivo do MASTER ADMIN' }, { status: 403 });
  const userId = (await params).id;
  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, tenantId: true, email: true, role: true, tenant: { select: { isInternal: true } } },
  });
  if (!target || target.tenant.isInternal || target.role === 'MASTER_ADMIN') {
    return NextResponse.json({ error: 'Usuário de cliente não encontrado' }, { status: 404 });
  }
  const parsed = masterPasswordSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: validationMessage(parsed.error) }, { status: 400 });
  }
  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash, mustChangePassword: true },
  });
  await writeMasterAudit(request, context.userId, {
    tenantId: target.tenantId,
    action: 'USER_PASSWORD_RESET',
    targetType: 'User',
    targetId: target.id,
    metadata: { email: target.email, forcedRotation: true },
  }).catch((error) => console.error('Falha ao gravar auditoria', error));
  return NextResponse.json({ ok: true, mustChangePassword: true });
}
