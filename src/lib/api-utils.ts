/**
 * Helper respons API + guard sesi untuk route handler Next.js.
 * Next.js tidak mendukung `throw new Response()` di route handler,
 * jadi guard mengembalikan SessionUser ATAU NextResponse untuk di-return.
 */

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { SESSION_COOKIE, verifySessionToken, type SessionUser } from './auth'
import { db } from './db'

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data as object, init)
}

export function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

/** Hasil guard: user valid atau respons error siap dikirim */
export type AuthResult = SessionUser | NextResponse

export function isAuthFailure(x: AuthResult): x is NextResponse {
  return x instanceof NextResponse
}

/** Ambil sesi dari cookie permintaan */
export async function getSession(): Promise<SessionUser | null> {
  const store = await cookies()
  const token = store.get(SESSION_COOKIE)?.value
  return verifySessionToken(token)
}

/** Wajib login */
export async function requireAuth(): Promise<AuthResult> {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Belum login' }, { status: 401 })
  }
  return session
}

/** Wajib login sebagai OWNER */
export async function requireOwner(): Promise<AuthResult> {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Belum login' }, { status: 401 })
  }
  if (session.role !== 'OWNER') {
    return NextResponse.json(
      { error: 'Hanya owner yang boleh mengakses fitur ini' },
      { status: 403 },
    )
  }
  return session
}

/** Ambil user aktif (termasuk cek status aktif) dari sesi */
export async function getActiveUser() {
  const session = await getSession()
  if (!session) return null
  const user = await db.user.findUnique({ where: { id: session.id } })
  if (!user || !user.active) return null
  return user
}
