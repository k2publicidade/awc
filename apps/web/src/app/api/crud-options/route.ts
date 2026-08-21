import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireSession } from '@/lib/session-context';
import { userObraWhere } from '@/lib/authorization';

export async function GET() {
  try {
    const context = await requireSession([
      'SUPER_ADMIN', 'ADMIN', 'ENGENHEIRO', 'ENCARREGADO', 'FINANCEIRO', 'ALMOXARIFE',
    ]);
    if (!context) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const { tenantId, userId, role } = context;
    const userObraScope = userObraWhere(role, tenantId, userId);

    const [
      obras,
      users,
      fornecedores,
      materiais,
      trabalhadores,
      etapas,
      contratos,
      medicoes,
      inspecoes,
      equipes,
    ] = await Promise.all([
      prisma.obra.findMany({
        where: userObraScope,
        select: { id: true, nome: true, codigo: true },
        orderBy: { nome: 'asc' },
        take: 500,
      }),
      prisma.user.findMany({
        where: { tenantId, isActive: true },
        select: { id: true, name: true, role: true, email: true },
        orderBy: { name: 'asc' },
        take: 500,
      }),
      prisma.fornecedor
        .findMany({
          where: { tenantId, isActive: true },
          select: { id: true, razaoSocial: true, nomeFantasia: true },
          orderBy: { razaoSocial: 'asc' },
          take: 500,
        })
        .catch(() => []),
      prisma.material
        .findMany({
          where: { tenantId },
          select: { id: true, descricao: true, codigo: true },
          orderBy: { descricao: 'asc' },
          take: 500,
        })
        .catch(() => []),
      prisma.trabalhador
        .findMany({
          where: { tenantId, isActive: true },
          select: { id: true, nome: true, funcao: true },
          orderBy: { nome: 'asc' },
          take: 500,
        })
        .catch(() => []),
      prisma.etapa
        .findMany({
          where: { obra: userObraScope },
          select: { id: true, nome: true, obra: { select: { codigo: true } } },
          orderBy: { nome: 'asc' },
          take: 500,
        })
        .catch(() => []),
      prisma.contrato
        .findMany({
          where: { obra: userObraScope },
          select: { id: true, numero: true, objeto: true },
          orderBy: { createdAt: 'desc' },
          take: 500,
        })
        .catch(() => []),
      prisma.medicao
        .findMany({
          where: { obra: userObraScope },
          select: { id: true, numero: true, obra: { select: { codigo: true, nome: true } } },
          orderBy: { createdAt: 'desc' },
          take: 500,
        })
        .catch(() => []),
      prisma.inspecao
        .findMany({
          where: { obra: userObraScope },
          select: { id: true, tipo: true, data: true, obra: { select: { codigo: true } } },
          orderBy: { data: 'desc' },
          take: 500,
        })
        .catch(() => []),
      prisma.equipeObra
        .findMany({
          where: { obra: userObraScope },
          select: { id: true, nome: true, obra: { select: { codigo: true, nome: true } } },
          orderBy: { nome: 'asc' },
          take: 500,
        })
        .catch(() => []),
    ]);

    return NextResponse.json({
      obras: obras.map((o) => ({ value: o.id, label: `${o.nome} (${o.codigo})` })),
      users: users.map((u) => ({
        value: u.id,
        label: u.name,
        role: u.role,
        email: u.email,
      })),
      fornecedores: fornecedores.map((f) => ({
        value: f.id,
        label: f.nomeFantasia || f.razaoSocial,
      })),
      materiais: materiais.map((m) => ({ value: m.id, label: `${m.descricao} (${m.codigo})` })),
      trabalhadores: trabalhadores.map((t) => ({ value: t.id, label: `${t.nome} — ${t.funcao}` })),
      etapas: etapas.map((e) => ({
        value: e.id,
        label: `${e.nome}${e.obra?.codigo ? ` (${e.obra.codigo})` : ''}`,
      })),
      contratos: contratos.map((c) => ({ value: c.id, label: `${c.numero} — ${c.objeto}` })),
      medicoes: medicoes.map((m) => ({
        value: m.id,
        label: `Medição ${m.numero}${m.obra?.codigo ? ` — ${m.obra.codigo}` : ''}`,
      })),
      inspecoes: inspecoes.map((i) => ({
        value: i.id,
        label: `${i.tipo}${i.obra?.codigo ? ` — ${i.obra.codigo}` : ''}`,
      })),
      equipes: equipes.map((e) => ({
        value: e.id,
        label: `${e.nome}${e.obra?.codigo ? ` — ${e.obra.codigo}` : ''}`,
      })),
    });
  } catch (error: DynamicValue) {
    return NextResponse.json(
      { error: error.message || 'Erro ao carregar opções' },
      { status: 500 }
    );
  }
}
