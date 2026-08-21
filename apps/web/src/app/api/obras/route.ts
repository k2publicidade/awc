import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireSession } from '@/lib/session-context';
import { assertTenantRelations, canAccessResource, userObraWhere } from '@/lib/authorization';

/** GET /api/obras — List obras with filters */
export async function GET(req: NextRequest) {
  const context = await requireSession();
  if (!context) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  if (!canAccessResource(context.role, 'obras'))
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const tipo = searchParams.get('tipo');
  const search = searchParams.get('search');

  const userObraScope = userObraWhere(context.role, context.tenantId, context.userId);

  const where: DynamicValue = { ...userObraScope };
  if (status) where.status = status;
  if (tipo) where.tipo = tipo;
  if (search) where.nome = { contains: search, mode: 'insensitive' };

  const obras = await prisma.obra.findMany({
    where,
    include: {
      engenheiro: { select: { id: true, name: true, email: true } },
      cliente: { select: { id: true, name: true, email: true } },
      etapas: { select: { id: true, percentualRealizado: true, percentualPrevisto: true } },
      _count: { select: { rdos: true, documentos: true, ocorrencias: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const result = obras.map((obra) => {
    const etapas = obra.etapas;
    const avgRealizado =
      etapas.length > 0
        ? etapas.reduce((sum: number, e: DynamicValue) => sum + e.percentualRealizado, 0) /
          etapas.length
        : 0;
    const avgPrevisto =
      etapas.length > 0
        ? etapas.reduce((sum: number, e: DynamicValue) => sum + e.percentualPrevisto, 0) /
          etapas.length
        : 0;

    let semaforo: 'verde' | 'amarelo' | 'vermelho' = 'verde';
    if (avgRealizado < avgPrevisto - 20) semaforo = 'vermelho';
    else if (avgRealizado < avgPrevisto - 10) semaforo = 'amarelo';

    return {
      ...obra,
      avancoRealizado: Math.round(avgRealizado),
      avancoPrevisto: Math.round(avgPrevisto),
      semaforo,
    };
  });

  return NextResponse.json(result);
}

/** POST /api/obras — Create obra */
export async function POST(req: NextRequest) {
  const context = await requireSession();
  if (!context) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  if (!canAccessResource(context.role, 'obras', true))
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
  const { tenantId } = context;

  const body = await req.json();
  const {
    nome,
    codigo,
    tipo,
    endereco,
    cidade,
    estado,
    latitude,
    longitude,
    valorContratado,
    dataInicio,
    dataPrevisaoFim,
    engenheiroId,
    clienteId,
    descricao,
  } = body;

  if (!nome || !codigo || !tipo)
    return NextResponse.json({ error: 'Nome, código e tipo são obrigatórios' }, { status: 400 });

  const resolvedEngenheiroId = engenheiroId || context.userId;

  await assertTenantRelations({ engenheiroId: resolvedEngenheiroId, clienteId }, tenantId);

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: { _count: { select: { obras: true } } },
  });
  if (!tenant) return NextResponse.json({ error: 'Workspace não encontrado' }, { status: 404 });
  const { planLimit } = await import('@/lib/saas');
  if (tenant._count.obras >= planLimit(tenant.plan, 'obras'))
    return NextResponse.json(
      { error: 'Limite de obras do plano atingido. Faça upgrade para continuar.' },
      { status: 402 }
    );
  const existing = await prisma.obra.findFirst({ where: { tenantId, codigo } });
  if (existing) return NextResponse.json({ error: 'Código já existe' }, { status: 409 });

  const obra = await prisma.obra.create({
    data: {
      nome,
      codigo,
      tipo,
      endereco,
      cidade,
      estado,
      latitude,
      longitude,
      valorContratado: valorContratado ? parseFloat(valorContratado) : 0,
      dataInicio: dataInicio ? new Date(dataInicio) : null,
      dataPrevisaoFim: dataPrevisaoFim ? new Date(dataPrevisaoFim) : null,
      engenheiroId: resolvedEngenheiroId,
      clienteId: clienteId || null,
      descricao: descricao || null,
      tenantId,
      status: 'PLANEJAMENTO',
    },
  });

  return NextResponse.json(obra, { status: 201 });
}
