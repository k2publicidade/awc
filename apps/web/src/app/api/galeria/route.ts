import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireSession } from '@/lib/session-context';
import { assertTenantRelations, canAccessResource } from '@/lib/authorization';
import { isManagedUploadUrl } from '@/lib/storage';

export async function GET(req: NextRequest) {
  const context = await requireSession();
  if (!context) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  if (!canAccessResource(context.role, 'galeria'))
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const obraId = searchParams.get('obraId');
  const etapaId = searchParams.get('etapaId');
  const where: DynamicValue = { obra: { tenantId: context.tenantId } };
  if (obraId) where.obraId = obraId;
  if (etapaId) where.etapaId = etapaId;

  const fotos = await prisma.foto.findMany({
    where,
    include: { etapa: { select: { nome: true } } },
    orderBy: { data: 'desc' },
  });

  return NextResponse.json(fotos);
}

export async function POST(req: NextRequest) {
  const context = await requireSession();
  if (!context) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  if (!canAccessResource(context.role, 'galeria', true))
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });

  const body = await req.json();
  if (!isManagedUploadUrl(body.url, context.tenantId)) {
    return NextResponse.json({ error: 'Envie a imagem pelo seletor do sistema' }, { status: 400 });
  }
  await assertTenantRelations(
    { obraId: body.obraId, etapaId: body.etapaId, rdoId: body.rdoId },
    context.tenantId
  );
  const foto = await prisma.foto.create({
    data: {
      url: body.url,
      legenda: body.legenda || null,
      data: new Date(body.data || Date.now()),
      obraId: body.obraId,
      etapaId: body.etapaId || null,
      rdoId: body.rdoId || null,
      tags: body.tags || body.tipo || null,
      uploadedBy: context.userId,
    },
  });

  return NextResponse.json(foto, { status: 201 });
}
