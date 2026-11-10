'use client'

import { Delete } from 'lucide-react'
import { cn } from '@/lib/utils'

interface KeypadProps {
  /** nilai berupa string digit murni ("15000") */
  value: string
  onChange: (next: string) => void
  maxLength?: number
  className?: string
  /** tampilkan tombol +5rb/+10rb/+20rb/+50rb */
  quickAdd?: boolean
}

const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9']

/**
 * Keypad numerik bergaya aplikasi pembayaran:
 * 1-9, tombol +000, 0, dan backspace.
 */
export function Keypad({ value, onChange, maxLength = 9, className, quickAdd = false }: KeypadProps) {
  function push(digit: string) {
    if (value.length >= maxLength) return
    if (value === '0' && digit === '0') return
    onChange(value === '0' ? digit : value + digit)
  }

  function addThousands(nZeros: number) {
    const base = value === '' ? '0' : value
    if (base.length + nZeros > maxLength) return
    onChange(base === '0' ? '' : base + '0'.repeat(nZeros))
  }

  /** Tambahkan nominal tetap (cth: 5000) secara aritmetik */
  function addAmount(amount: number) {
    const next = String((Number(value || '0') || 0) + amount)
    if (next.length > maxLength) return
    onChange(next === '0' ? '' : next)
  }

  function backspace() {
    onChange(value.slice(0, -1))
  }

  const quicks: { label: string; amount: number }[] = [
    { label: '+5rb', amount: 5000 },
    { label: '+10rb', amount: 10000 },
    { label: '+20rb', amount: 20000 },
    { label: '+50rb', amount: 50000 },
  ]

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {quickAdd && (
        <div className="grid grid-cols-5 gap-2">
          {quicks.map((q) => (
            <button
              key={q.label}
              type="button"
              onClick={() => addAmount(q.amount)}
              className="h-10 rounded-xl border border-border bg-card text-sm font-semibold text-foreground/80 transition active:scale-95 hover:bg-secondary"
            >
              {q.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => onChange('')}
            className="h-10 rounded-xl border border-border bg-card text-sm font-semibold text-expense transition active:scale-95 hover:bg-expense-soft"
          >
            C
          </button>
        </div>
      )}
      <div className="grid grid-cols-3 gap-2.5">
        {DIGITS.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => push(d)}
            className="tnum flex h-13 items-center justify-center rounded-2xl bg-card text-xl font-bold text-foreground shadow-sm transition hover:bg-secondary active:scale-[0.96]"
          >
            {d}
          </button>
        ))}
        <button
          type="button"
          onClick={() => addThousands(3)}
          className="flex h-13 items-center justify-center rounded-2xl bg-card text-lg font-bold text-ink-soft shadow-sm transition hover:bg-secondary active:scale-[0.96]"
        >
          000
        </button>
        <button
          type="button"
          onClick={() => push('0')}
          className="tnum flex h-13 items-center justify-center rounded-2xl bg-card text-xl font-bold text-foreground shadow-sm transition hover:bg-secondary active:scale-[0.96]"
        >
          0
        </button>
        <button
          type="button"
          onClick={backspace}
          aria-label="Hapus satu angka"
          className="flex h-13 items-center justify-center rounded-2xl bg-card text-ink-soft shadow-sm transition hover:bg-secondary active:scale-[0.96]"
        >
          <Delete className="size-5" />
        </button>
      </div>
    </div>
  )
}
