import { PrismaClient } from '@prisma/client'

/**
 * Fallback aman: beberapa environment sandbox memaksa DATABASE_URL lama (SQLite).
 * Skema ini PostgreSQL — bila URL tidak valid, pakai Postgres portabel lokal.
 * Di produksi (Vercel + Neon), DATABASE_URL yang sah selalu diprioritaskan.
 */
function resolveDatabaseUrl(): string | undefined {
  const url = process.env.DATABASE_URL
  if (!url || url.startsWith('file:')) {
    return process.env.DIRECT_DATABASE_URL?.startsWith('postgresql')
      ? process.env.DIRECT_DATABASE_URL
      : 'postgresql://postgres@localhost:5433/postgres'
  }
  return undefined
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['error', 'warn'],
    datasources: resolveDatabaseUrl() ? { db: { url: resolveDatabaseUrl()! } } : undefined,
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
