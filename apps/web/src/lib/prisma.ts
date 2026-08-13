/**
 * RIGOR - Prisma Client (singleton)
 */
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as DynamicValue as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
