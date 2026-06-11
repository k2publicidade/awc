import prisma from "@/lib/prisma";

/**
 * ObrasAWC Notification Engine
 * Checks all trigger conditions, creates notifications, and dispatches to channels.
 * Called by a cron endpoint or scheduled job.
 */

interface NotificationPayload {
  titulo: string;
  mensagem: string;
  tipo: string;
  userId: string;
  obraId?: string;
  canais: ("APP" | "EMAIL" | "WHATSAPP" | "PUSH")[];
}

export async function checkAllTriggers() {
  const results: string[] = [];

  // 1. Etapas atrasadas
  const etapasAtrasadas = await prisma.etapa.findMany({
    where: { dataFim: { lt: new Date() }, percentualRealizado: { lt: 100 } },
    include: { obra: { select: { nome: true, engenheiroId: true } } },
  });
  for (const etapa of etapasAtrasadas) {
    if (!etapa.obra?.engenheiroId || !etapa.dataFim) continue;
    await createNotification({
      titulo: "Etapa Atrasada",
      mensagem: `${etapa.nome} da obra ${etapa.obra.nome} está atrasada. Prazo: ${etapa.dataFim.toLocaleDateString("pt-BR")}`,
      tipo: "ETAPA_ATRASADA", userId: etapa.obra.engenheiroId, obraId: etapa.obraId,
      canais: ["APP", "EMAIL", "WHATSAPP"],
    });
    results.push(`Etapa atrasada: ${etapa.nome}`);
  }

  // 2. RDO não preenchido após 17h
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const obrasAtivas = await prisma.obra.findMany({
    where: { status: "EM_ANDAMENTO" },
    include: { engenheiro: true },
  });
  for (const obra of obrasAtivas) {
    if (!obra.engenheiroId) continue;
    const rdoHoje = await prisma.rDO.findFirst({
      where: { obraId: obra.id, data: { gte: today, lt: new Date(today.getTime() + 86400000) } },
    });
    if (!rdoHoje && new Date().getHours() >= 17) {
      await createNotification({
        titulo: "RDO Não Preenchido",
        mensagem: `O RDO da obra ${obra.nome} não foi preenchido hoje.`,
        tipo: "RDO_PENDENTE", userId: obra.engenheiroId, obraId: obra.id,
        canais: ["APP", "WHATSAPP"],
      });
      results.push(`RDO pendente: ${obra.nome}`);
    }
  }

  // 3. Estoque abaixo do mínimo (saldo em uma única query agrupada)
  const materiais = await prisma.material.findMany();
  const movimentosAgrupados = await prisma.estoqueMovimento.groupBy({
    by: ["materialId", "tipo"],
    _sum: { quantidade: true },
  });
  const saldoPorMaterial = new Map<string, number>();
  for (const mov of movimentosAgrupados) {
    const atual = saldoPorMaterial.get(mov.materialId) || 0;
    const qtd = mov._sum.quantidade || 0;
    saldoPorMaterial.set(mov.materialId, mov.tipo === "ENTRADA" ? atual + qtd : atual - qtd);
  }
  for (const mat of materiais) {
    const estoqueAtual = saldoPorMaterial.get(mat.id) || 0;
    if (estoqueAtual <= (mat.estoqueMinimo || 0)) {
      const almoxarifes = await prisma.user.findMany({ where: { role: "ALMOXARIFE" }, take: 1 });
      if (almoxarifes.length > 0) {
        await createNotification({
          titulo: "Estoque Mínimo",
          mensagem: `${mat.descricao}: ${estoqueAtual} ${mat.unidade} (mín: ${mat.estoqueMinimo})`,
          tipo: "ESTOQUE_MINIMO", userId: almoxarifes[0].id,
          canais: ["APP", "EMAIL"],
        });
        results.push(`Estoque mínimo: ${mat.descricao}`);
      }
    }
  }

  // 4. Documentos vencendo em 30/15/0 dias
  const docs = await prisma.documento.findMany({
    where: { validade: { not: null }, status: { not: "VENCIDO" } },
  });
  for (const doc of docs) {
    if (!doc.validade) continue;
    const diff = Math.ceil((doc.validade.getTime() - Date.now()) / 86400000);
    if ([30, 15, 0].includes(diff)) {
      const admins = await prisma.user.findMany({ where: { role: { in: ["ADMIN", "SUPER_ADMIN"] } }, take: 1 });
      if (admins.length > 0) {
        await createNotification({
          titulo: diff === 0 ? "Documento Vencido" : "Documento Vencendo",
          mensagem: `${doc.nome} ${diff === 0 ? "venceu" : `vence em ${diff} dias`} (${doc.validade.toLocaleDateString("pt-BR")})`,
          tipo: "DOCUMENTO_VENCENDO", userId: admins[0].id, obraId: doc.obraId || undefined,
          canais: ["APP", "EMAIL"],
        });
        results.push(`Doc vencendo: ${doc.nome}`);
      }
    }
  }

  // 5. Não conformidade crítica aberta
  const ncsCriticas = await prisma.naoConformidade.findMany({
    where: { severidade: "CRITICO", status: "ABERTA" },
  });
  for (const nc of ncsCriticas) {
    const engs = await prisma.user.findMany({ where: { role: "ENGENHEIRO" }, take: 1 });
    if (engs.length > 0) {
      await createNotification({
        titulo: "NC Crítica Aberta",
        mensagem: `Não conformidade crítica: ${nc.descricao}`,
        tipo: "NC_CRITICA", userId: engs[0].id, obraId: nc.obraId || undefined,
        canais: ["APP", "EMAIL", "WHATSAPP"],
      });
      results.push(`NC crítica: ${nc.descricao.substring(0, 30)}`);
    }
  }

  // 6. Acidente recente
  const acidentes = await prisma.acidente.findMany({
    where: { createdAt: { gte: new Date(Date.now() - 3600000) } },
  });
  for (const ac of acidentes) {
    const gestores = await prisma.user.findMany({ where: { role: { in: ["ENGENHEIRO", "ADMIN", "SUPER_ADMIN"] } } });
    for (const g of gestores) {
      await createNotification({
        titulo: "Acidente Registrado",
        mensagem: `Acidente: ${ac.descricao}`,
        tipo: "ACIDENTE", userId: g.id, obraId: ac.obraId || undefined,
        canais: ["APP", "EMAIL", "WHATSAPP", "PUSH"],
      });
    }
    results.push(`Acidente: ${ac.descricao.substring(0, 30)}`);
  }

  // 7. Exame médico vencendo
  const exames = await prisma.exameMedico.findMany({
    where: { validade: { not: null } },
    include: { trabalhador: { select: { nome: true } } },
  });
  for (const ex of exames) {
    if (!ex.validade) continue;
    const diff = Math.ceil((ex.validade.getTime() - Date.now()) / 86400000);
    if ([30, 15, 0].includes(diff)) {
      const engs = await prisma.user.findMany({ where: { role: "ENGENHEIRO" }, take: 1 });
      if (engs.length > 0) {
        await createNotification({
          titulo: "Exame Médico Vencendo",
          mensagem: `Exame de ${ex.trabalhador.nome} ${diff === 0 ? "venceu" : `vence em ${diff} dias`}`,
          tipo: "EXAME_VENCENDO", userId: engs[0].id,
          canais: ["APP", "EMAIL"],
        });
        results.push(`Exame vencendo: ${ex.trabalhador.nome}`);
      }
    }
  }

  // 8. Orçamento 90% comprometido
  const obrasComOrc = await prisma.obra.findMany({
    where: { status: "EM_ANDAMENTO" },
    include: { lancamentos: true },
  });
  for (const obra of obrasComOrc) {
    const orc = await prisma.orcamento.findFirst({ where: { obraId: obra.id, status: "APROVADO" } });
    if (!orc) continue;
    const gasto = obra.lancamentos?.filter((l: any) => l.tipo === "DESPESA").reduce((s: number, l: any) => s + Number(l.valor || 0), 0) || 0;
    const valorOrcado = Number(orc.valorTotal);
    if (gasto >= valorOrcado * 0.9) {
      const dirs = await prisma.user.findMany({ where: { role: { in: ["ADMIN", "SUPER_ADMIN"] } }, take: 1 });
      if (dirs.length > 0) {
        await createNotification({
          titulo: "Orçamento 90% Comprometido",
          mensagem: `Obra ${obra.nome}: R$ ${gasto.toLocaleString("pt-BR")} de R$ ${valorOrcado.toLocaleString("pt-BR")}`,
          tipo: "ORCAMENTO_90", userId: dirs[0].id, obraId: obra.id,
          canais: ["APP", "EMAIL", "WHATSAPP"],
        });
        results.push(`Orçamento 90%: ${obra.nome}`);
      }
    }
  }

  // 9. Medição aguardando aprovação
  const medicoesPendentes = await prisma.medicao.findMany({
    where: { status: { in: ["EM_ELABORACAO", "APROVADA_ENGENHEIRO", "APROVADA_FINANCEIRO"] } },
    include: { obra: { select: { nome: true } } },
  });
  for (const med of medicoesPendentes) {
    const fins = await prisma.user.findMany({ where: { role: "FINANCEIRO" }, take: 1 });
    if (fins.length > 0) {
      await createNotification({
        titulo: "Medição Pendente de Aprovação",
        mensagem: `Medição #${med.id.substring(0, 8)} da obra ${med.obra?.nome} aguardando aprovação`,
        tipo: "MEDICAO_PENDENTE", userId: fins[0].id, obraId: med.obraId,
        canais: ["APP", "EMAIL", "WHATSAPP"],
      });
      results.push(`Medição pendente: ${med.obra?.nome}`);
    }
  }

  return results;
}

async function createNotification(payload: NotificationPayload) {
  // Avoid duplicates within 24h
  const existing = await prisma.notificacao.findFirst({
    where: {
      tipo: payload.tipo, userId: payload.userId, lida: false,
      createdAt: { gte: new Date(Date.now() - 86400000) },
    },
  });
  if (existing) return;

  const user = await prisma.user.findUnique({ where: { id: payload.userId }, select: { tenantId: true } });
  if (!user) return;

  await prisma.notificacao.create({
    data: {
      titulo: payload.titulo, mensagem: payload.mensagem, tipo: payload.tipo,
      userId: payload.userId, tenantId: user.tenantId, canal: "IN_APP", lida: false,
    },
  });

  for (const canal of payload.canais) {
    try {
      if (canal === "EMAIL") await dispatchEmail(payload);
      else if (canal === "WHATSAPP") await dispatchWhatsApp(payload);
      else if (canal === "PUSH") await dispatchPush(payload);
    } catch (e) { console.error(`Dispatch ${canal} failed:`, e); }
  }
}

async function dispatchEmail(payload: NotificationPayload) {
  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user?.email) return;

  const apiKey = process.env.RESEND_API_KEY;
  const apiUrl = process.env.RESEND_API_URL || "https://api.resend.com/emails";
  const appUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

  if (!apiKey) {
    console.log(`[EMAIL] To: ${user.email} | ${payload.titulo} — ${payload.mensagem}`);
    return;
  }

  await fetch(apiUrl, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "ObrasAWC <notificacoes@awcobras.com.br>",
      to: user.email,
      subject: `[ObrasAWC] ${payload.titulo}`,
      html: `<div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#1E2832;padding:20px;text-align:center">
          <h1 style="color:#FF6B00;margin:0;font-size:24px">ObrasAWC</h1>
        </div>
        <div style="padding:24px;background:#fff">
          <h2 style="color:#1E2832;font-size:18px">${payload.titulo}</h2>
          <p style="color:#4A5568;font-size:14px;line-height:1.6">${payload.mensagem}</p>
          <a href="${appUrl}" style="display:inline-block;background:#FF6B00;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;margin-top:16px">Ver no Sistema</a>
        </div>
      </div>`,
    }),
  });
}

async function dispatchWhatsApp(payload: NotificationPayload) {
  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user?.phone) return;

  const url = process.env.EVOLUTION_API_URL;
  const key = process.env.EVOLUTION_API_KEY;
  const instance = process.env.EVOLUTION_INSTANCE || "awc-obras";

  if (!url || !key) {
    console.log(`[WHATSAPP] To: ${user.phone} | ${payload.titulo}`);
    return;
  }

  const phone = user.phone.replace(/\D/g, "");
  await fetch(`${url}/message/sendText/${instance}`, {
    method: "POST",
    headers: { apikey: key, "Content-Type": "application/json" },
    body: JSON.stringify({
      number: `55${phone}`,
      text: `🏗️ *ObrasAWC*\n\n*${payload.titulo}*\n\n${payload.mensagem}\n\n_Acesse o sistema para mais detalhes._`,
    }),
  });
}

async function dispatchPush(payload: NotificationPayload) {
  // Push via Expo — requires push tokens stored per user
  console.log(`[PUSH] ${payload.titulo}: ${payload.mensagem}`);
}
