import { db } from '@/lib/db'
import { ok, bad, requireAuth, requireOwner, isAuthFailure } from '@/lib/api-utils'

/** Daftar layanan/jasa pangkas (login) — owner dapat melihat yang nonaktif dengan ?all=1 */
export async function GET(req: Request) {
  const auth = await requireAuth()
  if (isAuthFailure(auth)) return auth
  const url = new URL(req.url)
  const showAll = url.searchParams.get('all') === '1'

  const services = await db.service.findMany({
    where: showAll ? {} : { active: true },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  })
  return ok({ items: services })
}

/** Tambah layanan (owner) */
export async function POST(req: Request) {
  const auth = await requireOwner()
  if (isAuthFailure(auth)) return auth

  let body: { name?: unknown; price?: unknown }
  try {
    body = await req.json()
  } catch {
    return bad('Format permintaan tidak valid')
  }

  const name = typeof body.name === 'string' ? body.name.trim() : ''
  if (name.length < 2 || name.length > 50) return bad('Nama layanan harus 2-50 karakter')

  const price = Math.floor(Number(body.price))
  if (!Number.isFinite(price) || price < 0) return bad('Harga tidak valid')
  if (price > 100_000_000) return bad('Harga terlalu besar')

  const count = await db.service.count()
  const service = await db.service.create({
    data: { name, price, sortOrder: count + 1 },
  })
  return ok({ item: service }, { status: 201 })
}
