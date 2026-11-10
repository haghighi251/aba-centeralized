import { PrismaClient } from '@prisma/client';

/**
 * Creates a configured PrismaClient instance.
 *
 * - Development: logs queries, errors, and warnings.
 * - Production: logs errors only to keep output clean.
 *
 * Use this factory when you need a fresh client (e.g. in tests).
 * For application code, use the singleton exported from index.ts instead.
 */
export function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development'
      ? ['query', 'error', 'warn']
      : ['error'],
  });
}

/**
 * Global singleton to prevent multiple PrismaClient instances.
 *
 * In development, module hot-reload (ts-node-dev / Next.js HMR) re-evaluates
 * modules on every file change. Without the global guard a new PrismaClient
 * would be created on each reload, eventually exhausting the connection pool.
 *
 * The globalThis assignment ensures the same instance is reused across reloads.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma: PrismaClient =
  globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
