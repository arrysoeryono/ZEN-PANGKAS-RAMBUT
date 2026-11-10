import { db } from '@/lib/db'
import { bad, ok } from '@/lib/api-utils'
import { verifyPin } from '@/lib/pin'
import { signSessionToken, SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from '@/lib/auth'
import { rateLimit, resetRateLimit, clientKey } from '@/lib/rate-limit'
import { NextResponse } from 'next/server'

/** Login dengan PIN: pilih user → verifikasi bcrypt → set cookie sesi HttpOnly */
export async function POST(req: Request) {
  let body: { userId?: unknown; pin?: unknown }
  try {
    body = await req.json()
  } catch {
    return bad('Format permintaan tidak valid')
  }

  const userId = typeof body.userId === 'string' ? body.userId : ''
  const pin = typeof body.pin === 'string' ? body.pin : ''

  if (!userId || !pin) {
    return bad('Pilih pengguna dan masukkan PIN')
  }

  // Anti brute-force: maksimal 5 percobaan salah per 10 menit per IP+user
  const key = `login|${clientKey(req, userId)}`
  const limited = rateLimit(key, 5, 10 * 60 * 1000)
  if (!limited.allowed) {
    return bad(
      `Terlalu banyak percobaan gagal. Coba lagi dalam ${Math.ceil(limited.retryAfterSeconds / 60)} menit.`,
      429,
    )
  }

  const user = await db.user.findUnique({ where: { id: userId } })
  const valid = user ? await verifyPin(pin, user.pinHash) : false

  if (!user || !valid || !user.active) {
    return bad(user && !user.active ? 'Akun ini dinonaktifkan' : 'PIN salah', 401)
  }

  resetRateLimit(key)
  const token = await signSessionToken({ id: user.id, name: user.name, role: user.role })
  const res = NextResponse.json({
    user: { id: user.id, name: user.name, role: user.role },
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
