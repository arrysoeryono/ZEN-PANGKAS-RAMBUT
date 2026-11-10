import { db } from '@/lib/db'
import { ok, bad } from '@/lib/api-utils'
import { hashPin } from '@/lib/pin'
import { signSessionToken, SESSION_COOKIE, SESSION_MAX_AGE_SECONDS, validatePin } from '@/lib/auth'
import { NextResponse } from 'next/server'

const DEFAULT_SERVICES = [
  { name: 'Anak-anak', price: 15000, sortOrder: 1 },
  { name: 'Dewasa', price: 20000, sortOrder: 2 },
]

const DEFAULT_CATEGORIES = [
  { name: 'Belanja & Supply', sortOrder: 1 },
  { name: 'Gaji & Bonus', sortOrder: 2 },
  { name: 'Listrik & Air', sortOrder: 3 },
  { name: 'Sewa Tempat', sortOrder: 4 },
  { name: 'Perawatan Alat', sortOrder: 5 },
  { name: 'Lain-lain', sortOrder: 99 },
]

/** Setup awal: buat akun OWNER pertama + seed layanan & kategori default */
export async function POST(req: Request) {
  let body: { name?: unknown; pin?: unknown }
  try {
    body = await req.json()
  } catch {
    return bad('Format permintaan tidak valid')
  }

  const name = typeof body.name === 'string' ? body.name.trim() : ''
  if (name.length < 2 || name.length > 40) {
    return bad('Nama owner harus 2-40 karakter')
  }

  const pinError = validatePin(body.pin)
  if (pinError) return bad(pinError)
  const pin = body.pin as string

  const userCount = await db.user.count()
  if (userCount > 0) {
    return bad('Setup sudah pernah dilakukan. Silakan login.', 409)
  }

  const [owner] = await Promise.all([
    db.user.create({ data: { name, pinHash: await hashPin(pin), role: 'OWNER' } }),
    db.service.createMany({ data: DEFAULT_SERVICES }),
    db.category.createMany({ data: DEFAULT_CATEGORIES }),
  ])

  const token = await signSessionToken({ id: owner.id, name: owner.name, role: owner.role })
  const res = NextResponse.json({
    user: { id: owner.id, name: owner.name, role: owner.role },
  })
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: '/',
  })
  return res
}
