'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft, Crown, User } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api-client'
import { useSession } from '@/components/app/session-provider'
import { LogoWordmark } from '@/components/shared/logo'
import { PinPad } from '@/components/shared/pin-pad'
import { cn } from '@/lib/utils'
import type { Role } from '@/lib/client-types'

interface LoginUser {
  id: string
  name: string
  role: Role
}

/** Layar login: pilih pengguna → masukkan PIN */
export function LoginScreen() {
  const { login } = useSession()
  const [users, setUsers] = useState<LoginUser[]>([])
  const [selected, setSelected] = useState<LoginUser | null>(null)
  const [pin, setPin] = useState('')
  const [shake, setShake] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api<{ items: LoginUser[] }>('/api/auth/users')
      .then((d) => setUsers(d.items))
      .catch(() => toast.error('Gagal memuat daftar pengguna'))
  }, [])

  async function submit() {
    if (!selected || pin.length < 4) return
    setBusy(true)
    try {
      await login(selected.id, pin)
      toast.success(`Selamat datang, ${selected.name}`)
    } catch (e) {
      setShake(true)
      setTimeout(() => setShake(false), 450)
      setPin('')
      toast.error(e instanceof Error ? e.message : 'PIN salah')
    } finally {
      setBusy(false)
    }
  }

  // pin otomatis dikirim saat mencapai 6 digit
  useEffect(() => {
    if (pin.length === 6 && !busy && selected) void submit()
  }, [pin])

  const initials = selected
    ? selected.name
        .split(' ')
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase() ?? '')
        .join('')
    : ''

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-6 pb-8 pt-safe">
      <div className="flex flex-1 flex-col items-center justify-center gap-7 py-8">
        <LogoWordmark size={64} />

        {!selected ? (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full space-y-3"
          >
            <p className="text-center text-sm font-semibold text-ink-soft">
              Siapa yang bekerja sekarang?
            </p>
            {users.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-card px-4 py-6 text-center text-sm text-ink-soft">
                Belum ada pengguna terdaftar
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {users.map((u, i) => (
                  <motion.button
                    key={u.id}
                    type="button"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.05 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setSelected(u)}
                    className={cn(
                      'flex items-center gap-3 rounded-2xl border border-border bg-card p-3 text-left shadow-sm transition hover:border-primary/40',
                    )}
                  >
                    <span
                      className={cn(
                        'flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-extrabold',
                        u.role === 'OWNER'
                          ? 'bg-primary/10 text-primary'
                          : 'bg-income-soft text-income',
                      )}
                    >
                      {u.name
                        .split(' ')
                        .slice(0, 2)
                        .map((w) => w[0]?.toUpperCase() ?? '')
                        .join('')}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold text-foreground">
                        {u.name}
                      </span>
                      <span
                        className={cn(
                          'flex items-center gap-1 text-[11px] font-semibold',
                          u.role === 'OWNER' ? 'text-primary' : 'text-ink-soft',
                        )}
                      >
                        {u.role === 'OWNER' ? (
                          <>
                            <Crown className="size-3" /> Owner
                          </>
                        ) : (
                          <>
                            <User className="size-3" /> Karyawan
                          </>
                        )}
                      </span>
                    </span>
                  </motion.button>
                ))}
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full space-y-5"
          >
            <div className="flex items-center justify-center gap-3">
              <span
                className={cn(
                  'flex size-12 items-center justify-center rounded-full text-base font-extrabold',
                  selected.role === 'OWNER'
                    ? 'bg-primary/10 text-primary'
                    : 'bg-income-soft text-income',
                )}
              >
                {initials}
              </span>
              <div>
                <p className="text-lg font-extrabold text-foreground">{selected.name}</p>
                <p className="text-xs font-semibold text-ink-soft">
                  {selected.role === 'OWNER' ? 'Owner' : 'Karyawan'}
                </p>
              </div>
            </div>
            <div className="rounded-3xl border border-border bg-card p-4 shadow-sm">
              <PinPad
                value={pin}
                onChange={setPin}
                onSubmit={submit}
                maxLength={6}
                disabled={busy}
                hint={`Masukkan PIN ${selected.name}`}
                shake={shake}
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setSelected(null)
                setPin('')
              }}
              className="mx-auto flex items-center gap-1.5 text-sm font-semibold text-ink-soft transition hover:text-foreground"
            >
              <ChevronLeft className="size-4" /> Ganti pengguna
            </button>
          </motion.div>
        )}
      </div>
    </div>
  )
}
