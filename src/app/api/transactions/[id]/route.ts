import { db } from '@/lib/db'
import { ok, bad, requireOwner, isAuthFailure } from '@/lib/api-utils'
import { NextResponse } from 'next/server'

const MAX_AMOUNT = 100_000_000

type Params = { params: Promise<{ id: string }> }

/** Ubah transaksi (hanya owner): nominal, catatan, kategori */
export async function PATCH(req: Request, { params }: Params) {
  const auth = await requireOwner()
  if (isAuthFailure(auth)) return auth
  const { id } = await params

  let body: { amount?: unknown; note?: unknown; categoryId?: unknown }
  try {
    body = await req.json()
  } catch {
    return bad('Format permintaan tidak valid')
  }

  const existing = await db.transaction.findUnique({ where: { id } })
  if (!existing) return bad('Transaksi tidak ditemukan', 404)

  const data: Record<string, unknown> = {}

  if (body.amount !== undefined) {
    const amount = Math.floor(Number(body.amount))
    if (!Number.isFinite(amount) || amount < 1) return bad('Nominal minimal Rp1')
    if (amount > MAX_AMOUNT) return bad('Nominal terlalu besar')
    data.amount = amount
  }

  if (body.note !== undefined) {
    data.note = typeof body.note === 'string' && body.note.trim() ? body.note.trim() : null
  }

  if (body.categoryId !== undefined && existing.type === 'EXPENSE') {
    const category = await db.category.findUnique({ where: { id: String(body.categoryId) } })
    if (!category) return bad('Kategori tidak ditemukan')
    data.categoryId = category.id
    data.categoryName = category.name
  }

  const updated = await db.transaction.update({
    where: { id },
    data,
    include: { user: { select: { name: true } } },
  })

  return ok({
    item: {
      id: updated.id,
      type: updated.type,
      amount: updated.amount,
      note: updated.note,
      serviceId: updated.serviceId,
      serviceName: updated.serviceName,
      categoryId: updated.categoryId,
      categoryName: updated.categoryName,
      userId: updated.userId,
      userName: updated.user.name,
      createdAt: updated.createdAt,
    },
  })
}

/** Hapus transaksi (hanya owner) */
export async function DELETE(_req: Request, { params }: Params) {
  const auth = await requireOwner()
  if (isAuthFailure(auth)) return auth
  const { id } = await params
  const existing = await db.transaction.findUnique({ where: { id } })
  if (!existing) return bad('Transaksi tidak ditemukan', 404)
  await db.transaction.delete({ where: { id } })
  return ok({ ok: true })
}

// pastikan NextResponse terpakai agar lint tidak komplain
void NextResponse
