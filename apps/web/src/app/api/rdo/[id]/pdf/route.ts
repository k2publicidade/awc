import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { wrapReport } from '@/lib/reports/pdf-generator';
import { requireSession } from '@/lib/session-context';
import { canAccessResource } from '@/lib/authorization';

/** GET /api/rdo/[id]/pdf — generate RDO PDF */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await requireSession();
  if (!context) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  if (!canAccessResource(context.role, 'rdos'))
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });

  const rdo = await prisma.rDO.findFirst({
    where: { id, obra: { tenantId: context.tenantId } },
    include: {
      obra: { select: { nome: true } },
      responsavel: { select: { name: true } },
      climas: true,
      efetivos: true,
      atividades: { include: { etapa: { select: { nome: true } } } },
      equipamentos: true,
      fotos: true,
    },
  });

  if (!rdo) return NextResponse.json({ error: 'RDO não encontrado' }, { status: 404 });

  const climaManha = rdo.climas.find((c) => c.periodo === 'MANHA');
  const climaTarde = rdo.climas.find((c) => c.periodo === 'TARDE');

  const html = wrapReport(
    `
    <h2>RDO Nº ${rdo.numero} — ${new Date(rdo.data).toLocaleDateString('pt-BR')}</h2>
    <p><strong>Obra:</strong> ${rdo.obra.nome}</p>
    <p><strong>Responsável:</strong> ${rdo.responsavel?.name || '-'}</p>
    ${rdo.climas.length > 0 ? `<h3>Clima</h3><p>Manhã: ${climaManha?.condicao || '-'} | Tarde: ${climaTarde?.condicao || '-'}</p>` : ''}
    ${rdo.efetivos.length > 0 ? `<h3>Efetivo</h3><table><tr><th>Função</th><th>Presentes</th><th>Ausentes</th></tr>${rdo.efetivos.map((e) => `<tr><td>${e.funcao}</td><td>${e.quantidadePresente}</td><td>${e.quantidadeAusente}</td></tr>`).join('')}</table>` : ''}
    ${rdo.atividades.length > 0 ? `<h3>Atividades</h3><table><tr><th>Descrição</th><th>Etapa</th><th>%</th></tr>${rdo.atividades.map((a) => `<tr><td>${a.descricao}</td><td>${a.etapa?.nome || '-'}</td><td>${a.percentualExecutado || 0}%</td></tr>`).join('')}</table>` : ''}
    ${rdo.equipamentos.length > 0 ? `<h3>Equipamentos</h3><table><tr><th>Equipamento</th><th>Horas</th></tr>${rdo.equipamentos.map((e) => `<tr><td>${e.equipamento}</td><td>${e.horasTrabalhadas}h</td></tr>`).join('')}</table>` : ''}
    ${rdo.observacoes ? `<h3>Observações</h3><p>${rdo.observacoes}</p>` : ''}
  `,
    'Relatório Diário de Obra',
    rdo.obra.nome
  );

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
