import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { registerSchema } from "@/lib/validations";

/**
 * POST /api/auth/register
 * Register a new user.
 * Aberto apenas para o bootstrap (banco sem usuários);
 * depois disso somente ADMIN/SUPER_ADMIN autenticado pode criar contas.
 */
export async function POST(request: NextRequest) {
  try {
    const totalUsers = await prisma.user.count();
    if (totalUsers > 0) {
      const session = await getServerSession(authOptions);
      const role = (session?.user as any)?.role;
      if (!session?.user || !["ADMIN", "SUPER_ADMIN"].includes(role)) {
        return NextResponse.json(
          { error: "Apenas administradores podem criar usuários" },
          { status: 403 }
        );
      }
    }

    const body = await request.json();
    const data = registerSchema.parse(body);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Email ja cadastrado" },
        { status: 400 }
      );
    }

    // Get or create default tenant
    let tenant = await prisma.tenant.findFirst();
    if (!tenant) {
      tenant = await prisma.tenant.create({
        data: {
          name: "AWC Pree Moldados",
          slug: "awc",
          primaryColor: "#FF6B00",
        },
      });
    }

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
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json(
        { error: "Dados invalidos", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Erro ao criar usuario" },
      { status: 500 }
    );
  }
}
