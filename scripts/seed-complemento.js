// Complementa o seed: etapas para obras sem cronograma e equipes por obra.
const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

const MODELOS = {
  edificio: [
    ["Fundações e Contenções", 0.0, 0.18],
    ["Estrutura Pré-Moldada — Pilares", 0.12, 0.35],
    ["Estrutura Pré-Moldada — Vigas e Lajes", 0.3, 0.55],
    ["Fechamento e Alvenaria", 0.5, 0.72],
    ["Instalações Elétricas e Hidráulicas", 0.6, 0.85],
    ["Acabamento e Fachada", 0.78, 0.96],
    ["Comissionamento e Entrega", 0.94, 1.0],
  ],
  ponte: [
    ["Fundações e Estacas", 0.0, 0.22],
    ["Blocos e Encontros", 0.18, 0.4],
    ["Pré-Moldagem de Vigas", 0.25, 0.55],
    ["Lançamento de Vigas", 0.5, 0.7],
    ["Tabuleiro e Laje", 0.65, 0.85],
    ["Guarda-corpo e Pavimentação", 0.82, 0.97],
    ["Inspeção Final e Entrega", 0.95, 1.0],
  ],
};

function dt(inicio, fim, frac) {
  return new Date(inicio.getTime() + (fim.getTime() - inicio.getTime()) * frac);
}

async function main() {
  const hoje = new Date();
  const obras = await p.obra.findMany({ include: { _count: { select: { etapas: true } } } });

  for (const obra of obras) {
    if (obra._count.etapas > 0) { console.log("etapas ja existem:", obra.nome); continue; }
    const inicio = obra.dataInicio || new Date(hoje.getFullYear(), 0, 1);
    const fim = obra.dataPrevisaoFim || new Date(hoje.getFullYear(), 11, 31);
    const modelo = /ponte|passarela/i.test(obra.nome) ? MODELOS.ponte : MODELOS.edificio;
    const valorEtapa = Number(obra.valorContratado || 0) / modelo.length;
    let ordem = 1;
    for (const [nome, f0, f1] of modelo) {
      const dataInicio = dt(inicio, fim, f0);
      const dataFim = dt(inicio, fim, f1);
      // progresso simulado: etapas no passado avançadas, futuras zeradas
      const progTempo = (hoje - dataInicio) / (dataFim - dataInicio);
      const realizado = Math.max(0, Math.min(100, Math.round(progTempo * 100 * (0.8 + Math.random() * 0.25))));
      const previsto = Math.max(0, Math.min(100, Math.round(progTempo * 100)));
      await p.etapa.create({
        data: {
          obraId: obra.id, nome, ordem: ordem++,
          dataInicio, dataFim,
          percentualPrevisto: previsto, percentualRealizado: realizado,
          valorFinanceiro: Math.round(valorEtapa * 100) / 100,
        },
      });
    }
    console.log("etapas criadas:", obra.nome);
  }

  // Equipes: 1 por obra com membros distribuídos
  const tenant = await p.tenant.findFirst();
  const trabalhadores = await p.trabalhador.findMany({ where: { isActive: true } });
  const equipesExistentes = await p.equipeObra.count();
  if (equipesExistentes === 0 && tenant && trabalhadores.length > 0) {
    const nomes = ["Equipe de Montagem A", "Equipe de Montagem B", "Equipe Civil"];
    const especialidades = ["Montagem de pré-moldados", "Içamento e travamento", "Obra civil e acabamento"];
    for (let i = 0; i < obras.length; i++) {
      const obra = obras[i];
      const equipe = await p.equipeObra.create({
        data: {
          tenantId: tenant.id, obraId: obra.id,
          nome: nomes[i % nomes.length],
          especialidade: especialidades[i % especialidades.length],
          lider: trabalhadores[i % trabalhadores.length].nome,
          turno: "Diurno", status: "ATIVA",
        },
      });
      // 2 membros por equipe
      for (let j = 0; j < 2; j++) {
        const t = trabalhadores[(i * 2 + j) % trabalhadores.length];
        await p.equipeMembro.create({
          data: { equipeId: equipe.id, trabalhadorId: t.id, funcaoNaEquipe: t.funcao, ativo: true },
        }).catch(() => {});
      }
      console.log("equipe criada:", equipe.nome, "->", obra.nome);
    }
  } else {
    console.log("equipes ja existem ou sem dados base:", equipesExistentes);
  }
}

main().then(() => p.$disconnect()).catch((e) => { console.error(e); process.exit(1); });
