import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session?.user || !["ADMIN", "SUPER_ADMIN"].includes(role)) return null;
  return session;
}

/** GET /api/usuarios — lista usuários do tenant (admin) */
export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Apenas administradores" }, { status: 403 });

  const tenantId = (session.user as any).tenantId as string;
  const usuarios = await prisma.user.findMany({
    where: { tenantId },
    select: { id: true, name: true, email: true, role: true, phone: true, isActive: true, createdAt: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(usuarios);
}

/** PATCH /api/usuarios — atualiza papel/ativo/telefone de um usuário (admin) */
export async function PATCH(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Apenas administradores" }, { status: 403 });

  const body = await req.json();
  if (!body.id) return NextResponse.json({ error: "id é obrigatório" }, { status: 400 });

  const meuId = (session.user as any).id as string;
  if (body.id === meuId && body.isActive === false) {
    return NextResponse.json({ error: "Você não pode desativar a própria conta" }, { status: 400 });
  }

  const data: any = {};
  if (body.role !== undefined) data.role = body.role;
  if (body.isActive !== undefined) data.isActive = Boolean(body.isActive);
  if (body.name !== undefined) data.name = body.name;
  if (body.phone !== undefined) data.phone = body.phone || null;

  const usuario = await prisma.user.update({
    where: { id: body.id },
    data,
    select: { id: true, name: true, email: true, role: true, phone: true, isActive: true },
  });
  return NextResponse.json(usuario);
}
