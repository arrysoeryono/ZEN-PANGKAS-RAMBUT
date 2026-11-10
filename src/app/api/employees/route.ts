import { db } from '@/lib/db'
import { ok, bad, requireOwner, isAuthFailure } from '@/lib/api-utils'
import { hashPin } from '@/lib/pin'
import { validatePin } from '@/lib/auth'

/** Daftar karyawan (owner) */
export async function GET() {
  const auth = await requireOwner()
  if (isAuthFailure(auth)) return auth

  const users = await db.user.findMany({
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      name: true,
      role: true,
      active: true,
      createdAt: true,
      _count: { select: { transactions: true } },
    },
  })

  return ok({
    items: users.map((u) => ({
      id: u.id,
      name: u.name,
      role: u.role,
      active: u.active,
      createdAt: u.createdAt,
      transactionCount: u._count.transactions,
    })),
  })
}

/** Tambah karyawan (owner) — role selalu KASIR */
export async function POST(req: Request) {
  const auth = await requireOwner()
  if (isAuthFailure(auth)) return auth

  let body: { name?: unknown; pin?: unknown }
  try {
    body = await req.json()
  } catch {
    return bad('Format permintaan tidak valid')
  }

  const name = typeof body.name === 'string' ? body.name.trim() : ''
  if (name.length < 2 || name.length > 40) return bad('Nama harus 2-40 karakter')

  const pinError = validatePin(body.pin)
  if (pinError) return bad(pinError)

  const user = await db.user.create({
    data: { name, pinHash: await hashPin(body.pin as string), role: 'KASIR' },
  })
  return ok(
    {
      item: {
        id: user.id,
        name: user.name,
        role: user.role,
        active: user.active,
        createdAt: user.createdAt,
        transactionCount: 0,
      },
    },
    { status: 201 },
  )
}
