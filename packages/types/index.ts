/**
 * ObrasAWC - Shared TypeScript Types
 * AWC Pré Moldados - Construction Management System
 */

// ============================================================
// Enums
// ============================================================

export enum Role {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  ENGENHEIRO = 'ENGENHEIRO',
  ENCARREGADO = 'ENCARREGADO',
  FINANCEIRO = 'FINANCEIRO',
  ALMOXARIFE = 'ALMOXARIFE',
  CLIENTE = 'CLIENTE',
}

// ============================================================
// User Types
// ============================================================

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatarUrl?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================
// Project Types
// ============================================================

export enum ProjectStatus {
  PLANEJAMENTO = 'PLANEJAMENTO',
  EM_ANDAMENTO = 'EM_ANDAMENTO',
  PAUSADO = 'PAUSADO',
  CONCLUIDO = 'CONCLUIDO',
  CANCELADO = 'CANCELADO',
}

export interface Project {
  id: string;
  name: string;
  code: string;
  description?: string;
  status: ProjectStatus;
  clientId: string;
  startDate: Date;
  estimatedEndDate: Date;
  actualEndDate?: Date;
  budget: number;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================
// Auth Types
// ============================================================

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatarUrl?: string;
}

// ============================================================
// API Types
// ============================================================

export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

export interface ApiError {
  message: string;
  statusCode: number;
  errors?: Record<string, string[]>;
}
