/**
 * Utilitas keamanan sesi (edge-safe) — ZEN PANGKAS RAMBUT
 *
 * - Sesi berupa JWT (HS256) yang disimpan di cookie HttpOnly + SameSite=Lax
 *   → tidak bisa dibaca JavaScript (tahan XSS) dan tidak dikirim lintas situs (tahan CSRF POST)
 * - Verifikasi token memakai Web Crypto (jose), kompatibel edge runtime
 * - Hash PIN (bcrypt) ada di src/lib/pin.ts (khusus Node runtime)
 */

import { SignJWT, jwtVerify } from 'jose'

export const SESSION_COOKIE = 'zen_session'
/** Sesi awet 30 hari agar tidak perlu login ulang tiap buka aplikasi */
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30

export interface SessionUser {
  id: string
  name: string
  role: 'OWNER' | 'KASIR'
}

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET
  if (!secret || secret.length < 16) {
    throw new Error('AUTH_SECRET belum dikonfigurasi di .env')
  }
  return new TextEncoder().encode(secret)
}

/** Buat JWT sesi dari data user */
export async function signSessionToken(user: SessionUser): Promise<string> {
  return new SignJWT({ name: user.name, role: user.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(getSecret())
}

/** Verifikasi JWT sesi; null bila tidak valid / kedaluwarsa */
export async function verifySessionToken(
  token: string | undefined | null,
): Promise<SessionUser | null> {
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, getSecret(), { algorithms: ['HS256'] })
    if (!payload.sub) return null
    const role = String(payload.role ?? 'KASIR')
    return {
      id: payload.sub,
      name: String(payload.name ?? ''),
      role: role === 'OWNER' ? 'OWNER' : 'KASIR',
    }
  } catch {
    return null
  }
}

/** Validasi PIN: 4-6 digit angka */
export function validatePin(pin: unknown): string | null {
  if (typeof pin !== 'string') return 'PIN tidak valid'
  if (!/^\d{4,6}$/.test(pin)) return 'PIN harus 4-6 digit angka'
  return null
}
