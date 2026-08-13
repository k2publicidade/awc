import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import { requireMasterSession, writeMasterAudit } from '@/lib/master-auth';
import {
  createTenantSchema,
  slugifyTenant,
  validationMessage,
} from '@/lib/master-validation';

export async function GET(request: NextRequest) {
  const context = await requireMasterSession();
  if (!context) return NextResponse.json({ error: 'Acesso exclusivo do MASTER ADMIN' }, { status: 403 });

  const query = request.nextUrl.searchParams.get('q')?.trim();
  const tenants = await prisma.tenant.findMany({
    where: {
      isInternal: false,
      ...(query
        ? {
            OR: [
              { name: { contains: query, mode: 'insensitive' as const } },
              { billingEmail: { contains: query, mode: 'insensitive' as const } },
              { document: { contains: query, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      name: true,
      slug: true,
      plan: true,
      subscriptionStatus: true,
      isActive: true,
      billingEmail: true,
      trialEndsAt: true,
      createdAt: true,
      _count: { select: { users: true, obras: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(tenants);
}

export async function POST(request: NextRequest) {
  const context = await requireMasterSession();
  if (!context) return NextResponse.json({ error: 'Acesso exclusivo do MASTER ADMIN' }, { status: 403 });

  const parsed = createTenantSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: validationMessage(parsed.error) }, { status: 400 });
  }

  const data = parsed.data;
  const adminEmail = data.adminEmail.toLowerCase();
  if (await prisma.user.findUnique({ where: { email: adminEmail }, select: { id: true } })) {
    return NextResponse.json({ error: 'Já existe um usuário com este e-mail' }, { status: 409 });
  }

  const baseSlug = slugifyTenant(data.name);
  let slug = baseSlug;
  let suffix = 1;
  while (await prisma.tenant.findUnique({ where: { slug }, select: { id: true } })) {
    suffix += 1;
    slug = `${baseSlug.slice(0, 50)}-${suffix}`;
  }

  try {
    const passwordHash = await bcrypt.hash(data.temporaryPassword, 12);
    const trialEndsAt =
      data.subscriptionStatus === 'TRIAL'
        ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
        : null;
    const created = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: data.name,
          slug,
          document: data.document || null,
          phone: data.phone || null,
          billingEmail: data.billingEmail.toLowerCase(),
          plan: data.plan,
          subscriptionStatus: data.subscriptionStatus,
          trialEndsAt,
          isInternal: false,
          isActive: true,
        },
      });
      const admin = await tx.user.create({
        data: {
          tenantId: tenant.id,
          name: data.adminName,
          email: adminEmail,
          passwordHash,
          role: 'SUPER_ADMIN',
          isActive: true,
          mustChangePassword: true,
        },
        select: { id: true, name: true, email: true, role: true },
      });
      return { tenant, admin };
    });

    await writeMasterAudit(request, context.userId, {
      tenantId: created.tenant.id,
      action: 'TENANT_CREATED',
      targetType: 'Tenant',
      targetId: created.tenant.id,
      metadata: { plan: created.tenant.plan, adminEmail: created.admin.email },
    }).catch((error) => console.error('Falha ao gravar auditoria', error));

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: 'E-mail, documento ou identificador já cadastrado' }, { status: 409 });
    }
    console.error('Falha ao criar empresa', error);
    return NextResponse.json({ error: 'Não foi possível criar a empresa' }, { status: 500 });
  }
}
