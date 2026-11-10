'use client'

import { motion } from 'framer-motion'
import { formatRupiah, formatRupiahShort } from '@/lib/format'
import { shortDateLabel } from '@/lib/time'
import type { SeriesPoint } from '@/lib/client-types'

/**
 * Grafik batang berpasangan (Pemasukan biru vs Pengeluaran merah)
 * per hari — dibuat custom agar ringan dan khas aplikasi mobile.
 */
export function DailyBars({
  data,
  height = 120,
  compact = false,
}: {
  data: SeriesPoint[]
  height?: number
  compact?: boolean
}) {
  const max = Math.max(1, ...data.flatMap((d) => [d.income, d.expense]))
  const anyValue = data.some((d) => d.income > 0 || d.expense > 0)

  return (
    <div className="w-full">
      {anyValue ? (
        <div
          className="flex items-end gap-1.5 overflow-x-auto no-scrollbar"
          style={{ height }}
          role="img"
          aria-label="Grafik pemasukan dan pengeluaran harian"
        >
          {data.map((d) => (
            <div
              key={d.date}
              className="flex h-full min-w-[28px] flex-1 flex-col justify-end gap-1"
              title={`${shortDateLabel(d.date)} — Masuk ${formatRupiah(d.income)}, Keluar ${formatRupiah(d.expense)}`}
            >
              <div className="flex min-h-0 w-full flex-1 items-end justify-center gap-[3px]">
                <motion.div
                  initial={{ height: 0 }}
                  animate={{
                    height: `${Math.max(d.income > 0 ? 6 : 2, (d.income / max) * 100)}%`,
                  }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  className="w-[45%] max-w-[26px] rounded-t-md bg-income"
                />
                <motion.div
                  initial={{ height: 0 }}
                  animate={{
                    height: `${Math.max(d.expense > 0 ? 6 : 2, (d.expense / max) * 100)}%`,
                  }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  className="w-[45%] max-w-[26px] rounded-t-md bg-expense/85"
                />
              </div>
              {!compact && (
                <span className="text-[10px] font-semibold text-ink-soft">{d.label}</span>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div
          className="flex items-center justify-center rounded-2xl border border-dashed border-border text-sm text-ink-soft"
          style={{ height }}
        >
          Belum ada data untuk grafik
        </div>
      )}
      {!compact && (
        <div className="mt-2.5 flex items-center justify-center gap-4 text-[11px] font-semibold text-ink-soft">
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-income" /> Pemasukan
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-expense" /> Pengeluaran
          </span>
          {anyValue && (
            <span className="hidden text-ink-soft sm:inline">
              Maks: {formatRupiahShort(max)}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

/** Bar horizontal pembagian proporsi (breakdown laporan) */
export function ShareBar({
  total,
  max,
  tone = 'income',
}: {
  total: number
  max: number
  tone?: 'income' | 'expense'
}) {
  const pct = max > 0 ? Math.max(2, Math.round((total / max) * 100)) : 0
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
      <div
        className={`h-full rounded-full ${tone === 'income' ? 'bg-income' : 'bg-expense'}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
