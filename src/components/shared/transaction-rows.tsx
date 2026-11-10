'use client'

import { ArrowDownLeft, ArrowUpRight, ReceiptText } from 'lucide-react'
import { formatRupiah } from '@/lib/format'
import { formatJakartaTime } from '@/lib/time'
import { cn } from '@/lib/utils'
import type { TxItem } from '@/lib/client-types'

/** Baris transaksi ringkas: ikon jenis, judul, waktu + pencatat, nominal berwarna */
export function TransactionRow({ tx, onClick }: { tx: TxItem; onClick?: () => void }) {
  const income = tx.type === 'INCOME'
  const title = tx.serviceName ?? tx.categoryName ?? 'Transaksi'
  const detail = tx.note ? tx.note : income ? 'Pemasukan' : 'Pengeluaran'

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition hover:bg-secondary/60 active:scale-[0.99]"
    >
      <span
        className={cn(
          'flex size-10 shrink-0 items-center justify-center rounded-full',
          income ? 'bg-income-soft text-income' : 'bg-expense-soft text-expense',
        )}
      >
        {income ? <ArrowUpRight className="size-5" /> : <ArrowDownLeft className="size-5" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-semibold text-foreground">{title}</span>
        <span className="block truncate text-xs text-ink-soft">
          {formatJakartaTime(tx.createdAt)} · {tx.userName}
          {tx.note ? ` · ${tx.note}` : ''}
        </span>
      </span>
      <span className="tnum shrink-0 text-right">
        <span
          className={cn(
            'block text-[15px] font-bold',
            income ? 'text-income' : 'text-expense',
          )}
        >
          {income ? '+' : '−'}
          {formatRupiah(tx.amount)}
        </span>
      </span>
    </button>
  )
}

/** Baris transaksi versi print/detail penuh */
export function TransactionPrintRow({ tx }: { tx: TxItem }) {
  const income = tx.type === 'INCOME'
  const title = tx.serviceName ?? tx.categoryName ?? 'Transaksi'
  return (
    <div className="flex items-center justify-between border-b border-black/10 py-1.5 text-[13px]">
      <span>
        {title}
        {tx.note ? <span className="text-black/50"> — {tx.note}</span> : null}
        <span className="text-black/50"> · {tx.userName}</span>
      </span>
      <span className={cn('tnum font-bold', income ? 'text-[#0088E0]' : 'text-[#E24C3B]')}>
        {income ? '+' : '−'}
        {formatRupiah(tx.amount)}
      </span>
    </div>
  )
}

export function EmptyState({
  icon,
  title,
  description,
}: {
  icon?: React.ReactNode
  title: string
  description?: string
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-border bg-card/50 px-6 py-10 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-secondary text-ink-soft">
        {icon ?? <ReceiptText className="size-7" />}
      </span>
      <div>
        <p className="font-bold text-foreground">{title}</p>
        {description && <p className="mt-1 text-sm text-ink-soft">{description}</p>}
      </div>
    </div>
  )
}
