import { db } from '@/lib/db'
import { ok } from '@/lib/api-utils'

/**
 * Daftar pengguna aktif untuk layar login (tanpa auth).
 * Hanya nama & role — PIN tidak pernah disertakan.
 */
export async function GET() {
  const users = await db.user.findMany({
    where: { active: true },
    orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
    select: { id: true, name: true, role: true },
  })
  return ok({ items: users })
}
