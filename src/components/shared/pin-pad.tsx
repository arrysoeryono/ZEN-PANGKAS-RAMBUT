'use client'

import { motion } from 'framer-motion'
import { Keypad } from './keypad'
import { cn } from '@/lib/utils'

interface PinPadProps {
  value: string
  onChange: (v: string) => void
  onSubmit?: () => void
  maxLength?: number
  disabled?: boolean
  /** label bantuan di atas titik-titik */
  hint?: string
  shake?: boolean
}

/** Titik PIN + keypad numerik — dipakai di setup & login */
export function PinPad({
  value,
  onChange,
  onSubmit,
  maxLength = 6,
  disabled = false,
  hint,
  shake = false,
}: PinPadProps) {
  const dots = Array.from({ length: maxLength })

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col items-center gap-3">
        {hint && <p className="text-sm font-medium text-ink-soft">{hint}</p>}
        <motion.div
          animate={shake ? { x: [0, -10, 10, -8, 8, 0] } : { x: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center gap-2.5"
          aria-label={`PIN terisi ${value.length} digit`}
          role="status"
        >
          {dots.map((_, i) => {
            const filled = i < value.length
            return (
              <motion.span
                key={i}
                animate={filled ? { scale: [1.4, 1] } : { scale: 1 }}
                transition={{ duration: 0.2 }}
                className={cn(
                  'size-3.5 rounded-full border-2 transition-colors',
                  filled ? 'border-primary bg-primary' : 'border-border bg-card',
                )}
              />
            )
          })}
        </motion.div>
      </div>
      <Keypad value={value} onChange={onChange} maxLength={maxLength} className={cn(disabled && 'pointer-events-none opacity-50')} />
      {onSubmit && (
        <button
          type="button"
          disabled={disabled || value.length < 4}
          onClick={onSubmit}
          className="h-13 w-full rounded-2xl bg-primary text-[15px] font-bold text-primary-foreground shadow-lg shadow-primary/25 transition hover:bg-primary/90 active:scale-[0.98] disabled:opacity-40 disabled:shadow-none"
        >
          Masuk
        </button>
      )}
    </div>
  )
}
