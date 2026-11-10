'use client'

import { motion } from 'framer-motion'
import { Home, Menu, Plus, ReceiptText } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Role } from '@/lib/client-types'

export type Tab = 'home' | 'input' | 'history' | 'reports' | 'settings'

interface NavItem {
  id: Tab
  label: string
  icon: React.ComponentType<{ className?: string }>
}

/** Bar navigasi bawah dengan tombol tengah menonjol (Catat Transaksi) */
export function BottomNav({
  active,
  onChange,
  role,
}: {
  active: Tab
  onChange: (tab: Tab) => void
  role: Role | undefined
}) {
  const isOwner = role === 'OWNER'
  const items: NavItem[] = [
    { id: 'home', label: 'Beranda', icon: Home },
    { id: 'history', label: 'Riwayat', icon: ReceiptText },
    ...(isOwner ? [{ id: 'reports' as Tab, label: 'Laporan', icon: ReceiptText }] : []),
    { id: 'settings', label: 'Menu', icon: Menu },
  ]

  // Sisipkan slot FAB di tengah
  const half = Math.ceil(items.length / 2)
  const left = items.slice(0, half)
  const right = items.slice(half)

  function renderItem(item: NavItem) {
    const Icon = item.icon
    const isActive = active === item.id
    return (
      <button
        key={item.id}
        type="button"
        onClick={() => onChange(item.id)}
        className={cn(
          'flex flex-1 flex-col items-center gap-0.5 py-1.5 transition-colors',
          isActive ? 'text-primary' : 'text-ink-soft hover:text-foreground',
        )}
        aria-label={item.label}
        aria-current={isActive ? 'page' : undefined}
      >
        <span className="relative flex items-center justify-center">
          {isActive && (
            <motion.span
              layoutId="nav-pill"
              className="absolute -inset-x-3 -inset-y-1 rounded-2xl bg-primary/10"
              transition={{ type: 'spring', bounce: 0.25, duration: 0.45 }}
            />
          )}
          <Icon className="relative size-5.5" />
        </span>
        <span className={cn('relative text-[10px]', isActive ? 'font-extrabold' : 'font-semibold')}>
          {item.label}
        </span>
      </button>
    )
  }

  return (
    <nav
      className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/90 backdrop-blur-lg pb-safe"
      aria-label="Navigasi utama"
    >
      <div className="mx-auto flex max-w-md items-end px-2">
        {left.map(renderItem)}

        {/* FAB tengah */}
        <div className="relative -mt-6 flex w-16 justify-center">
          <motion.button
            whileTap={{ scale: 0.92 }}
            type="button"
            onClick={() => onChange('input')}
            aria-label="Catat transaksi"
            className={cn(
              'flex size-14 flex-col items-center justify-center rounded-2xl text-white shadow-lg transition-colors',
              active === 'input'
                ? 'bg-foreground shadow-foreground/30'
                : 'bg-primary shadow-primary/40',
            )}
          >
            <Plus className="size-6" />
            <span className="text-[9px] font-extrabold">CATAT</span>
          </motion.button>
        </div>

        {right.map(renderItem)}
      </div>
    </nav>
  )
}
