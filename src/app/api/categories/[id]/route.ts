import { db } from '@/lib/db'
import { ok, bad, requireOwner, isAuthFailure } from '@/lib/api-utils'

type Params = { params: Promise<{ id: string }> }

/** Ubah kategori (owner) */
export async function PATCH(req: Request, { params }: Params) {
  const auth = await requireOwner()
  if (isAuthFailure(auth)) return auth
  const { id } = await params

  let body: { name?: unknown; active?: unknown }
  try {
    body = await req.json()
  } catch {
    return bad('Format permintaan tidak valid')
  }

  const data: Record<string, unknown> = {}
  if (body.name !== undefined) {
    const name = String(body.name).trim()
    if (name.length < 2 || name.length > 50) return bad('Nama kategori harus 2-50 karakter')
    data.name = name
  }
  if (body.active !== undefined) data.active = Boolean(body.active)

  const category = await db.category.update({ where: { id }, data })
  return ok({ item: category })
}

/** Hapus kategori (owner) — bila sudah dipakai transaksi, cukup nonaktifkan */
export async function DELETE(_req: Request, { params }: Params) {
  const auth = await requireOwner()
  if (isAuthFailure(auth)) return auth
  const { id } = await params

  const used = await db.transaction.count({ where: { categoryId: id } })
  if (used > 0) {
    const category = await db.category.update({ where: { id }, data: { active: false } })
    return ok({ item: category, deactivated: true })
  }
  await db.category.delete({ where: { id } })
  return ok({ ok: true })
}
