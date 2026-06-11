import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
});

export const registerSchema = z.object({
  name: z.string().min(2, "Nome deve ter no mínimo 2 caracteres"),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
  confirmPassword: z.string(),
  role: z.enum([
    "SUPER_ADMIN",
    "ADMIN",
    "ENGENHEIRO",
    "ENCARREGADO",
    "FINANCEIRO",
    "ALMOXARIFE",
    "CLIENTE",
  ]),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Senhas não conferem",
  path: ["confirmPassword"],
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Senha atual é obrigatória"),
  newPassword: z.string().min(6, "Nova senha deve ter no mínimo 6 caracteres"),
  confirmNewPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmNewPassword, {
  message: "Senhas não conferem",
  path: ["confirmNewPassword"],
});

export const obraSchema = z.object({
  nome: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
  codigo: z.string().min(2, "Código é obrigatório"),
  tipo: z.enum(["GALPAO", "EDIFICIO", "PONTE", "MURO_ARRIMO", "ELEMENTO_ISOLADO", "OUTRO"]),
  endereco: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  valorContratado: z.number().min(0, "Valor deve ser positivo"),
  dataInicio: z.string().optional(),
  dataPrevisaoFim: z.string().optional(),
  engenheiroId: z.string().optional(),
  clienteId: z.string().optional(),
  descricao: z.string().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type ObraInput = z.infer<typeof obraSchema>;
