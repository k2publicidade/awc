import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string, pattern = "dd/MM/yyyy"): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, pattern, { locale: ptBR });
}

export function formatCurrency(value: number | string): string {
  const v = typeof value === "string" ? parseFloat(value) : value;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(v);
}

/** Alias for formatCurrency — used by page components */
export const formatCurrencyBRL = formatCurrency;

/** Alias for formatDate — used by page components */
export const formatDateBRL = formatDate;

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function formatCNPJ(cnpj: string): string {
  const digits = cnpj.replace(/\D/g, "");
  return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}

export function formatCPF(cpf: string): string {
  const digits = cpf.replace(/\D/g, "");
  return digits.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
}

export function generateCode(prefix: string): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();
}

export function statusColor(status: string): string {
  const map: Record<string, string> = {
    EM_ANDAMENTO: "bg-awc-info",
    PLANEJAMENTO: "bg-awc-gray",
    PAUSADO: "bg-awc-warning",
    CONCLUIDO: "bg-awc-success",
    CANCELADO: "bg-awc-danger",
    APROVADO: "bg-awc-success",
    REPROVADO: "bg-awc-danger",
    PENDENTE: "bg-awc-warning",
    VENCIDO: "bg-awc-danger",
    VIGENTE: "bg-awc-success",
    ABERTO: "bg-awc-warning",
    PAGO: "bg-awc-success",
    ABERTA: "bg-awc-warning",
    CRITICO: "bg-awc-danger",
  };
  return map[status] || "bg-awc-gray";
}
