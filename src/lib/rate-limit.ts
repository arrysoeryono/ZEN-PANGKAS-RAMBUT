/**
 * Rate limit sederhana in-memory (anti brute-force login).
 * Cukup untuk satu instance; Vercel serverless tetap mengurangi risiko brute force.
 */

interface Entry {
  count: number
  resetAt: number
}

const store = new Map<string, Entry>()

export function rateLimit(
  key: string,
  max: number,
  windowMs: number,
): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || entry.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, retryAfterSeconds: 0 }
  }

  entry.count += 1
  if (entry.count > max) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((entry.resetAt - now) / 1000),
    }
  }
  return { allowed: true, retryAfterSeconds: 0 }
}

export function resetRateLimit(key: string): void {
  store.delete(key)
}

export function clientKey(req: Request, extra?: string): string {
  const fwd = req.headers.get('x-forwarded-for') ?? ''
  const ip = fwd.split(',')[0].trim() || 'local'
  return extra ? `${ip}|${extra}` : ip
}
