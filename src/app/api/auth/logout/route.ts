import { SESSION_COOKIE } from '@/lib/auth'
import { NextResponse } from 'next/server'

/** Logout: hapus cookie sesi */
export async function POST() {
  const res = NextResponse.json({ ok: true })
  res.cookies.set(SESSION_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 0,
    path: '/',
  })
  return res
}
