import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const [obras, users, fornecedores, materiais, trabalhadores, etapas, contratos, medicoes, inspecoes, equipes] = await Promise.all([
      prisma.obra.findMany({ select: { id: true, nome: true, codigo: true }, orderBy: { nome: "asc" }, take: 500 }),
      prisma.user.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" }, take: 500 }),
      prisma.fornecedor.findMany({ select: { id: true, razaoSocial: true, nomeFantasia: true }, orderBy: { razaoSocial: "asc" }, take: 500 }).catch(() => []),
      prisma.material.findMany({ select: { id: true, descricao: true, codigo: true }, orderBy: { descricao: "asc" }, take: 500 }).catch(() => []),
      prisma.trabalhador.findMany({ select: { id: true, nome: true, funcao: true }, orderBy: { nome: "asc" }, take: 500 }).catch(() => []),
      prisma.etapa.findMany({ select: { id: true, nome: true, obra: { select: { codigo: true } } }, orderBy: { nome: "asc" }, take: 500 }).catch(() => []),
      prisma.contrato.findMany({ select: { id: true, numero: true, objeto: true }, orderBy: { createdAt: "desc" }, take: 500 }).catch(() => []),
      prisma.medicao.findMany({ select: { id: true, numero: true, obra: { select: { codigo: true, nome: true } } }, orderBy: { createdAt: "desc" }, take: 500 }).catch(() => []),
      prisma.inspecao.findMany({ select: { id: true, tipo: true, data: true, obra: { select: { codigo: true } } }, orderBy: { data: "desc" }, take: 500 }).catch(() => []),
      prisma.equipeObra.findMany({ select: { id: true, nome: true, obra: { select: { codigo: true, nome: true } } }, orderBy: { nome: "asc" }, take: 500 }).catch(() => []),
    ]);

    return NextResponse.json({
      obras: obras.map((o) => ({ value: o.id, label: `${o.nome} (${o.codigo})` })),
      users: users.map((u) => ({ value: u.id, label: u.name })),
      fornecedores: fornecedores.map((f) => ({ value: f.id, label: f.nomeFantasia || f.razaoSocial })),
      materiais: materiais.map((m) => ({ value: m.id, label: `${m.descricao} (${m.codigo})` })),
      trabalhadores: trabalhadores.map((t) => ({ value: t.id, label: `${t.nome} — ${t.funcao}` })),
      etapas: etapas.map((e) => ({ value: e.id, label: `${e.nome}${e.obra?.codigo ? ` (${e.obra.codigo})` : ""}` })),
      contratos: contratos.map((c) => ({ value: c.id, label: `${c.numero} — ${c.objeto}` })),
      medicoes: medicoes.map((m) => ({ value: m.id, label: `Medição ${m.numero}${m.obra?.codigo ? ` — ${m.obra.codigo}` : ""}` })),
      inspecoes: inspecoes.map((i) => ({ value: i.id, label: `${i.tipo}${i.obra?.codigo ? ` — ${i.obra.codigo}` : ""}` })),
      equipes: equipes.map((e) => ({ value: e.id, label: `${e.nome}${e.obra?.codigo ? ` — ${e.obra.codigo}` : ""}` })),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Erro ao carregar opções" }, { status: 500 });
  }
}
