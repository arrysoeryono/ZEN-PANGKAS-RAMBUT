import { db } from '@/lib/db'
import { bad, requireOwner, isAuthFailure } from '@/lib/api-utils'
import { parseJakartaDateInput, jakartaDayStart, jakartaDayEnd, jakartaDateKey, formatJakartaTime, daysBetween } from '@/lib/time'
import { NextResponse } from 'next/server'

function csvEscape(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return ''
  const s = String(v)
  if (/[",;\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

/** Unduh laporan CSV (owner) — kompatibel Excel (BOM + separator ; untuk locale ID) */
export async function GET(req: Request) {
  const auth = await requireOwner()
  if (isAuthFailure(auth)) return auth
  const url = new URL(req.url)

  const now = new Date()
  const from = parseJakartaDateInput(url.searchParams.get('from') ?? jakartaDateKey(now))
  const to = parseJakartaDateInput(url.searchParams.get('to') ?? jakartaDateKey(now))
  if (!from || !to) return bad('Rentang tanggal tidak valid')
  if (from > to) return bad('Tanggal awal harus sebelum tanggal akhir')
  if (daysBetween(from, to) > 366) return bad('Maksimal rentang 1 tahun')

  const rows = await db.transaction.findMany({
    where: { createdAt: { gte: jakartaDayStart(from), lt: jakartaDayEnd(to) } },
    orderBy: { createdAt: 'asc' },
    include: { user: { select: { name: true } } },
  })

  const lines: string[] = []
  lines.push('Tanggal;Waktu;Jenis;Layanan/Kategori;Keterangan;Dicatat Oleh;Jumlah (Rp)')
  for (const r of rows) {
    lines.push(
      [
        csvEscape(jakartaDateKey(r.createdAt)),
        csvEscape(formatJakartaTime(r.createdAt)),
        csvEscape(r.type === 'INCOME' ? 'Pemasukan' : 'Pengeluaran'),
        csvEscape(r.type === 'INCOME' ? r.serviceName : r.categoryName),
        csvEscape(r.note),
        csvEscape(r.user.name),
        csvEscape(r.amount),
      ].join(';'),
    )
  }
  const income = rows.filter((r) => r.type === 'INCOME').reduce((s, r) => s + r.amount, 0)
  const expense = rows.filter((r) => r.type === 'EXPENSE').reduce((s, r) => s + r.amount, 0)
  lines.push('')
  lines.push(`Total Pemasukan;${income}`)
  lines.push(`Total Pengeluaran;${expense}`)
  lines.push(`Laba Bersih;${income - expense}`)

  const csv = '\uFEFF' + lines.join('\r\n')
  const filename = `zen-laporan-${jakartaDateKey(from)}_${jakartaDateKey(to)}.csv`

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
