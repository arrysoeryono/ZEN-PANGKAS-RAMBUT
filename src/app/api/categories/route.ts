import { db } from '@/lib/db'
import { ok, bad, requireAuth, requireOwner, isAuthFailure } from '@/lib/api-utils'

/** Daftar kategori pengeluaran (login) */
export async function GET(req: Request) {
  const auth = await requireAuth()
  if (isAuthFailure(auth)) return auth
  const url = new URL(req.url)
  const showAll = url.searchParams.get('all') === '1'

  const categories = await db.category.findMany({
    where: showAll ? {} : { active: true },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  })
  return ok({ items: categories })
}

/** Tambah kategori (owner) */
export async function POST(req: Request) {
  const auth = await requireOwner()
  if (isAuthFailure(auth)) return auth

  let body: { name?: unknown }
  try {
    body = await req.json()
  } catch {
    return bad('Format permintaan tidak valid')
  }

  const name = typeof body.name === 'string' ? body.name.trim() : ''
  if (name.length < 2 || name.length > 50) return bad('Nama kategori harus 2-50 karakter')

  const count = await db.category.count()
  const category = await db.category.create({
    data: { name, sortOrder: count + 1 },
  })
  return ok({ item: category }, { status: 201 })
}
