import { db } from '@/lib/db'
import { ok, requireAuth, isAuthFailure } from '@/lib/api-utils'
import { jakartaDayStart, jakartaDayEnd, jakartaMonthStart, jakartaDateKey, dayLabel } from '@/lib/time'

type Totals = { income: number; expense: number; net: number; count: number }

function emptyTotals(): Totals {
  return { income: 0, expense: 0, net: 0, count: 0 }
}

/** Ringkasan beranda: hari ini, kemarin, bulan ini, grafik 7 hari, insight, transaksi terbaru */
export async function GET() {
  const auth = await requireAuth()
  if (isAuthFailure(auth)) return auth
  const now = new Date()

  const dayStart = jakartaDayStart(now)
  const dayEnd = jakartaDayEnd(now)
  const yesterdayStart = new Date(dayStart.getTime() - 24 * 60 * 60 * 1000)
  const monthStart = jakartaMonthStart(now)

  const [todayRows, yesterdayRows, monthRows, weekRows, recent] = await Promise.all([
    db.transaction.findMany({
      where: { createdAt: { gte: dayStart, lt: dayEnd } },
      select: { type: true, amount: true },
    }),
    db.transaction.findMany({
      where: { createdAt: { gte: yesterdayStart, lt: dayStart } },
      select: { type: true, amount: true },
    }),
    db.transaction.findMany({
      where: { createdAt: { gte: monthStart, lt: dayEnd } },
      select: { type: true, amount: true, createdAt: true, serviceName: true },
    }),
    db.transaction.findMany({
      where: { createdAt: { gte: jakartaDayStart(new Date(dayEnd.getTime() - 7 * 86400000)), lt: dayEnd } },
      select: { type: true, amount: true, createdAt: true },
    }),
    db.transaction.findMany({
      orderBy: { createdAt: 'desc' },
      take: 6,
      include: { user: { select: { name: true } } },
    }),
  ])

  function tally(rows: { type: string; amount: number }[]): Totals {
    const t = emptyTotals()
    for (const r of rows) {
      t.count += 1
      if (r.type === 'INCOME') t.income += r.amount
      else t.expense += r.amount
    }
    t.net = t.income - t.expense
    return t
  }

  const today = tally(todayRows)
  const yesterday = tally(yesterdayRows)
  const month = tally(monthRows)

  // Grafik 7 hari terakhir (termasuk hari ini)
  const dayKeys: string[] = []
  for (let i = 6; i >= 0; i--) {
    dayKeys.push(jakartaDateKey(new Date(dayEnd.getTime() - (i + 1) * 86400000)))
  }
  dayKeys.push(jakartaDateKey(now))
  const uniqueKeys = [...new Set(dayKeys)].slice(-7)

  const series = uniqueKeys.map((key) => ({
    date: key,
    label: dayLabel(key),
    income: 0,
    expense: 0,
  }))
  const seriesMap = new Map(series.map((s) => [s.date, s]))
  for (const r of weekRows) {
    const key = jakartaDateKey(r.createdAt)
    const bucket = seriesMap.get(key)
    if (!bucket) continue
    if (r.type === 'INCOME') bucket.income += r.amount
    else bucket.expense += r.amount
  }

  // Insight bulan berjalan (tanggal berjalan menurut WIB)
  const dayOfMonth = new Date(now.getTime() + 7 * 3600000).getUTCDate()
  const avgIncomePerDay = Math.round(month.income / Math.max(1, dayOfMonth))

  // Hari terbaik bulan ini (pemasukan tertinggi)
  const byDayIncome = new Map<string, number>()
  for (const r of monthRows) {
    if (r.type !== 'INCOME') continue
    const key = jakartaDateKey(r.createdAt)
    byDayIncome.set(key, (byDayIncome.get(key) ?? 0) + r.amount)
  }
  let bestDay: { date: string; income: number } | null = null
  for (const [date, income] of byDayIncome) {
    if (!bestDay || income > bestDay.income) bestDay = { date, income }
  }

  // Layanan terlaris bulan ini
  const serviceCount = new Map<string, number>()
  for (const r of monthRows) {
    if (r.type !== 'INCOME' || !r.serviceName) continue
    serviceCount.set(r.serviceName, (serviceCount.get(r.serviceName) ?? 0) + 1)
  }
  let topService: { name: string; count: number } | null = null
  for (const [name, count] of serviceCount) {
    if (!topService || count > topService.count) topService = { name, count }
  }

  return ok({
    today,
    yesterday,
    month: { ...month, dayOfMonth },
    series,
    insights: {
      avgIncomePerDay,
      bestDay,
      topService,
    },
    recent: recent.map((t) => ({
      id: t.id,
      type: t.type,
      amount: t.amount,
      note: t.note,
      serviceName: t.serviceName,
      categoryName: t.categoryName,
      userName: t.user.name,
      createdAt: t.createdAt,
    })),
  })
}
