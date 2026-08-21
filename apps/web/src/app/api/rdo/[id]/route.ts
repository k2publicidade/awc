import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireSession } from '@/lib/session-context';
import { assertTenantRelations, canAccessResource, userObraWhere } from '@/lib/authorization';

/** GET /api/rdo/[id] */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await requireSession();
  if (!context) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  if (!canAccessResource(context.role, 'rdos'))
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });

  const userObraScope = userObraWhere(context.role, context.tenantId, context.userId);

  const rdo = await prisma.rDO.findFirst({
    where: { id, obra: userObraScope },
    include: {
      obra: { select: { id: true, nome: true, codigo: true } },
      responsavel: { select: { id: true, name: true } },
      climas: true,
      efetivos: true,
      atividades: {
        include: { etapa: { select: { id: true, nome: true } } },
      },
      ocorrenciasRdo: true,
      equipamentos: true,
      fotos: true,
      presencas: true,
    },
  });
  if (!rdo) return NextResponse.json({ error: 'RDO não encontrado' }, { status: 404 });
  return NextResponse.json(rdo);
}

/** PUT /api/rdo/[id] — Full update with nested relations */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await requireSession();
  if (!context) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  if (!canAccessResource(context.role, 'rdos', true))
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });

  const userObraScope = userObraWhere(context.role, context.tenantId, context.userId);

  const existing = await prisma.rDO.findFirst({
    where: { id, obra: userObraScope },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: 'RDO não encontrado' }, { status: 404 });

  try {
    const body = await req.json();
    await assertTenantRelations(body, context.tenantId);
    for (const atividade of body.atividades || []) {
      await assertTenantRelations({ etapaId: atividade.etapaId }, context.tenantId);
    }

    // Update main fields
    const rdo = await prisma.rDO.update({
      where: { id },
      data: {
        data: body.data ? new Date(body.data) : undefined,
        obraId: body.obraId || undefined,
        responsavelId: body.responsavelId || undefined,
        numero: body.numero != null ? Number(body.numero) : undefined,
        climaManha: body.climaManha || undefined,
        climaTarde: body.climaTarde || undefined,
        temperaturaManha: body.temperaturaManha != null ? Number(body.temperaturaManha) : undefined,
        temperaturaTarde: body.temperaturaTarde != null ? Number(body.temperaturaTarde) : undefined,
        assinaturaBase64: body.assinaturaImagem || undefined,
        assinaturaNome: body.assinaturaNome || undefined,
        assinaturaCrea: body.assinaturaCrea || undefined,
        observacoes: body.observacoes || undefined,
        status: body.status || undefined,
      },
    });

    // Update nested efetivos: delete all, recreate
    if (body.efetivos) {
      await prisma.rDOEfetivo.deleteMany({ where: { rdoId: id } });
      if (body.efetivos.length > 0) {
        await prisma.rDOEfetivo.createMany({
          data: body.efetivos.map((e: DynamicValue) => ({
            rdoId: id,
            funcao: e.funcao,
            quantidadePresente: e.quantidadePresente || 0,
            quantidadeAusente: e.quantidadeAusente || 0,
            quantidadeFaltaJustificada: e.quantidadeFaltaJustificada || 0,
          })),
        });
      }
    }

    // Update nested atividades: delete all, recreate
    if (body.atividades) {
      await prisma.rDOAtividade.deleteMany({ where: { rdoId: id } });
      if (body.atividades.length > 0) {
        await prisma.rDOAtividade.createMany({
          data: body.atividades.map((a: DynamicValue) => ({
            rdoId: id,
            descricao: a.descricao || a.etapa || '',
            etapaId: a.etapaId || undefined,
            percentualExecutado: a.percentualExecutado || 0,
          })),
        });
      }
    }

    return NextResponse.json(rdo);
  } catch (error: DynamicValue) {
    if (error?.code === 'P2002')
      return NextResponse.json(
        { error: 'Já existe um RDO para esta obra nesta data.' },
        { status: 409 }
      );
    return NextResponse.json({ error: error?.message || 'Erro ao salvar RDO' }, { status: 500 });
  }
}

/** DELETE /api/rdo/[id] */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await requireSession();
  if (!context) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  if (!canAccessResource(context.role, 'rdos', true))
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });

  const userObraScope = userObraWhere(context.role, context.tenantId, context.userId);

  const existing = await prisma.rDO.findFirst({
    where: { id, obra: userObraScope },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: 'RDO não encontrado' }, { status: 404 });

  await prisma.rDO.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
