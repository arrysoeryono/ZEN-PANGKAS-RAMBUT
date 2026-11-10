'use client'

import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { CalendarRange, Download, Printer, Users } from 'lucide-react'
import { api, buildQuery } from '@/lib/api-client'
import { formatRupiah } from '@/lib/format'
import { formatJakartaDate, jakartaDateKey, jakartaWeekStart, shortDateLabel } from '@/lib/time'
import { DailyBars, ShareBar } from '@/components/shared/daily-bars'
import { LogoMark } from '@/components/shared/logo'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { ReportData } from '@/lib/client-types'

type Preset = 'today' | 'yesterday' | '7d' | 'month' | 'lastMonth' | 'custom'

const PRESETS: { value: Preset; label: string }[] = [
  { value: 'today', label: 'Hari Ini' },
  { value: 'yesterday', label: 'Kemarin' },
  { value: '7d', label: 'Minggu Ini' },
  { value: 'month', label: 'Bulan Ini' },
  { value: 'lastMonth', label: 'Bulan Lalu' },
  { value: 'custom', label: 'Kustom' },
]

function rangeFor(preset: Preset, customFrom: string, customTo: string): { from: string; to: string } {
  const now = new Date()
  const today = jakartaDateKey(now)
  switch (preset) {
    case 'today':
      return { from: today, to: today }
    case 'yesterday': {
      const y = jakartaDateKey(new Date(now.getTime() - 86400000))
      return { from: y, to: y }
    }
    case '7d': {
      const start = jakartaDateKey(jakartaWeekStart(now))
      return { from: start, to: today }
    }
    case 'month': {
      const d = now.getTime() + 7 * 3600000
      const ym = new Date(d).toISOString().slice(0, 7)
      return { from: `${ym}-01`, to: today }
    }
    case 'lastMonth': {
      const d = new Date(now.getTime() + 7 * 3600000)
      const ym = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 1, 1))
        .toISOString()
        .slice(0, 7)
      const [y, m] = ym.split('-').map(Number)
      const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate()
      return { from: `${ym}-01`, to: `${ym}-${String(lastDay).padStart(2, '0')}` }
    }
    case 'custom':
      return { from: customFrom || today, to: customTo || today }
  }
}

/** Tab Laporan (owner): ringkasan, grafik, rincian, ekspor CSV, cetak PDF */
export function ReportsView() {
  const [preset, setPreset] = useState<Preset>('today')
  const [customFrom, setCustomFrom] = useState(jakartaDateKey(new Date()))
  const [customTo, setCustomTo] = useState(jakartaDateKey(new Date()))

  const { from, to } = rangeFor(preset, customFrom, customTo)
  const query = buildQuery({ from, to })

  const { data, isLoading } = useQuery<ReportData>({
    queryKey: ['reports', from, to],
    queryFn: () => api<ReportData>(`/api/reports${query}`),
  })

  const maxService = Math.max(1, ...(data?.byService ?? []).map((s) => s.total))
  const maxCategory = Math.max(1, ...(data?.byCategory ?? []).map((c) => c.total))

  return (
    <div className="px-4 pb-4 pt-2">
      <header>
        <h1 className="text-[22px] font-extrabold tracking-tight">Laporan</h1>
        <p className="text-sm text-ink-soft">Rekap keuangan per periode (WIB)</p>
      </header>

      {/* Pilih periode */}
      <div className="mt-3 flex gap-2 overflow-x-auto no-scrollbar">
        {PRESETS.map((p) => (
          <button
            key={p.value}
            type="button"
            onClick={() => setPreset(p.value)}
            className={cn(
              'shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold transition',
              preset === p.value
                ? 'bg-foreground text-cream shadow-md'
                : 'border border-border bg-card text-ink-soft',
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {preset === 'custom' && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mt-3 flex items-center gap-2 overflow-hidden rounded-2xl border border-border bg-card p-3"
        >
          <CalendarRange className="size-4 shrink-0 text-ink-soft" />
          <input
            type="date"
            value={customFrom}
            max={customTo}
            onChange={(e) => setCustomFrom(e.target.value)}
            className="h-9 flex-1 rounded-xl border border-input bg-background px-2 text-sm font-semibold outline-none"
            aria-label="Tanggal awal"
          />
          <span className="text-xs font-bold text-ink-soft">s/d</span>
          <input
            type="date"
            value={customTo}
            min={customFrom}
            max={jakartaDateKey(new Date())}
            onChange={(e) => setCustomTo(e.target.value)}
            className="h-9 flex-1 rounded-xl border border-input bg-background px-2 text-sm font-semibold outline-none"
            aria-label="Tanggal akhir"
          />
        </motion.div>
      )}

      {isLoading || !data ? (
        <div className="mt-4 space-y-4">
          <Skeleton className="h-40 rounded-3xl" />
          <Skeleton className="h-48 rounded-3xl" />
          <Skeleton className="h-40 rounded-3xl" />
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          {/* Ringkasan utama */}
          <motion.section
            key={`${from}-${to}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl bg-foreground p-5 text-cream shadow-xl shadow-foreground/15"
          >
            <p className="text-xs font-bold uppercase tracking-wider text-cream/60">
              Laba Bersih · {shortDateLabel(data.from)} – {shortDateLabel(data.to)}
            </p>
            <p
              className={cn(
                'tnum mt-1.5 text-[34px] font-extrabold leading-none tracking-tight',
                data.summary.net < 0 && 'text-[#FFB3A7]',
              )}
            >
              {formatRupiah(data.summary.net)}
            </p>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-2xl bg-cream/10 p-3">
                <p className="tnum text-base font-extrabold text-[#7FC5F5]">
                  {formatRupiah(data.summary.income)}
                </p>
                <p className="mt-0.5 text-[11px] font-semibold text-cream/70">
                  Masuk ({data.summary.incomeCount}x)
                </p>
              </div>
              <div className="rounded-2xl bg-cream/10 p-3">
                <p className="tnum text-base font-extrabold text-[#FFB3A7]">
                  {formatRupiah(data.summary.expense)}
                </p>
                <p className="mt-0.5 text-[11px] font-semibold text-cream/70">
                  Keluar ({data.summary.expenseCount}x)
                </p>
              </div>
              <div className="rounded-2xl bg-cream/10 p-3">
                <p className="tnum text-base font-extrabold">{formatRupiah(data.summary.avgPerDay)}</p>
                <p className="mt-0.5 text-[11px] font-semibold text-cream/70">Rata-rata/hari</p>
              </div>
            </div>
          </motion.section>

          {/* Grafik harian */}
          <section className="rounded-3xl border border-border bg-card p-5 shadow-sm">
            <h2 className="text-sm font-extrabold">Perkembangan Harian</h2>
            <div className="mt-3">
              <DailyBars
                data={data.byDay.map((d) => ({
                  date: d.date,
                  label: shortDateLabel(d.date).split(' ')[0],
                  income: d.income,
                  expense: d.expense,
                }))}
                height={140}
              />
            </div>
          </section>

          {/* Rincian layanan */}
          <section className="rounded-3xl border border-border bg-card p-5 shadow-sm">
            <h2 className="text-sm font-extrabold">Pemasukan per Layanan</h2>
            {data.byService.length === 0 ? (
              <p className="mt-2 text-sm text-ink-soft">Belum ada data</p>
            ) : (
              <div className="mt-3 space-y-3">
                {data.byService.map((s) => (
                  <div key={s.name}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-bold text-foreground">
                        {s.name}
                        <span className="ml-1.5 text-xs font-semibold text-ink-soft">{s.count}x</span>
                      </span>
                      <span className="tnum font-extrabold text-income">{formatRupiah(s.total)}</span>
                    </div>
                    <ShareBar total={s.total} max={maxService} tone="income" />
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Rincian kategori */}
          <section className="rounded-3xl border border-border bg-card p-5 shadow-sm">
            <h2 className="text-sm font-extrabold">Pengeluaran per Kategori</h2>
            {data.byCategory.length === 0 ? (
              <p className="mt-2 text-sm text-ink-soft">Belum ada data</p>
            ) : (
              <div className="mt-3 space-y-3">
                {data.byCategory.map((c) => (
                  <div key={c.name}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-bold text-foreground">
                        {c.name}
                        <span className="ml-1.5 text-xs font-semibold text-ink-soft">{c.count}x</span>
                      </span>
                      <span className="tnum font-extrabold text-expense">
                        {formatRupiah(c.total)}
                      </span>
                    </div>
                    <ShareBar total={c.total} max={maxCategory} tone="expense" />
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Kinerja karyawan */}
          <section className="rounded-3xl border border-border bg-card p-5 shadow-sm">
            <h2 className="flex items-center gap-2 text-sm font-extrabold">
              <Users className="size-4 text-income" /> Kinerja Pencatat
            </h2>
            {data.byEmployee.length === 0 ? (
              <p className="mt-2 text-sm text-ink-soft">Belum ada data</p>
            ) : (
              <div className="mt-3 space-y-2">
                {data.byEmployee.map((e, i) => (
                  <div
                    key={e.userId}
                    className="flex items-center gap-3 rounded-2xl bg-secondary/60 px-3 py-2.5"
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-card text-xs font-extrabold text-foreground shadow-sm">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-foreground">{e.name}</p>
                      <p className="text-[11px] font-semibold text-ink-soft">
                        {e.incomeCount}x masuk · {e.expenseCount}x keluar
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="tnum text-sm font-extrabold text-income">
                        +{formatRupiah(e.incomeTotal)}
                      </p>
                      <p className="tnum text-[11px] font-bold text-expense">
                        −{formatRupiah(e.expenseTotal)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Aksi ekspor */}
          <section className="grid grid-cols-2 gap-3">
            <a
              href={`/api/reports/export${query}`}
              download
              className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-income/40 bg-income-soft text-sm font-extrabold text-income transition active:scale-[0.98]"
            >
              <Download className="size-4.5" /> Unduh CSV
            </a>
            <button
              type="button"
              onClick={() => window.print()}
              className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-foreground/20 bg-foreground text-sm font-extrabold text-cream transition active:scale-[0.98]"
            >
              <Printer className="size-4.5" /> Cetak / PDF
            </button>
          </section>
        </div>
      )}

      {/* Lembar cetak (muncul hanya saat print) */}
      {typeof document !== 'undefined' && data && createPortal(<PrintSheet data={data} />, document.body)}
    </div>
  )
}

/** Dokumen laporan formal untuk dicetak */
function PrintSheet({ data }: { data: ReportData }) {
  return (
    <div className="print-only font-sans text-black">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, borderBottom: '3px solid #E24C3B', paddingBottom: 12 }}>
        <LogoMark size={44} />
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: 2 }}>ZEN PANGKAS RAMBUT</div>
          <div style={{ fontSize: 11, color: '#666' }}>
            Laporan Keuangan · {formatJakartaDate(data.from)} s.d. {formatJakartaDate(data.to)} (WIB)
          </div>
        </div>
        <div style={{ marginLeft: 'auto', textAlign: 'right', fontSize: 11, color: '#666' }}>
          Dicetak: {formatJakartaDate(new Date())}
          <br />
          {new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' }).format(new Date())} WIB
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
        {[
          { label: 'Total Pemasukan', value: data.summary.income, color: '#0088E0' },
          { label: 'Total Pengeluaran', value: data.summary.expense, color: '#E24C3B' },
          { label: 'Laba Bersih', value: data.summary.net, color: '#33261F' },
        ].map((s) => (
          <div
            key={s.label}
            style={{ flex: 1, border: '1px solid #ddd', borderRadius: 10, padding: '10px 12px' }}
          >
            <div style={{ fontSize: 10, color: '#777', fontWeight: 700 }}>{s.label}</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: s.color }}>{formatRupiah(s.value)}</div>
          </div>
        ))}
      </div>

      <PrintTable
        title="Pemasukan per Layanan"
        rows={data.byService.map((s) => [s.name, `${s.count}x`, formatRupiah(s.total)])}
      />
      <PrintTable
        title="Pengeluaran per Kategori"
        rows={data.byCategory.map((c) => [c.name, `${c.count}x`, formatRupiah(c.total)])}
      />
      <PrintTable
        title="Kinerja Pencatat"
        rows={data.byEmployee.map((e) => [
          e.name,
          `${e.incomeCount}x masuk / ${e.expenseCount}x keluar`,
          formatRupiah(e.incomeTotal - e.expenseTotal),
        ])}
      />

      <div style={{ marginTop: 28, display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{ textAlign: 'center', fontSize: 12 }}>
          <div>{data.to.split('-')[2]} / {data.to.split('-')[1]} / {data.to.split('-')[0]}</div>
          <div style={{ marginTop: 48 }}>Pemilik</div>
          <div style={{ marginTop: 48, borderTop: '1px solid #000', paddingTop: 4, width: 180 }}>
            ( .................................... )
          </div>
        </div>
      </div>
    </div>
  )
}

function PrintTable({ title, rows }: { title: string; rows: string[][] }) {
  if (rows.length === 0) return null
  return (
    <div style={{ marginTop: 18 }}>
      <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 6 }}>{title}</div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #bbb', padding: '4px 6px' }}>Nama</th>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #bbb', padding: '4px 6px' }}>Detail</th>
            <th style={{ textAlign: 'right', borderBottom: '1px solid #bbb', padding: '4px 6px' }}>Nilai</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td style={{ borderBottom: '1px solid #eee', padding: '4px 6px' }}>{r[0]}</td>
              <td style={{ borderBottom: '1px solid #eee', padding: '4px 6px', color: '#555' }}>{r[1]}</td>
              <td style={{ borderBottom: '1px solid #eee', padding: '4px 6px', textAlign: 'right', fontWeight: 700 }}>
                {r[2]}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
