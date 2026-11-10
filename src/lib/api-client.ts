'use client'

/** Client fetch helper: error otomatis dari { error } API */

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  })
  let data: unknown = null
  try {
    data = await res.json()
  } catch {
    // respons bukan JSON
  }
  if (!res.ok) {
    const message =
      (data as { error?: string } | null)?.error ?? `Terjadi kesalahan (${res.status})`
    throw new Error(message)
  }
  return data as T
}

export function buildQuery(params: Record<string, string | number | undefined | null>): string {
  const usp = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') usp.set(k, String(v))
  }
  const s = usp.toString()
  return s ? `?${s}` : ''
}
