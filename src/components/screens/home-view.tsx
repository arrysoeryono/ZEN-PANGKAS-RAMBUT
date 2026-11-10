'use client'

import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  ChevronRight,
  Flame,
  Scissors,
  TrendingUp,
} from 'lucide-react'
import { api } from '@/lib/api-client'
import { formatRupiah, formatRupiahShort } from '@/lib/format'
import { formatJakartaDate, greetingJakarta, shortDateLabel } from '@/lib/time'
import { useSession } from '@/components/app/session-provider'
import { useCountUp } from '@/components/shared/use-count-up'
import { DailyBars } from '@/components/shared/daily-bars'
import { TransactionRow, EmptyState } from '@/components/shared/transaction-rows'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { DashboardData, TxType } from '@/lib/client-types'

/** Angka dengan animasi count-up + format rupiah */
function Money({ value, className }: { value: number; className?: string }) {
  const v = useCountUp(value)
  return <span className={cn('tnum', className)}>{formatRupiah(v)}</span>
}

function DeltaChip({ label, delta, invert = false }: { label: string; delta: number; invert?: boolean }) {
  const positive = invert ? delta < 0 : delta > 0
  const neutral = delta === 0
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold',
        neutral
          ? 'bg-secondary text-ink-soft'
          : positive
            ? 'bg-income-soft text-income'
            : 'bg-expense-soft text-expense',
      )}
    >
      {delta >= 0 ? '+' : '−'}
      {formatRupiahShort(Math.abs(delta))}
      <span className="font-medium opacity-70">{label}</span>
    </span>
  )
}

/** Tab Beranda: ringkasan hari ini, aksi cepat, grafik, insight, transaksi terbaru */
export function HomeView({
  onQuickAction,
  onSeeAllHistory,
}: {
  onQuickAction: (type: TxType) => void
  onSeeAllHistory: () => void
}) {
  const { user } = useSession()
  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: () => api<DashboardData>('/api/dashboard'),
  })

  const isOwner = user?.role === 'OWNER'

  if (isLoading || !data) {
    return (
      <div className="space-y-4 px-4 pt-2">
        <Skeleton className="h-10 w-3/4 rounded-2xl" />
        <Skeleton className="h-44 rounded-3xl" />
        <Skeleton className="h-24 rounded-3xl" />
        <Skeleton className="h-52 rounded-3xl" />
      </div>
    )
  }

  const deltaIncome = data.today.income - data.yesterday.income
  const deltaExpense = data.today.expense - data.yesterday.expense
  const monthMax = Math.max(1, data.month.income, data.month.expense)

  return (
    <div className="space-y-5 px-4 pb-4 pt-2">
      {/* Sapaan */}
      <header className="flex items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-ink-soft">
            {greetingJakarta()}, {user?.name.split(' ')[0]}
          </p>
          <h1 className="text-[22px] font-extrabold tracking-tight text-foreground">
            ZEN Pangkas Rambut
          </h1>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs font-medium text-ink-soft">
            <CalendarDays className="size-3.5" />
            {formatJakartaDate(new Date())}
          </p>
        </div>
      </header>

      {/* Ringkasan hari ini */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="overflow-hidden rounded-3xl bg-foreground text-cream shadow-xl shadow-foreground/15"
      >
        <div className="px-5 pb-5 pt-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-cream/60">
              Laba Bersih Hari Ini
            </p>
            <span className="rounded-full bg-cream/10 px-2.5 py-1 text-[11px] font-bold text-cream/80">
              {data.today.count} transaksi
            </span>
          </div>
          <p className="mt-1.5 text-[34px] font-extrabold leading-none tracking-tight">
            <Money value={data.today.net} />
          </p>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-cream/10 p-3">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-cream/70">
                <ArrowUpRight className="size-3.5" /> Pemasukan
              </div>
              <p className="tnum mt-0.5 text-lg font-extrabold text-[#7FC5F5]">
                {formatRupiah(data.today.income)}
              </p>
              <div className="mt-1.5">
                <DeltaChip label="vs kemarin" delta={deltaIncome} />
              </div>
            </div>
            <div className="rounded-2xl bg-cream/10 p-3">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-cream/70">
                <ArrowDownLeft className="size-3.5" /> Pengeluaran
              </div>
              <p className="tnum mt-0.5 text-lg font-extrabold text-[#FFB3A7]">
                {formatRupiah(data.today.expense)}
              </p>
              <div className="mt-1.5">
                <DeltaChip label="vs kemarin" delta={deltaExpense} invert />
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* Aksi cepat */}
      <section className="grid grid-cols-2 gap-3">
        <motion.button
          whileTap={{ scale: 0.97 }}
          type="button"
          onClick={() => onQuickAction('INCOME')}
          className="flex flex-col items-start gap-2 rounded-3xl border border-income/20 bg-income-soft p-4 text-left shadow-sm transition hover:shadow-md"
        >
          <span className="flex size-10 items-center justify-center rounded-2xl bg-income text-white shadow-md shadow-income/30">
            <ArrowUpRight className="size-5" />
          </span>
          <span className="text-[15px] font-extrabold text-foreground">Catat Pemasukan</span>
          <span className="text-xs font-medium text-ink-soft">Jasa pangkas & lainnya</span>
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.97 }}
          type="button"
          onClick={() => onQuickAction('EXPENSE')}
          className="flex flex-col items-start gap-2 rounded-3xl border border-expense/20 bg-expense-soft p-4 text-left shadow-sm transition hover:shadow-md"
        >
          <span className="flex size-10 items-center justify-center rounded-2xl bg-expense text-white shadow-md shadow-expense/30">
            <ArrowDownLeft className="size-5" />
          </span>
          <span className="text-[15px] font-extrabold text-foreground">Catat Pengeluaran</span>
          <span className="text-xs font-medium text-ink-soft">Belanja, tagihan, dll</span>
        </motion.button>
      </section>

      {/* Bulan berjalan */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="rounded-3xl border border-border bg-card p-5 shadow-sm"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-extrabold text-foreground">Bulan Ini</h2>
          <span className="text-xs font-semibold text-ink-soft">
            hari ke-{data.month.dayOfMonth}
          </span>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="tnum text-base font-extrabold text-income">
              {formatRupiahShort(data.month.income)}
            </p>
            <p className="text-[11px] font-semibold text-ink-soft">Masuk</p>
          </div>
          <div>
            <p className="tnum text-base font-extrabold text-expense">
              {formatRupiahShort(data.month.expense)}
            </p>
            <p className="text-[11px] font-semibold text-ink-soft">Keluar</p>
          </div>
          <div>
            <p className="tnum text-base font-extrabold text-foreground">
              {formatRupiahShort(data.month.net)}
            </p>
            <p className="text-[11px] font-semibold text-ink-soft">Laba</p>
          </div>
        </div>
        <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full bg-income transition-all duration-700"
            style={{ width: `${(data.month.income / monthMax) * 100}%` }}
          />
          <div
            className="h-full bg-expense transition-all duration-700"
            style={{ width: `${(data.month.expense / monthMax) * 100}%` }}
          />
        </div>
      </motion.section>

      {/* Grafik 7 hari */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-3xl border border-border bg-card p-5 shadow-sm"
      >
        <h2 className="text-sm font-extrabold text-foreground">7 Hari Terakhir</h2>
        <div className="mt-3">
          <DailyBars data={data.series} />
        </div>
      </motion.section>

      {/* Insight (khusus owner melihat semua; karyawan tetap boleh lihat ringkasan) */}
      {(data.insights.avgIncomePerDay > 0 || data.insights.topService) && (
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="grid grid-cols-2 gap-3"
        >
          <div className="rounded-3xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-ink-soft">
              <TrendingUp className="size-3.5 text-income" /> Rata-rata Masuk / Hari
            </div>
            <p className="tnum mt-1 text-lg font-extrabold text-foreground">
              {formatRupiah(data.insights.avgIncomePerDay)}
            </p>
            <p className="text-[11px] text-ink-soft">bulan ini</p>
          </div>
          {data.insights.topService ? (
            <div className="rounded-3xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-ink-soft">
                <Scissors className="size-3.5 text-primary" /> Layanan Terlaris
              </div>
              <p className="mt-1 truncate text-lg font-extrabold text-foreground">
                {data.insights.topService.name}
              </p>
              <p className="text-[11px] text-ink-soft">
                {data.insights.topService.count}x bulan ini
              </p>
            </div>
          ) : (
            <div className="rounded-3xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-ink-soft">
                <Flame className="size-3.5 text-primary" /> Hari Terbaik
              </div>
              <p className="mt-1 truncate text-lg font-extrabold text-foreground">
                {data.insights.bestDay ? shortDateLabel(data.insights.bestDay.date) : '—'}
              </p>
              <p className="tnum text-[11px] text-ink-soft">
                {data.insights.bestDay ? formatRupiah(data.insights.bestDay.income) : 'belum ada'}
              </p>
            </div>
          )}
        </motion.section>
      )}

      {/* Transaksi terbaru */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-3xl border border-border bg-card p-3 shadow-sm"
      >
        <div className="flex items-center justify-between px-2 pt-1">
          <h2 className="text-sm font-extrabold text-foreground">Transaksi Terbaru</h2>
          <button
            type="button"
            onClick={onSeeAllHistory}
            className="flex items-center gap-0.5 text-xs font-bold text-income transition hover:opacity-80"
          >
            Lihat semua <ChevronRight className="size-3.5" />
          </button>
        </div>
        <div className="mt-1">
          {data.recent.length === 0 ? (
            <div className="p-2">
              <EmptyState
                title="Belum ada transaksi"
                description="Mulai catat pemasukan jasa pangkas atau pengeluaran."
              />
            </div>
          ) : (
            <div className="divide-y divide-border/70">
              {data.recent.map((tx) => (
                <TransactionRow key={tx.id} tx={tx} onClick={onSeeAllHistory} />
              ))}
            </div>
          )}
        </div>
      </motion.section>

      {isOwner && (
        <button
          type="button"
          onClick={onSeeAllHistory}
          className="mx-auto flex items-center gap-1 text-sm font-bold text-ink-soft transition hover:text-foreground"
        >
          Kelola & telusuri riwayat <ArrowRight className="size-4" />
        </button>
      )}
    </div>
  )
}
