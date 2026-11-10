import { db } from '@/lib/db'
import { getSession, ok } from '@/lib/api-utils'

/** Info sesi pengguna saat ini */
export async function GET() {
  const session = await getSession()
  if (!session) return ok({ user: null })

  const user = await db.user.findUnique({ where: { id: session.id } })
  if (!user || !user.active) return ok({ user: null })

  return ok({
    user: { id: user.id, name: user.name, role: user.role },
  })
}
