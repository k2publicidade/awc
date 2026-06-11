export function friendlyError(error: any, fallback: string) {
  const code = error?.code;
  if (code === "P2002") return "Já existe um registro com esses dados (valor duplicado).";
  if (code === "P2003") return "Registro relacionado não encontrado. Verifique os vínculos selecionados.";
  if (code === "P2025") return "Registro não encontrado.";
  const msg: string = error?.message || "";
  if (msg.includes("Argument") && msg.includes("is missing")) {
    return "Campos obrigatórios não preenchidos. Cadastre os registros relacionados (ex.: equipe, trabalhador, obra) antes de vincular.";
  }
  if (msg.includes("Invalid") && msg.includes("invocation")) {
    return "Dados inválidos ou registros relacionados ausentes. Verifique os campos e tente novamente.";
  }
  return msg || fallback;
}
