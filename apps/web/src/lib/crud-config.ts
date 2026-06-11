export type CrudFieldType = "text" | "number" | "date" | "select" | "textarea" | "currency" | "boolean";
export type CrudRelation = "obras" | "users" | "fornecedores" | "materiais" | "trabalhadores" | "etapas" | "contratos" | "medicoes" | "inspecoes" | "equipes";
export type CrudField = { name: string; label: string; type: CrudFieldType; required?: boolean; options?: string[]; relation?: CrudRelation; placeholder?: string; list?: boolean };
export type CrudResource = { key: string; title: string; subtitle: string; model: string; idPrefix: string; fields: CrudField[]; searchFields: string[]; orderBy?: Record<string, "asc" | "desc">; include?: Record<string, unknown>; tenantScoped?: boolean };

const obraInclude = { obra: { select: { id: true, nome: true, codigo: true } } };
const userSelect = { select: { id: true, name: true } };
const etapaSelect = { select: { id: true, nome: true } };

export const resourceConfig: Record<string, CrudResource> = {
  obras: { key: "obras", title: "Obras", subtitle: "Cadastro, edição, exclusão e acompanhamento de obras", model: "obra", idPrefix: "OBR", tenantScoped: true, searchFields: ["nome", "codigo", "cidade", "estado"], orderBy: { createdAt: "desc" }, include: { engenheiro: userSelect, cliente: userSelect, _count: { select: { etapas: true, rdos: true, documentos: true, ocorrencias: true } } }, fields: [
    { name: "nome", label: "Nome da obra", type: "text", required: true, list: true },
    { name: "codigo", label: "Código", type: "text", list: true },
    { name: "tipo", label: "Tipo", type: "select", required: true, options: ["GALPAO", "EDIFICIO", "PONTE", "MURO_ARRIMO", "ELEMENTO_ISOLADO", "OUTRO"], list: true },
    { name: "status", label: "Status", type: "select", options: ["PLANEJAMENTO", "EM_ANDAMENTO", "PAUSADO", "CONCLUIDO", "CANCELADO"], list: true },
    { name: "cidade", label: "Cidade", type: "text", list: true },
    { name: "estado", label: "Estado", type: "text" },
    { name: "valorContratado", label: "Valor contratado", type: "currency", list: true },
    { name: "dataInicio", label: "Data início", type: "date" },
    { name: "dataPrevisaoFim", label: "Previsão fim", type: "date", list: true },
    { name: "engenheiroId", label: "Engenheiro", type: "select", relation: "users" },
    { name: "clienteId", label: "Cliente", type: "select", relation: "users" },
    { name: "descricao", label: "Descrição", type: "textarea" }
  ]},

  etapas: { key: "etapas", title: "Cronograma / Etapas", subtitle: "Etapas, prazos, avanço físico e valor financeiro", model: "etapa", idPrefix: "ETP", searchFields: ["nome", "descricao"], orderBy: { ordem: "asc" }, include: obraInclude, fields: [
    { name: "obraId", label: "Obra", type: "select", relation: "obras", required: true, list: true },
    { name: "nome", label: "Etapa", type: "text", required: true, list: true },
    { name: "descricao", label: "Descrição", type: "textarea" },
    { name: "dataInicio", label: "Início previsto", type: "date", list: true },
    { name: "dataFim", label: "Fim previsto", type: "date", list: true },
    { name: "percentualPrevisto", label: "% previsto", type: "number", list: true },
    { name: "percentualRealizado", label: "% realizado", type: "number", list: true },
    { name: "valorFinanceiro", label: "Valor", type: "currency", list: true },
    { name: "ordem", label: "Ordem", type: "number" }
  ]},

  rdos: { key: "rdos", title: "RDO", subtitle: "Relatórios diários de obra", model: "rDO", idPrefix: "RDO", searchFields: ["observacoes", "assinaturaNome"], orderBy: { data: "desc" }, include: { obra: { select: { id: true, nome: true } }, responsavel: userSelect }, fields: [
    { name: "obraId", label: "Obra", type: "select", relation: "obras", required: true, list: true },
    { name: "numero", label: "Número", type: "number", list: true },
    { name: "data", label: "Data", type: "date", required: true, list: true },
    { name: "responsavelId", label: "Responsável", type: "select", relation: "users", required: true },
    { name: "status", label: "Status", type: "select", options: ["RASCUNHO", "APROVADO"], list: true },
    { name: "climaManha", label: "Clima manhã", type: "select", options: ["ENSOLARADO", "NUBLADO", "CHUVOSO", "PARCIALMENTE_NUBLADO"] },
    { name: "temperaturaManha", label: "Temp. manhã", type: "number" },
    { name: "observacoes", label: "Observações", type: "textarea", list: true }
  ]},

  financeiro: { key: "financeiro", title: "Lançamentos Financeiros", subtitle: "Fluxo de caixa, contas a pagar e receber", model: "lancamentoFinanceiro", idPrefix: "FIN", searchFields: ["descricao", "categoria", "centroCusto", "nfNumero"], orderBy: { dataVencimento: "desc" }, include: obraInclude, fields: [
    { name: "obraId", label: "Obra", type: "select", relation: "obras", required: true, list: true },
    { name: "tipo", label: "Tipo", type: "select", options: ["RECEITA", "DESPESA"], required: true, list: true },
    { name: "descricao", label: "Descrição", type: "text", required: true, list: true },
    { name: "categoria", label: "Categoria", type: "text", list: true },
    { name: "valor", label: "Valor", type: "currency", required: true, list: true },
    { name: "dataVencimento", label: "Vencimento", type: "date", required: true, list: true },
    { name: "dataPagamento", label: "Pagamento", type: "date", list: true },
    { name: "status", label: "Status", type: "select", options: ["ABERTO", "PAGO", "VENCIDO", "CANCELADO"], list: true },
    { name: "centroCusto", label: "Centro de custo", type: "text" },
    { name: "nfNumero", label: "NF número", type: "text" }
  ]},

  medicoes: { key: "medicoes", title: "Medições", subtitle: "Medições de serviços por obra e período", model: "medicao", idPrefix: "MED", searchFields: ["observacao"], orderBy: { createdAt: "desc" }, include: obraInclude, fields: [
    { name: "obraId", label: "Obra", type: "select", relation: "obras", required: true, list: true },
    { name: "numero", label: "Número", type: "number", required: true, list: true },
    { name: "periodoInicio", label: "Início período", type: "date", required: true, list: true },
    { name: "periodoFim", label: "Fim período", type: "date", required: true, list: true },
    { name: "valorTotal", label: "Valor medido", type: "currency", list: true },
    { name: "status", label: "Status", type: "select", options: ["EM_ELABORACAO", "APROVADA_ENGENHEIRO", "APROVADA_FINANCEIRO", "APROVADA_CLIENTE", "REJEITADA"], list: true },
    { name: "observacao", label: "Observação", type: "textarea" }
  ]},

  materiais: { key: "materiais", title: "Materiais", subtitle: "Cadastro e controle de materiais", model: "material", idPrefix: "MAT", tenantScoped: true, searchFields: ["codigo", "descricao", "categoria"], orderBy: { descricao: "asc" }, fields: [
    { name: "codigo", label: "Código", type: "text", list: true },
    { name: "descricao", label: "Material", type: "text", required: true, list: true },
    { name: "unidade", label: "Unidade", type: "text", required: true, list: true },
    { name: "categoria", label: "Categoria", type: "text", list: true },
    { name: "estoqueMinimo", label: "Estoque mínimo", type: "number", list: true },
    { name: "precoMedio", label: "Preço médio", type: "currency", list: true }
  ]},

  estoqueMovimentos: { key: "estoqueMovimentos", title: "Movimentações de Estoque", subtitle: "Entradas, saídas, perdas e consumo por obra", model: "estoqueMovimento", idPrefix: "MOV", searchFields: ["nfNumero", "lote", "localizacao", "justificativa"], orderBy: { data: "desc" }, include: { obra: { select: { id: true, nome: true } }, material: { select: { id: true, descricao: true, codigo: true } }, fornecedor: { select: { id: true, razaoSocial: true, nomeFantasia: true } }, etapa: etapaSelect, responsavel: userSelect }, fields: [
    { name: "obraId", label: "Obra", type: "select", relation: "obras", required: true, list: true },
    { name: "materialId", label: "Material", type: "select", relation: "materiais", required: true, list: true },
    { name: "tipo", label: "Tipo", type: "select", options: ["ENTRADA", "SAIDA", "PERDA"], required: true, list: true },
    { name: "quantidade", label: "Quantidade", type: "number", required: true, list: true },
    { name: "precoUnitario", label: "Preço unitário", type: "currency", list: true },
    { name: "fornecedorId", label: "Fornecedor", type: "select", relation: "fornecedores" },
    { name: "etapaId", label: "Etapa", type: "select", relation: "etapas" },
    { name: "responsavelId", label: "Responsável", type: "select", relation: "users" },
    { name: "data", label: "Data", type: "date", list: true },
    { name: "nfNumero", label: "NF", type: "text" },
    { name: "localizacao", label: "Localização", type: "text" },
    { name: "justificativa", label: "Justificativa", type: "textarea" }
  ]},

  requisicoes: { key: "requisicoes", title: "Requisições de Compra", subtitle: "Solicitações, aprovações e entregas", model: "requisicaoCompra", idPrefix: "REQ", searchFields: ["justificativa", "observacao"], orderBy: { dataSolicitacao: "desc" }, include: { obra: { select: { id: true, nome: true } }, material: { select: { id: true, descricao: true, codigo: true } }, solicitante: userSelect, aprovador: userSelect }, fields: [
    { name: "obraId", label: "Obra", type: "select", relation: "obras", required: true, list: true },
    { name: "materialId", label: "Material", type: "select", relation: "materiais", required: true, list: true },
    { name: "solicitanteId", label: "Solicitante", type: "select", relation: "users", required: true, list: true },
    { name: "quantidade", label: "Quantidade", type: "number", required: true, list: true },
    { name: "status", label: "Status", type: "select", options: ["PENDENTE", "APROVADA", "REPROVADA", "ENTREGUE"], list: true },
    { name: "aprovadorId", label: "Aprovador", type: "select", relation: "users" },
    { name: "dataSolicitacao", label: "Solicitação", type: "date", list: true },
    { name: "dataAprovacao", label: "Aprovação", type: "date" },
    { name: "justificativa", label: "Justificativa", type: "textarea" },
    { name: "observacao", label: "Observação", type: "textarea" }
  ]},

  fornecedores: { key: "fornecedores", title: "Fornecedores", subtitle: "Cadastro de fornecedores e subempreiteiros", model: "fornecedor", idPrefix: "FOR", tenantScoped: true, searchFields: ["razaoSocial", "nomeFantasia", "cnpj", "categoria"], orderBy: { razaoSocial: "asc" }, fields: [
    { name: "razaoSocial", label: "Razão social", type: "text", required: true, list: true },
    { name: "nomeFantasia", label: "Nome fantasia", type: "text", list: true },
    { name: "cnpj", label: "CNPJ", type: "text", required: true, list: true },
    { name: "categoria", label: "Categoria", type: "text", list: true },
    { name: "telefone", label: "Telefone", type: "text" },
    { name: "email", label: "E-mail", type: "text" },
    { name: "contato", label: "Contato", type: "text" },
    { name: "isActive", label: "Ativo", type: "boolean", list: true }
  ]},

  equipe: { key: "equipe", title: "Trabalhadores", subtitle: "Cadastro de colaboradores e funções", model: "trabalhador", idPrefix: "COL", tenantScoped: true, searchFields: ["nome", "cpf", "funcao", "email"], orderBy: { nome: "asc" }, fields: [
    { name: "nome", label: "Nome", type: "text", required: true, list: true },
    { name: "cpf", label: "CPF", type: "text", required: true, list: true },
    { name: "funcao", label: "Função", type: "text", required: true, list: true },
    { name: "vinculo", label: "Vínculo", type: "select", options: ["CLT", "TERCEIRIZADO", "AUTONOMO", "SUBEMPREITEIRO"], list: true },
    { name: "telefone", label: "Telefone", type: "text" },
    { name: "email", label: "E-mail", type: "text" },
    { name: "dataAdmissao", label: "Admissão", type: "date", list: true },
    { name: "isActive", label: "Ativo", type: "boolean", list: true }
  ]},

  equipes: { key: "equipes", title: "Equipes por Obra", subtitle: "Cadastro de equipes, liderança, especialidade e vínculo com obra", model: "equipeObra", idPrefix: "EQP", tenantScoped: true, searchFields: ["nome", "lider", "especialidade", "turno"], orderBy: { createdAt: "desc" }, include: { obra: { select: { id: true, nome: true, codigo: true } }, _count: { select: { membros: true } } }, fields: [
    { name: "obraId", label: "Obra", type: "select", relation: "obras", required: true, list: true },
    { name: "nome", label: "Nome da equipe", type: "text", required: true, list: true },
    { name: "lider", label: "Líder / Encarregado", type: "text", list: true },
    { name: "especialidade", label: "Especialidade", type: "text", list: true },
    { name: "turno", label: "Turno", type: "select", options: ["DIURNO", "NOTURNO", "INTEGRAL"], list: true },
    { name: "status", label: "Status", type: "select", options: ["ATIVA", "INATIVA"], list: true },
    { name: "observacoes", label: "Observações", type: "textarea" }
  ]},

  equipeMembros: { key: "equipeMembros", title: "Membros da Equipe", subtitle: "Vincule funcionários às equipes e controle sua alocação", model: "equipeMembro", idPrefix: "MEM", searchFields: ["funcaoNaEquipe", "observacoes"], orderBy: { createdAt: "desc" }, include: { equipe: { select: { id: true, nome: true, obra: { select: { nome: true, codigo: true } } } }, trabalhador: { select: { id: true, nome: true, funcao: true } } }, fields: [
    { name: "equipeId", label: "Equipe", type: "select", relation: "equipes", required: true, list: true },
    { name: "trabalhadorId", label: "Funcionário", type: "select", relation: "trabalhadores", required: true, list: true },
    { name: "funcaoNaEquipe", label: "Função na equipe", type: "text", list: true },
    { name: "dataEntrada", label: "Entrada", type: "date", list: true },
    { name: "dataSaida", label: "Saída", type: "date" },
    { name: "ativo", label: "Ativo", type: "boolean", list: true },
    { name: "observacoes", label: "Observações", type: "textarea" }
  ]},

  presencas: { key: "presencas", title: "Alocação e Presença", subtitle: "Vínculo do funcionário com obra, data e horas", model: "presenca", idPrefix: "PRE", searchFields: [], orderBy: { data: "desc" }, include: { obra: { select: { id: true, nome: true } }, trabalhador: { select: { id: true, nome: true, funcao: true } } }, fields: [
    { name: "obraId", label: "Obra", type: "select", relation: "obras", required: true, list: true },
    { name: "trabalhadorId", label: "Funcionário", type: "select", relation: "trabalhadores", required: true, list: true },
    { name: "data", label: "Data", type: "date", required: true, list: true },
    { name: "presente", label: "Presente", type: "boolean", list: true },
    { name: "horasTrabalhadas", label: "Horas", type: "number", list: true },
    { name: "horasExtras", label: "Horas extras", type: "number", list: true }
  ]},

  epis: { key: "epis", title: "EPIs", subtitle: "Entrega, validade e controle de EPIs", model: "ePI", idPrefix: "EPI", searchFields: ["tipo", "descricao", "ca"], orderBy: { dataEntrega: "desc" }, include: { trabalhador: { select: { id: true, nome: true, funcao: true } } }, fields: [
    { name: "trabalhadorId", label: "Funcionário", type: "select", relation: "trabalhadores", required: true, list: true },
    { name: "tipo", label: "Tipo", type: "text", required: true, list: true },
    { name: "descricao", label: "Descrição", type: "text", required: true, list: true },
    { name: "ca", label: "CA", type: "text", list: true },
    { name: "quantidade", label: "Quantidade", type: "number", list: true },
    { name: "dataEntrega", label: "Entrega", type: "date", list: true },
    { name: "validade", label: "Validade", type: "date", list: true }
  ]},

  treinamentos: { key: "treinamentos", title: "Treinamentos", subtitle: "NRs, certificados e vencimentos", model: "treinamento", idPrefix: "TRN", searchFields: ["descricao"], orderBy: { dataRealizacao: "desc" }, include: { trabalhador: { select: { id: true, nome: true, funcao: true } } }, fields: [
    { name: "trabalhadorId", label: "Funcionário", type: "select", relation: "trabalhadores", required: true, list: true },
    { name: "nr", label: "NR", type: "select", options: ["NR_10", "NR_18", "NR_35", "NR_11", "NR_06", "OUTRO"], required: true, list: true },
    { name: "descricao", label: "Descrição", type: "text", required: true, list: true },
    { name: "dataRealizacao", label: "Realização", type: "date", required: true, list: true },
    { name: "validade", label: "Validade", type: "date", list: true },
    { name: "certificadoUrl", label: "Certificado URL", type: "text" }
  ]},

  documentos: { key: "documentos", title: "Documentos", subtitle: "Documentos técnicos, laudos e databook", model: "documento", idPrefix: "DOC", searchFields: ["nome", "numero", "descricao", "profissionalResponsavel"], orderBy: { createdAt: "desc" }, include: obraInclude, fields: [
    { name: "obraId", label: "Obra", type: "select", relation: "obras", required: true, list: true },
    { name: "nome", label: "Nome", type: "text", required: true, list: true },
    { name: "categoria", label: "Categoria", type: "select", options: ["PROJETO", "ART_RRT", "ENSAIO", "LAUDO", "NF", "CONTRATO", "ALVARA", "LICENCA_AMBIENTAL", "ISS", "SEGURO", "MANUAL", "OUTRO"], list: true },
    { name: "numero", label: "Número", type: "text", list: true },
    { name: "profissionalResponsavel", label: "Profissional responsável", type: "text" },
    { name: "status", label: "Status", type: "select", options: ["PENDENTE", "RECEBIDO", "EM_ANALISE", "APROVADO", "VENCIDO"], list: true },
    { name: "dataEmissao", label: "Emissão", type: "date" },
    { name: "validade", label: "Validade", type: "date", list: true },
    { name: "arquivoUrl", label: "URL arquivo", type: "text" },
    { name: "descricao", label: "Descrição", type: "textarea" }
  ]},

  qualidade: { key: "qualidade", title: "Não Conformidades", subtitle: "NCs e ações corretivas", model: "naoConformidade", idPrefix: "NC", searchFields: ["descricao", "causaRaiz", "acaoCorretiva"], orderBy: { createdAt: "desc" }, include: { obra: { select: { id: true, nome: true } }, etapa: etapaSelect, responsavel: userSelect }, fields: [
    { name: "obraId", label: "Obra", type: "select", relation: "obras", required: true, list: true },
    { name: "etapaId", label: "Etapa", type: "select", relation: "etapas" },
    { name: "descricao", label: "Não conformidade", type: "textarea", required: true, list: true },
    { name: "causaRaiz", label: "Causa raiz", type: "textarea" },
    { name: "severidade", label: "Severidade", type: "select", options: ["BAIXO", "MEDIO", "ALTO", "CRITICO"], list: true },
    { name: "responsavelId", label: "Responsável", type: "select", relation: "users" },
    { name: "prazo", label: "Prazo", type: "date", list: true },
    { name: "status", label: "Status", type: "select", options: ["ABERTA", "EM_EXECUCAO", "VERIFICACAO", "ENCERRADA"], list: true },
    { name: "acaoCorretiva", label: "Ação corretiva", type: "textarea" }
  ]},

  inspecoes: { key: "inspecoes", title: "Inspeções", subtitle: "Inspeções de qualidade por etapa", model: "inspecao", idPrefix: "INSP", searchFields: ["observacao"], orderBy: { data: "desc" }, include: { obra: { select: { id: true, nome: true } }, etapa: etapaSelect, responsavel: userSelect }, fields: [
    { name: "obraId", label: "Obra", type: "select", relation: "obras", required: true, list: true },
    { name: "etapaId", label: "Etapa", type: "select", relation: "etapas", required: true, list: true },
    { name: "tipo", label: "Tipo", type: "select", options: ["FUNDACAO", "MONTAGEM_PRE_MOLDADO", "ESTRUTURA", "ALVENARIA", "ELETRICA", "HIDRAULICA", "IMPERMEABILIZACAO", "ACABAMENTO", "COBERTURA", "COMISSIONAMENTO"], required: true, list: true },
    { name: "responsavelId", label: "Responsável", type: "select", relation: "users", required: true, list: true },
    { name: "data", label: "Data", type: "date", list: true },
    { name: "resultado", label: "Resultado", type: "select", options: ["CONFORME", "NAO_CONFORME"], required: true, list: true },
    { name: "observacao", label: "Observação", type: "textarea" }
  ]},

  seguranca: { key: "seguranca", title: "DDS", subtitle: "Diálogos de segurança e prevenção", model: "dDS", idPrefix: "DDS", searchFields: ["tema", "participantes"], orderBy: { data: "desc" }, include: { obra: { select: { id: true, nome: true } }, responsavel: userSelect }, fields: [
    { name: "obraId", label: "Obra", type: "select", relation: "obras", required: true, list: true },
    { name: "tema", label: "Tema DDS", type: "text", required: true, list: true },
    { name: "participantes", label: "Participantes", type: "textarea", list: true },
    { name: "responsavelId", label: "Responsável", type: "select", relation: "users", required: true, list: true },
    { name: "data", label: "Data", type: "date", list: true }
  ]},

  acidentes: { key: "acidentes", title: "Incidentes e Acidentes", subtitle: "Registros de incidentes, quase acidentes e CAT", model: "acidente", idPrefix: "ACI", searchFields: ["descricao", "local", "testemunhas", "causaRaiz", "acaoPreventiva"], orderBy: { dataHora: "desc" }, include: { obra: { select: { id: true, nome: true } }, vitima: { select: { id: true, nome: true, funcao: true } } }, fields: [
    { name: "obraId", label: "Obra", type: "select", relation: "obras", required: true, list: true },
    { name: "tipo", label: "Tipo", type: "select", options: ["COM_AFASTAMENTO", "SEM_AFASTAMENTO", "QUASE_ACIDENTE", "INCIDENTE"], required: true, list: true },
    { name: "dataHora", label: "Data", type: "date", required: true, list: true },
    { name: "local", label: "Local", type: "text", list: true },
    { name: "descricao", label: "Descrição", type: "textarea", required: true, list: true },
    { name: "vitimaId", label: "Vítima", type: "select", relation: "trabalhadores" },
    { name: "testemunhas", label: "Testemunhas", type: "textarea" },
    { name: "causaRaiz", label: "Causa raiz", type: "textarea" },
    { name: "acaoPreventiva", label: "Ação preventiva", type: "textarea" },
    { name: "catAberto", label: "CAT aberto", type: "boolean", list: true }
  ]},

  galeria: { key: "galeria", title: "Galeria", subtitle: "Fotos por obra, etapa e RDO", model: "foto", idPrefix: "FTO", searchFields: ["legenda", "tags", "url"], orderBy: { data: "desc" }, include: { obra: { select: { id: true, nome: true } }, etapa: etapaSelect }, fields: [
    { name: "obraId", label: "Obra", type: "select", relation: "obras", required: true, list: true },
    { name: "etapaId", label: "Etapa", type: "select", relation: "etapas" },
    { name: "url", label: "URL da foto", type: "text", required: true },
    { name: "legenda", label: "Legenda", type: "text", list: true },
    { name: "tags", label: "Tags", type: "text", list: true },
    { name: "data", label: "Data", type: "date", list: true }
  ]},

  orcamentos: { key: "orcamentos", title: "Orçamentos", subtitle: "Propostas comerciais e versões", model: "orcamento", idPrefix: "ORC", searchFields: ["justificativa"], orderBy: { createdAt: "desc" }, include: obraInclude, fields: [
    { name: "obraId", label: "Obra", type: "select", relation: "obras", required: true, list: true },
    { name: "versao", label: "Versão", type: "number", list: true },
    { name: "status", label: "Status", type: "select", options: ["EM_ELABORACAO", "ENVIADO", "APROVADO", "REPROVADO", "CANCELADO"], list: true },
    { name: "valorTotal", label: "Valor total", type: "currency", list: true },
    { name: "bdi", label: "BDI %", type: "number" },
    { name: "encargosSociais", label: "Encargos %", type: "number" },
    { name: "justificativa", label: "Justificativa", type: "textarea" }
  ]},

  contratos: { key: "contratos", title: "Contratos", subtitle: "Contratos de fornecedores e subempreiteiros", model: "contrato", idPrefix: "CTR", searchFields: ["numero", "objeto", "observacoes"], orderBy: { createdAt: "desc" }, include: { obra: { select: { id: true, nome: true } }, fornecedor: { select: { id: true, nomeFantasia: true, razaoSocial: true } } }, fields: [
    { name: "obraId", label: "Obra", type: "select", relation: "obras", required: true, list: true },
    { name: "fornecedorId", label: "Fornecedor", type: "select", relation: "fornecedores", required: true },
    { name: "numero", label: "Número", type: "text", list: true },
    { name: "objeto", label: "Objeto", type: "textarea", required: true, list: true },
    { name: "tipo", label: "Tipo", type: "select", options: ["FORNECIMENTO", "SUBEMPREITADA", "LOCACAO", "SERVICO"], list: true },
    { name: "valor", label: "Valor", type: "currency", list: true },
    { name: "dataInicio", label: "Início", type: "date" },
    { name: "dataFim", label: "Fim", type: "date", list: true },
    { name: "status", label: "Status", type: "select", options: ["EM_NEGOCIACAO", "VIGENTE", "VENCIDO", "ENCERRADO", "EM_RENOVACAO"], list: true },
    { name: "observacoes", label: "Observações", type: "textarea" }
  ]},

  ocorrencias: { key: "ocorrencias", title: "Ocorrências", subtitle: "Desvios, problemas e decisões de obra", model: "ocorrencia", idPrefix: "OCR", searchFields: ["descricao", "resolucao"], orderBy: { dataAbertura: "desc" }, include: { obra: { select: { id: true, nome: true } }, etapa: etapaSelect }, fields: [
    { name: "obraId", label: "Obra", type: "select", relation: "obras", required: true, list: true },
    { name: "etapaId", label: "Etapa", type: "select", relation: "etapas" },
    { name: "tipo", label: "Tipo", type: "select", options: ["PROBLEMA_TECNICO", "PARALISACAO", "ACIDENTE", "DECISAO_PROJETO", "INTERFERENCIA", "INTEMPERIE", "OUTRO"], list: true },
    { name: "descricao", label: "Descrição", type: "textarea", required: true, list: true },
    { name: "impactoDias", label: "Impacto dias", type: "number", list: true },
    { name: "status", label: "Status", type: "select", options: ["ABERTO", "EM_TRATAMENTO", "ENCERRADO"], list: true },
    { name: "resolucao", label: "Resolução", type: "textarea" }
  ]},

  notificacoes: { key: "notificacoes", title: "Notificações", subtitle: "Alertas internos e comunicação", model: "notificacao", idPrefix: "NOT", tenantScoped: true, searchFields: ["titulo", "mensagem", "tipo"], orderBy: { createdAt: "desc" }, include: { user: userSelect }, fields: [
    { name: "userId", label: "Usuário", type: "select", relation: "users", required: true, list: true },
    { name: "tipo", label: "Tipo", type: "text", required: true, list: true },
    { name: "titulo", label: "Título", type: "text", required: true, list: true },
    { name: "mensagem", label: "Mensagem", type: "textarea", required: true, list: true },
    { name: "canal", label: "Canal", type: "select", options: ["IN_APP", "EMAIL", "WHATSAPP", "PUSH"], list: true },
    { name: "lida", label: "Lida", type: "boolean", list: true }
  ]},
};

export const moduleResourceMap: Record<string, string> = {
  dashboard: "obras", obras: "obras", cronograma: "etapas", andamento: "etapas", rdo: "rdos", financeiro: "financeiro", materiais: "materiais", equipe: "equipe", documentos: "documentos", qualidade: "qualidade", seguranca: "seguranca", galeria: "galeria", relatorios: "obras", orcamentos: "orcamentos", orcador: "orcamentos", contratos: "contratos", ocorrencias: "ocorrencias", notificacoes: "notificacoes",
};
