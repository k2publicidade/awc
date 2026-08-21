import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireSession } from '@/lib/session-context';
import { assertTenantRelations, canAccessResource, userObraWhere } from '@/lib/authorization';
import { isManagedUploadUrl } from '@/lib/storage';

export async function GET(req: NextRequest) {
  const context = await requireSession();
  if (!context) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  if (!canAccessResource(context.role, 'documentos'))
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const obraId = searchParams.get('obraId');
  const categoria = searchParams.get('categoria');
  const userObraScope = userObraWhere(context.role, context.tenantId, context.userId);
  const where: DynamicValue = { obra: userObraScope };
  if (obraId) where.obraId = obraId;
  if (categoria) where.categoria = categoria;

  const documentos = await prisma.documento.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(documentos);
}

export async function POST(req: NextRequest) {
  const context = await requireSession();
  if (!context) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  if (!canAccessResource(context.role, 'documentos', true))
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });

  const body = await req.json();
  if (body.arquivoUrl && !isManagedUploadUrl(body.arquivoUrl, context.tenantId)) {
    return NextResponse.json({ error: 'Envie o arquivo pelo seletor do sistema' }, { status: 400 });
  }
  const { tenantOwnsObra } = await import('@/lib/authorization');
  if (!(await tenantOwnsObra(body.obraId, context.tenantId, context.userId, context.role))) {
    return NextResponse.json({ error: 'Obra não encontrada' }, { status: 404 });
  }
  await assertTenantRelations({ obraId: body.obraId }, context.tenantId);
  const documento = await prisma.documento.create({
    data: {
      nome: body.nome,
      categoria: body.categoria,
      obraId: body.obraId,
      numero: body.numero || null,
      profissionalResponsavel: body.profissional || body.profissionalResponsavel || null,
      dataEmissao: body.dataEmissao ? new Date(body.dataEmissao) : null,
      validade:
        body.dataValidade || body.validade ? new Date(body.dataValidade || body.validade) : null,
      status: body.status || 'PENDENTE',
      arquivoUrl: body.arquivoUrl || null,
      accessHash: body.hashPublico || body.accessHash || null,
      createdBy: context.userId,
    },
  });

  return NextResponse.json(documento, { status: 201 });
}
