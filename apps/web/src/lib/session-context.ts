import 'server-only';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function requireSession(
  roles?: string[],
  options: { allowPasswordChange?: boolean } = {}
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  const tokenUser = session.user as typeof session.user & {
    id?: string;
    tenantId?: string;
    role?: string;
  };
  if (!tokenUser.id || !tokenUser.tenantId) return null;

  // JWTs remain valid until expiry. Re-check the database so deactivated users,
  // tenant changes, and role changes take effect on the next API request.
  const user = await prisma.user.findFirst({
    where: {
      id: tokenUser.id,
      tenantId: tokenUser.tenantId,
      isActive: true,
      tenant: { isActive: true },
    },
    select: {
      id: true,
      tenantId: true,
      role: true,
      mustChangePassword: true,
      tenant: {
        select: {
          id: true,
          plan: true,
          subscriptionStatus: true,
          trialEndsAt: true,
          isInternal: true,
          isActive: true,
        },
      },
    },
  });
  if (
    !user ||
    (user.mustChangePassword && !options.allowPasswordChange) ||
    (roles && !roles.includes(user.role))
  )
    return null;

  return {
    session,
    user,
    userId: user.id,
    tenantId: user.tenantId,
    role: user.role,
    mustChangePassword: user.mustChangePassword,
    tenant: user.tenant,
  };
}
