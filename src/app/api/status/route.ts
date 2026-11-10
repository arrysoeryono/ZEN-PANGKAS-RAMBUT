import { db } from '@/lib/db'
import { ok } from '@/lib/api-utils'

/** Status awal aplikasi: apakah sudah ada akun owner (untuk menentukan Setup vs Login) */
export async function GET() {
  const userCount = await db.user.count()
  return ok({ needsSetup: userCount === 0 })
}
