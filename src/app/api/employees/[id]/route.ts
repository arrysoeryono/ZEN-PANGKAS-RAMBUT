import { db } from '@/lib/db'
import { ok, bad, requireOwner, isAuthFailure } from '@/lib/api-utils'
import { hashPin } from '@/lib/pin'
import { validatePin } from '@/lib/auth'

type Params = { params: Promise<{ id: string }> }

/** Ubah karyawan (owner): nama, reset PIN, aktif/nonaktif */
export async function PATCH(req: Request, { params }: Params) {
  const auth = await requireOwner()
  if (isAuthFailure(auth)) return auth
  const session = auth
  const { id } = await params

  let body: { name?: unknown; pin?: unknown; active?: unknown }
  try {
    body = await req.json()
  } catch {
    return bad('Format permintaan tidak valid')
  }

  if (id === session.id && body.active === false) {
    return bad('Tidak bisa menonaktifkan akun sendiri')
  }

  const data: Record<string, unknown> = {}
  if (body.name !== undefined) {
    const name = String(body.name).trim()
    if (name.length < 2 || name.length > 40) return bad('Nama harus 2-40 karakter')
    data.name = name
  }
  if (body.pin !== undefined) {
    const pinError = validatePin(body.pin)
    if (pinError) return bad(pinError)
    data.pinHash = await hashPin(body.pin as string)
  }
  if (body.active !== undefined) data.active = Boolean(body.active)

  const user = await db.user.update({
    where: { id },
    data,
    select: { id: true, name: true, role: true, active: true, createdAt: true },
  })
  return ok({ item: { ...user, transactionCount: undefined } })
}

/** Hapus karyawan (owner) — bila sudah punya transaksi, cukup nonaktifkan */
export async function DELETE(_req: Request, { params }: Params) {
  const auth = await requireOwner()
  if (isAuthFailure(auth)) return auth
  const session = auth
  const { id } = await params

  if (id === session.id) return bad('Tidak bisa menghapus akun sendiri')

  const used = await db.transaction.count({ where: { userId: id } })
  if (used > 0) {
    const user = await db.user.update({ where: { id }, data: { active: false } })
    return ok({ item: { id: user.id, active: user.active }, deactivated: true })
  }
  await db.user.delete({ where: { id } })
  return ok({ ok: true })
}
