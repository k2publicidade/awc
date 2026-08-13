import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireSession } from '@/lib/session-context';

async function requireAdmin() {
  return requireSession(['ADMIN', 'SUPER_ADMIN']);
}

/** GET /api/usuarios — lista usuários do tenant (admin) */
export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: 'Apenas administradores' }, { status: 403 });

  const tenantId = session.tenantId;
  const usuarios = await prisma.user.findMany({
    where: { tenantId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      phone: true,
      isActive: true,
      createdAt: true,
    },
    orderBy: { name: 'asc' },
  });
  return NextResponse.json(usuarios);
}

/** PATCH /api/usuarios — atualiza papel/ativo/telefone de um usuário (admin) */
export async function PATCH(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: 'Apenas administradores' }, { status: 403 });

  const body = await req.json();
  if (!body.id) return NextResponse.json({ error: 'id é obrigatório' }, { status: 400 });

  const meuId = session.userId;
  if (body.id === meuId && body.isActive === false) {
    return NextResponse.json({ error: 'Você não pode desativar a própria conta' }, { status: 400 });
  }

  const data: DynamicValue = {};
  const allowedRoles = ['ADMIN', 'ENGENHEIRO', 'ENCARREGADO', 'FINANCEIRO', 'ALMOXARIFE', 'CLIENTE'];
  if (body.role !== undefined) {
    if (!allowedRoles.includes(body.role))
      return NextResponse.json({ error: 'Papel não permitido' }, { status: 400 });
    data.role = body.role;
  }
  if (body.isActive !== undefined) data.isActive = Boolean(body.isActive);
  if (body.name !== undefined) data.name = body.name;
  if (body.phone !== undefined) data.phone = body.phone || null;

  const existing = await prisma.user.findFirst({
    where: { id: body.id, tenantId: session.tenantId },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });

  const usuario = await prisma.user.update({
    where: { id: existing.id },
    data,
    select: { id: true, name: true, email: true, role: true, phone: true, isActive: true },
  });
  return NextResponse.json(usuario);
}
