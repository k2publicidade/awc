import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import { registerSchema } from '@/lib/validations';
import { requireSession } from '@/lib/session-context';

/**
 * POST /api/auth/register
 * Register a new user.
 * Only an authenticated tenant administrator can create accounts.
 */
export async function POST(request: NextRequest) {
  try {
    const context = await requireSession(['ADMIN', 'SUPER_ADMIN']);
    if (!context)
      return NextResponse.json(
        { error: 'Apenas administradores podem criar usuários' },
        { status: 403 }
      );

    const body = await request.json();
    const data = registerSchema.parse(body);
    if (data.role === 'SUPER_ADMIN')
      return NextResponse.json({ error: 'Papel não permitido' }, { status: 403 });

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      return NextResponse.json({ error: 'Email ja cadastrado' }, { status: 400 });
    }

    const tenant = await prisma.tenant.findUnique({ where: { id: context.tenantId } });
    if (!tenant) return NextResponse.json({ error: 'Workspace não encontrado' }, { status: 404 });

    const { planLimit } = await import('@/lib/saas');
    const userCount = await prisma.user.count({ where: { tenantId: tenant.id } });
    if (userCount >= planLimit(tenant.plan, 'users'))
      return NextResponse.json({ error: 'Limite de usuários do plano atingido' }, { status: 402 });

    // Hash password
    const passwordHash = await bcrypt.hash(data.password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash,
        role: data.role,
        tenantId: tenant.id,
      },
    });

    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    });
  } catch (error: DynamicValue) {
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Dados invalidos', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: 'Erro ao criar usuario' }, { status: 500 });
  }
}
