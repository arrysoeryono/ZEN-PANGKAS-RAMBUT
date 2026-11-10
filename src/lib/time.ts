/**
 * Utilitas zona waktu Asia/Jakarta (UTC+7, tanpa DST).
 * Semua batas "hari"/"bulan" dihitung berdasarkan jam dinding WIB,
 * sementara database menyimpan tanggal dalam UTC.
 */

const JKT_OFFSET_MS = 7 * 60 * 60 * 1000

/** Key tanggal "yyyy-MM-dd" menurut jam dinding WIB */
export function jakartaDateKey(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d
  const shifted = new Date(date.getTime() + JKT_OFFSET_MS)
  return shifted.toISOString().slice(0, 10)
}

/** Awal hari (00:00 WIB) dari suatu tanggal → Date UTC */
export function jakartaDayStart(d: Date | string): Date {
  const key = jakartaDateKey(d)
  return new Date(Date.parse(`${key}T00:00:00.000Z`) - JKT_OFFSET_MS)
}

/** Akhir hari (24:00 WIB, eksklusif) */
export function jakartaDayEnd(d: Date | string): Date {
  return new Date(jakartaDayStart(d).getTime() + 24 * 60 * 60 * 1000)
}

/** Awal bulan (tanggal 1, 00:00 WIB) */
export function jakartaMonthStart(d: Date | string): Date {
  const key = jakartaDateKey(d)
  const ym = key.slice(0, 7)
  return new Date(Date.parse(`${ym}-01T00:00:00.000Z`) - JKT_OFFSET_MS)
}

/** Awal minggu (Senin, 00:00 WIB) */
export function jakartaWeekStart(d: Date | string): Date {
  const start = jakartaDayStart(d)
  const shifted = new Date(start.getTime() + JKT_OFFSET_MS)
  const dow = shifted.getUTCDay() // 0=Minggu
  const diff = (dow + 6) % 7 // jarak ke Senin
  return new Date(start.getTime() - diff * 24 * 60 * 60 * 1000)
}

/** Awal hari kemarin (WIB) */
export function jakartaYesterdayStart(d: Date | string): Date {
  return new Date(jakartaDayStart(d).getTime() - 24 * 60 * 60 * 1000)
}

/** Parse input tanggal lokal "yyyy-MM-dd" → awal hari WIB */
export function parseJakartaDateInput(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const t = Date.parse(`${value}T00:00:00.000Z`) - JKT_OFFSET_MS
  if (Number.isNaN(t)) return null
  return new Date(t)
}

/** Jumlah hari dalam rentang [from, to) (inklusif dari, eksklusif to) */
export function daysBetween(from: Date, to: Date): number {
  return Math.max(1, Math.round((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000)))
}

/** Format tanggal & waktu untuk tampilan, ikut zona WIB */
export function formatJakartaDateTime(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function formatJakartaDate(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

export function formatJakartaTime(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

/** Label nama hari pendek (Sen, Sel, ...) dari key yyyy-MM-dd */
export function dayLabel(key: string): string {
  const t = Date.parse(`${key}T00:00:00.000Z`) + JKT_OFFSET_MS
  return new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', weekday: 'short' }).format(
    new Date(t),
  )
}

/** Label tanggal pendek "10 Nov" dari key yyyy-MM-dd */
export function shortDateLabel(key: string): string {
  const t = Date.parse(`${key}T00:00:00.000Z`) + JKT_OFFSET_MS
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: 'numeric',
    month: 'short',
  }).format(new Date(t))
}

/** Greeting sesuai jam WIB */
export function greetingJakarta(d: Date = new Date()): string {
  const hour = Number(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Jakarta',
      hour: '2-digit',
      hour12: false,
    }).format(d),
  )
  if (hour >= 4 && hour < 11) return 'Selamat pagi'
  if (hour >= 11 && hour < 15) return 'Selamat siang'
  if (hour >= 15 && hour < 19) return 'Selamat sore'
  return 'Selamat malam'
}
