import { db } from '@/lib/db'
import { ok, bad, requireOwner, isAuthFailure } from '@/lib/api-utils'
import {
  parseJakartaDateInput,
  jakartaDayStart,
  jakartaDayEnd,
  jakartaDateKey,
  daysBetween,
} from '@/lib/time'

/** Laporan lengkap per rentang tanggal (WIB) — owner */
export async function GET(req: Request) {
  const auth = await requireOwner()
  if (isAuthFailure(auth)) return auth
  const url = new URL(req.url)

  const now = new Date()
  const from = parseJakartaDateInput(url.searchParams.get('from') ?? jakartaDateKey(now))
  const to = parseJakartaDateInput(url.searchParams.get('to') ?? jakartaDateKey(now))

  if (!from || !to) return bad('Rentang tanggal tidak valid')
  if (from > to) return bad('Tanggal awal harus sebelum tanggal akhir')

  const spanDays = daysBetween(from, to)
  if (spanDays > 366) return bad('Maksimal rentang 1 tahun')

  const fromDt = jakartaDayStart(from)
  const toDt = jakartaDayEnd(to)

  const rows = await db.transaction.findMany({
    where: { createdAt: { gte: fromDt, lt: toDt } },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      type: true,
      amount: true,
      note: true,
      serviceName: true,
      categoryName: true,
      userId: true,
      createdAt: true,
    },
  })

  let income = 0
  let expense = 0
  let incomeCount = 0
  let expenseCount = 0

  const byService = new Map<string, { name: string; count: number; total: number }>()
  const byCategory = new Map<string, { name: string; count: number; total: number }>()
  const byEmployee = new Map<string, { userId: string; incomeCount: number; incomeTotal: number; expenseCount: number; expenseTotal: number }>()
  const byDay = new Map<string, { date: string; income: number; expense: number }>()

  for (const r of rows) {
    const amount = r.amount
    if (r.type === 'INCOME') {
      income += amount
      incomeCount += 1
      const svcName = r.serviceName ?? 'Lainnya'
      const svc = byService.get(svcName) ?? { name: svcName, count: 0, total: 0 }
      svc.count += 1
      svc.total += amount
      byService.set(svcName, svc)
    } else {
      expense += amount
      expenseCount += 1
      const catName = r.categoryName ?? 'Lainnya'
      const cat = byCategory.get(catName) ?? { name: catName, count: 0, total: 0 }
      cat.count += 1
      cat.total += amount
      byCategory.set(catName, cat)
    }

    const emp =
      byEmployee.get(r.userId) ??
      { userId: r.userId, incomeCount: 0, incomeTotal: 0, expenseCount: 0, expenseTotal: 0 }
    if (r.type === 'INCOME') {
      emp.incomeCount += 1
      emp.incomeTotal += amount
    } else {
      emp.expenseCount += 1
      emp.expenseTotal += amount
    }
    byEmployee.set(r.userId, emp)

    const key = jakartaDateKey(r.createdAt)
    const day = byDay.get(key) ?? { date: key, income: 0, expense: 0 }
    if (r.type === 'INCOME') day.income += amount
    else day.expense += amount
    byDay.set(key, day)
  }

  // nama & role karyawan
  const userIds = [...byEmployee.keys()]
  const users = userIds.length
    ? await db.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true, role: true },
      })
    : []
  const userMap = new Map(users.map((u) => [u.id, u]))

  // isi hari tanpa transaksi agar grafik berkesinambungan
  const seriesDays: { date: string; income: number; expense: number; net: number }[] = []
  if (spanDays <= 92) {
    for (let t = fromDt.getTime(); t < toDt.getTime(); t += 86400000) {
      const key = jakartaDateKey(new Date(t))
      const day = byDay.get(key)
      seriesDays.push({
        date: key,
        income: day?.income ?? 0,
        expense: day?.expense ?? 0,
        net: (day?.income ?? 0) - (day?.expense ?? 0),
      })
    }
  } else {
    // rentang panjang: hanya hari dengan transaksi
    for (const day of byDay.values()) {
      seriesDays.push({ ...day, net: day.income - day.expense })
    }
    seriesDays.sort((a, b) => a.date.localeCompare(b.date))
  }

  return ok({
    from: jakartaDateKey(from),
    to: jakartaDateKey(to),
    days: spanDays,
    summary: {
      income,
      expense,
      net: income - expense,
      count: rows.length,
      incomeCount,
      expenseCount,
      avgPerDay: Math.round(income / Math.max(1, spanDays)),
    },
    byService: [...byService.values()].sort((a, b) => b.total - a.total),
    byCategory: [...byCategory.values()].sort((a, b) => b.total - a.total),
    byEmployee: userIds
      .map((uid) => {
        const e = byEmployee.get(uid)!
        const u = userMap.get(uid)
        return {
          userId: uid,
          name: u?.name ?? 'Tidak diketahui',
          role: u?.role ?? 'KASIR',
          incomeCount: e.incomeCount,
          incomeTotal: e.incomeTotal,
          expenseCount: e.expenseCount,
          expenseTotal: e.expenseTotal,
        }
      })
      .sort((a, b) => b.incomeTotal - a.incomeTotal),
    byDay: seriesDays,
  })
}
