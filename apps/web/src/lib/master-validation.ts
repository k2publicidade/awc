import { z } from 'zod';

const optionalText = z.string().trim().max(160).optional().nullable();

export const createTenantSchema = z.object({
  name: z.string().trim().min(2).max(120),
  document: optionalText,
  phone: optionalText,
  billingEmail: z.string().trim().email().max(160),
  plan: z.enum(['STARTER', 'PRO', 'BUSINESS']).default('STARTER'),
  subscriptionStatus: z.enum(['TRIAL', 'ATIVA', 'INADIMPLENTE', 'CANCELADA']).default('TRIAL'),
  adminName: z.string().trim().min(2).max(120),
  adminEmail: z.string().trim().email().max(160),
  temporaryPassword: z
    .string()
    .min(10, 'A senha deve ter ao menos 10 caracteres')
    .max(128)
    .regex(/[a-z]/, 'Inclua uma letra minúscula')
    .regex(/[A-Z]/, 'Inclua uma letra maiúscula')
    .regex(/[0-9]/, 'Inclua um número'),
});

export const updateTenantSchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    document: optionalText,
    phone: optionalText,
    billingEmail: z.string().trim().email().max(160).optional().nullable(),
    plan: z.enum(['STARTER', 'PRO', 'BUSINESS']).optional(),
    subscriptionStatus: z.enum(['TRIAL', 'ATIVA', 'INADIMPLENTE', 'CANCELADA']).optional(),
    trialEndsAt: z.string().datetime().optional().nullable(),
    isActive: z.boolean().optional(),
  })
  .strict();

export const updateMasterUserSchema = z.object({ isActive: z.boolean() }).strict();

export const masterPasswordSchema = z
  .object({
    password: z
      .string()
      .min(10, 'A senha deve ter ao menos 10 caracteres')
      .max(128)
      .regex(/[a-z]/, 'Inclua uma letra minúscula')
      .regex(/[A-Z]/, 'Inclua uma letra maiúscula')
      .regex(/[0-9]/, 'Inclua um número'),
  })
  .strict();

export function validationMessage(error: z.ZodError) {
  return error.issues[0]?.message || 'Dados inválidos';
}

export function slugifyTenant(value: string) {
  return (
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 56) || 'empresa'
  );
}
