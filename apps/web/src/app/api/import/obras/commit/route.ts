import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { requireSession } from '@/lib/session-context';
import { canAccessResource } from '@/lib/authorization';
import { planLimit } from '@/lib/saas';
import { assertImportedStageCount } from '@/lib/import/import-integrity';

const optionalText = z.string().trim().max(2_000).default('');
const optionalDate = z
  .string()
  .trim()
  .default('')
  .refine((value) => !value || /^\d{4}-\d{2}-\d{2}$/.test(value), 'Data inválida');

const importSchema = z.object({
  fileName: z.string().trim().min(1).max(255),
  obra: z.object({
    nome: z.string().trim().min(3, 'Informe o nome da obra').max(200),
    codigo: z.string().trim().min(2, 'Informe o código da obra').max(80),
    tipo: z.enum(['GALPAO', 'EDIFICIO', 'PONTE', 'MURO_ARRIMO', 'ELEMENTO_ISOLADO', 'OUTRO']),
    endereco: z.string().trim().max(300).default(''),
    cidade: z.string().trim().max(120).default(''),
    estado: z.string().trim().max(2).default(''),
    valorContratado: z.coerce.number().min(0).max(999_999_999_999),
    dataInicio: optionalDate,
    dataPrevisaoFim: optionalDate,
    descricao: optionalText,
  }),
  etapas: z
    .array(
      z.object({
        nome: z.string().trim().min(2).max(240),
        descricao: optionalText,
        dataInicio: optionalDate,
        dataFim: optionalDate,
        percentualPrevisto: z.coerce.number().min(0).max(100).default(0),
        percentualRealizado: z.coerce.number().min(0).max(100).default(0),
        valorFinanceiro: z.coerce.number().min(0).max(999_999_999_999).default(0),
        ordem: z.coerce.number().int().min(0).max(10_000),
      })
    )
    .max(5_000)
    .default([]),
});

function databaseDate(value: string) {
  return value ? new Date(`${value}T12:00:00.000Z`) : null;
}

export async function POST(request: NextRequest) {
  const context = await requireSession();
  if (!context) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  if (!canAccessResource(context.role, 'obras', true))
    return NextResponse.json({ error: 'Sem permissão para importar obras' }, { status: 403 });

  try {
    const input = importSchema.parse(await request.json());
    const result = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.findUnique({
        where: { id: context.tenantId },
        include: { _count: { select: { obras: true } } },
      });
      if (!tenant || !tenant.isActive) throw new Error('Workspace indisponível');
      if (tenant._count.obras >= planLimit(tenant.plan, 'obras'))
        throw new Error('Limite de obras do plano atingido. Faça upgrade para continuar.');

      const duplicate = await tx.obra.findFirst({
        where: { tenantId: context.tenantId, codigo: input.obra.codigo },
        select: { id: true },
      });
      if (duplicate) throw new Error('Já existe uma obra com este código.');

      const obra = await tx.obra.create({
        data: {
          tenantId: context.tenantId,
          engenheiroId: context.userId,
          nome: input.obra.nome,
          codigo: input.obra.codigo,
          tipo: input.obra.tipo,
          endereco: input.obra.endereco || null,
          cidade: input.obra.cidade || null,
          estado: input.obra.estado.toUpperCase() || null,
          valorContratado: input.obra.valorContratado,
          dataInicio: databaseDate(input.obra.dataInicio),
          dataPrevisaoFim: databaseDate(input.obra.dataPrevisaoFim),
          descricao: input.obra.descricao || null,
          status: 'PLANEJAMENTO',
          etapas: {
            create: input.etapas.map((etapa, index) => ({
              nome: etapa.nome,
              descricao: etapa.descricao || null,
              dataInicio: databaseDate(etapa.dataInicio),
              dataFim: databaseDate(etapa.dataFim),
              percentualPrevisto: etapa.percentualPrevisto,
              percentualRealizado: etapa.percentualRealizado,
              valorFinanceiro: etapa.valorFinanceiro,
              ordem: etapa.ordem || index + 1,
            })),
          },
        },
        select: {
          id: true,
          nome: true,
          codigo: true,
          _count: { select: { etapas: true } },
        },
      });

      const etapasCriadas = obra._count.etapas;
      assertImportedStageCount(input.etapas.length, etapasCriadas);

      await tx.auditLog.create({
        data: {
          actorId: context.userId,
          tenantId: context.tenantId,
          action: 'OBRA_IMPORTED',
          targetType: 'Obra',
          targetId: obra.id,
          metadata: {
            fileName: input.fileName,
            etapasEsperadas: input.etapas.length,
            etapasCriadas,
            formato: input.fileName.split('.').pop()?.toLowerCase() || 'desconhecido',
          },
        },
      });
      return { id: obra.id, nome: obra.nome, codigo: obra.codigo, etapasCriadas };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json(
        { error: 'Revise os dados identificados', details: error.issues },
        { status: 400 }
      );
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')
      return NextResponse.json({ error: 'Já existe uma obra com este código.' }, { status: 409 });
    const message = error instanceof Error ? error.message : 'Não foi possível importar a obra';
    const status = message.includes('Já existe') ? 409 : message.includes('Limite') ? 402 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
