import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

/** Diagnostik deployment: env, koneksi database, kelengkapan tabel */
export async function GET() {
  const checks: Record<string, string> = {}
  let dbOk = false
  let tablesOk = false

  try {
    if (!process.env.DATABASE_URL) checks.DATABASE_URL = ' belum diisi'
    else checks.DATABASE_URL = 'OK'
    if (!process.env.AUTH_SECRET || process.env.AUTH_SECRET.length < 16)
      checks.AUTH_SECRET = ' belum diisi / terlalu pendek'
    else checks.AUTH_SECRET = 'OK'

    await db.$queryRaw`SELECT 1`
    dbOk = true

    const counts = await Promise.all([
      db.user.count(),
      db.service.count(),
      db.category.count(),
      db.transaction.count(),
    ])
    tablesOk = true
    return NextResponse.json({
      status: 'ok',
      database: dbOk ? 'connected' : 'failed',
      tables: tablesOk ? 'ready' : 'missing',
      counts: { users: counts[0], services: counts[1], categories: counts[2], transactions: counts[3] },
      env: checks,
      time: new Date().toISOString(),
    })
  } catch (e) {
    return NextResponse.json(
      {
        status: 'degraded',
        database: dbOk ? 'connected' : 'failed',
        tables: tablesOk ? 'ready' : 'missing',
        env: checks,
        hint: 'Jalankan `bunx prisma db push` dengan DATABASE_URL menuju Neon',
        error: e instanceof Error ? e.message : 'unknown',
      },
      { status: 503 },
    )
  }
}
