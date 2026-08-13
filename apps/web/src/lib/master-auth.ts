import 'server-only';
import type { NextRequest } from 'next/server';
import type { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { requireSession } from '@/lib/session-context';

export async function requireMasterSession() {
  const context = await requireSession(['MASTER_ADMIN']);
  if (!context?.tenant.isInternal) return null;
  return context;
}

export async function writeMasterAudit(
  request: NextRequest,
  actorId: string,
  entry: {
    tenantId?: string | null;
    action: string;
    targetType: string;
    targetId?: string | null;
    metadata?: Prisma.InputJsonValue;
  }
) {
  const forwardedFor = request.headers.get('x-forwarded-for');
  return prisma.auditLog.create({
    data: {
      actorId,
      tenantId: entry.tenantId ?? null,
      action: entry.action,
      targetType: entry.targetType,
      targetId: entry.targetId ?? null,
      metadata: entry.metadata,
      ipAddress: forwardedFor?.split(',')[0]?.trim() || request.headers.get('x-real-ip'),
      userAgent: request.headers.get('user-agent')?.slice(0, 500),
    },
  });
}
