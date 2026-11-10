/**
 * Hash & verifikasi PIN (bcrypt) — hanya dipakai di Node runtime (API routes).
 */

import bcrypt from 'bcryptjs'

const ROUNDS = 10

export async function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, ROUNDS)
}

export async function verifyPin(pin: string, pinHash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(pin, pinHash)
  } catch {
    return false
  }
}
