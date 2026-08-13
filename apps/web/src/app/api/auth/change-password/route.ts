import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import { changePasswordSchema } from '@/lib/validations';
import { requireSession } from '@/lib/session-context';

/**
 * POST /api/auth/change-password
 * Change the current user's password
 */
export async function POST(request: NextRequest) {
  try {
    const context = await requireSession(undefined, { allowPasswordChange: true });
    if (!context) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 });
    }

    const body = await request.json();
    const data = changePasswordSchema.parse(body);

    const user = await prisma.user.findUnique({
      where: { id: context.userId },
    });

    if (!user || !user.passwordHash) {
      return NextResponse.json({ error: 'Usuario nao encontrado' }, { status: 404 });
    }

    const isValid = await bcrypt.compare(data.currentPassword, user.passwordHash);
    if (!isValid) {
      return NextResponse.json({ error: 'Senha atual incorreta' }, { status: 400 });
    }

    const newPasswordHash = await bcrypt.hash(data.newPassword, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newPasswordHash, mustChangePassword: false },
    });

    return NextResponse.json({ message: 'Senha alterada com sucesso' });
  } catch (error: DynamicValue) {
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Dados invalidos', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: 'Erro ao alterar senha' }, { status: 500 });
  }
}
