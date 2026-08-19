import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
});

export const registerSchema = z
  .object({
    name: z.string().trim().min(2, 'Nome deve ter no mínimo 2 caracteres'),
    email: z.string().trim().toLowerCase().email('Email inválido'),
    password: z
      .string()
      .min(8, 'Senha deve ter no mínimo 8 caracteres')
      .regex(/[A-Za-z]/, 'Inclua ao menos uma letra')
      .regex(/[0-9]/, 'Inclua ao menos um número'),
    confirmPassword: z.string(),
    role: z.enum([
      'SUPER_ADMIN',
      'ADMIN',
      'ENGENHEIRO',
      'ENCARREGADO',
      'FINANCEIRO',
      'ALMOXARIFE',
      'CLIENTE',
    ]),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Senhas não conferem',
    path: ['confirmPassword'],
  });

export const signupSchema = z
  .object({
    companyName: z.string().trim().min(2, 'Informe o nome da empresa'),
    name: z.string().trim().min(2, 'Informe seu nome'),
    email: z.string().trim().toLowerCase().email('E-mail inválido'),
    phone: z.string().trim().optional(),
    password: z
      .string()
      .min(8, 'A senha deve ter pelo menos 8 caracteres')
      .regex(/[A-Za-z]/, 'Inclua ao menos uma letra')
      .regex(/[0-9]/, 'Inclua ao menos um número'),
    confirmPassword: z.string(),
    plan: z.enum(['STARTER', 'PRO', 'BUSINESS']).default('PRO'),
    acceptTerms: z.preprocess(
      (val) => val === true || val === 'true' || val === 'on' || val === 1 || val === '1',
      z.literal(true, { message: 'Você deve aceitar os termos de uso' })
    ),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas não conferem',
    path: ['confirmPassword'],
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Senha atual é obrigatória'),
    newPassword: z
      .string()
      .min(10, 'Nova senha deve ter no mínimo 10 caracteres')
      .regex(/[a-z]/, 'Inclua ao menos uma letra minúscula')
      .regex(/[A-Z]/, 'Inclua ao menos uma letra maiúscula')
      .regex(/[0-9]/, 'Inclua ao menos um número'),
    confirmNewPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: 'Senhas não conferem',
    path: ['confirmNewPassword'],
  });

export const obraSchema = z.object({
  nome: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  codigo: z.string().min(2, 'Código é obrigatório'),
  tipo: z.enum(['GALPAO', 'EDIFICIO', 'PONTE', 'MURO_ARRIMO', 'ELEMENTO_ISOLADO', 'OUTRO']),
  endereco: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  valorContratado: z.number().min(0, 'Valor deve ser positivo'),
  dataInicio: z.string().optional(),
  dataPrevisaoFim: z.string().optional(),
  engenheiroId: z.string().optional(),
  clienteId: z.string().optional(),
  descricao: z.string().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type ObraInput = z.infer<typeof obraSchema>;
