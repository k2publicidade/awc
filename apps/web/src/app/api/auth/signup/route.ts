import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import { signupSchema } from '@/lib/validations';
import { slugifyCompany } from '@/lib/saas';
import { LEGAL_VERSION } from '@/lib/billing';

export async function POST(request: NextRequest) {
  if (process.env.ALLOW_PUBLIC_SIGNUP === 'false') {
    return NextResponse.json(
      { error: 'Cadastro por autoatendimento temporariamente fechado. Fale com a equipe RIGOR.' },
      { status: 403 }
    );
  }

  try {
    const data = signupSchema.parse(await request.json());
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing)
      return NextResponse.json({ error: 'Este e-mail já está cadastrado' }, { status: 409 });

    const baseSlug = slugifyCompany(data.companyName);
    let slug = baseSlug;
    for (let suffix = 1; await prisma.tenant.findUnique({ where: { slug } }); suffix++)
      slug = `${baseSlug}-${suffix}`;

    const passwordHash = await bcrypt.hash(data.password, 12);
    const trialEndsAt = new Date(Date.now() + 10 * 86400000);
    const result = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: data.companyName,
          slug,
          plan: data.plan,
          subscriptionStatus: 'TRIAL',
          trialEndsAt,
          billingEmail: data.email,
          phone: data.phone || null,
        },
      });
      const user = await tx.user.create({
        data: {
          tenantId: tenant.id,
          name: data.name,
          email: data.email,
          phone: data.phone || null,
          passwordHash,
          role: 'ADMIN',
          termsAcceptedAt: new Date(),
          termsVersion: LEGAL_VERSION,
          privacyAcceptedAt: new Date(),
          privacyVersion: LEGAL_VERSION,
        },
      });
      return { tenant, user };
    });

    return NextResponse.json(
      {
        user: { id: result.user.id, name: result.user.name, email: result.user.email },
        workspace: { id: result.tenant.id, name: result.tenant.name, slug: result.tenant.slug },
        trialEndsAt,
      },
      { status: 201 }
    );
  } catch (error: DynamicValue) {
    if (error instanceof Error && error.name === 'ZodError')
      return NextResponse.json({ error: 'Revise os dados informados' }, { status: 400 });
    console.error('signup error', error);
    return NextResponse.json({ error: 'Não foi possível criar o workspace' }, { status: 500 });
  }
}
