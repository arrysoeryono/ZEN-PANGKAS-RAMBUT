import { db } from '@/lib/db'
import { ok, bad, requireOwner, isAuthFailure } from '@/lib/api-utils'

type Params = { params: Promise<{ id: string }> }

/** Ubah layanan (owner) */
export async function PATCH(req: Request, { params }: Params) {
  const auth = await requireOwner()
  if (isAuthFailure(auth)) return auth
  const { id } = await params

  let body: { name?: unknown; price?: unknown; active?: unknown }
  try {
    body = await req.json()
  } catch {
    return bad('Format permintaan tidak valid')
  }

  const data: Record<string, unknown> = {}
  if (body.name !== undefined) {
    const name = String(body.name).trim()
    if (name.length < 2 || name.length > 50) return bad('Nama layanan harus 2-50 karakter')
    data.name = name
  }
  if (body.price !== undefined) {
    const price = Math.floor(Number(body.price))
    if (!Number.isFinite(price) || price < 0) return bad('Harga tidak valid')
    if (price > 100_000_000) return bad('Harga terlalu besar')
    data.price = price
  }
  if (body.active !== undefined) data.active = Boolean(body.active)

  const service = await db.service.update({ where: { id }, data })
  return ok({ item: service })
}

/** Hapus layanan (owner) — bila sudah dipakai transaksi, cukup nonaktifkan */
export async function DELETE(_req: Request, { params }: Params) {
  const auth = await requireOwner()
  if (isAuthFailure(auth)) return auth
  const { id } = await params

  const used = await db.transaction.count({ where: { serviceId: id } })
  if (used > 0) {
    const service = await db.service.update({ where: { id }, data: { active: false } })
    return ok({ item: service, deactivated: true })
  }
  await db.service.delete({ where: { id } })
  return ok({ ok: true })
}
