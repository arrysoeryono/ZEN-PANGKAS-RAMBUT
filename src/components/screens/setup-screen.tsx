'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Scissors, Sparkles, Wallet, FileBarChart2, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api-client'
import { useSession } from '@/components/app/session-provider'
import { LogoWordmark } from '@/components/shared/logo'
import { PinPad } from '@/components/shared/pin-pad'
import { validatePinClient } from '@/components/shared/validators'

const FEATURES = [
  { icon: Wallet, text: 'Catat pemasukan & pengeluaran harian' },
  { icon: FileBarChart2, text: 'Laporan otomatis + ekspor CSV & PDF' },
  { icon: Scissors, text: 'Harga jasa Anak & Dewasa siap pakai' },
  { icon: ShieldCheck, text: 'Tiap karyawan login dengan PIN sendiri' },
]

/** Wizard pertama kali: buat akun owner + seed data default */
export function SetupScreen() {
  const { refresh } = useSession()
  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [pin, setPin] = useState('')
  const [pin2, setPin2] = useState('')
  const [shake, setShake] = useState(false)
  const [saving, setSaving] = useState(false)

  async function submit() {
    if (name.trim().length < 2) {
      toast.error('Isi nama Anda (minimal 2 karakter)')
      return
    }
    if (validatePinClient(pin) !== null) {
      toast.error('PIN harus 4-6 digit angka')
      setShake(true)
      setTimeout(() => setShake(false), 450)
      return
    }
    if (pin !== pin2) {
      toast.error('Konfirmasi PIN tidak sama')
      setShake(true)
      setTimeout(() => setShake(false), 450)
      return
    }
    setSaving(true)
    try {
      await api('/api/setup', {
        method: 'POST',
        body: JSON.stringify({ name: name.trim(), pin }),
      })
      toast.success('Selamat! ZEN siap digunakan')
      await refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal setup')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-6 pb-10 pt-safe">
      {step === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-1 flex-col items-center justify-center gap-8"
        >
          <LogoWordmark size={72} />
          <div className="w-full space-y-3">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.text}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 + i * 0.08 }}
                className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-sm"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-income-soft text-income">
                  <f.icon className="size-4.5" />
                </span>
                <p className="text-sm font-semibold text-foreground">{f.text}</p>
              </motion.div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setStep(1)}
            className="flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-[15px] font-bold text-primary-foreground shadow-lg shadow-primary/25 transition hover:bg-primary/90 active:scale-[0.98]"
          >
            <Sparkles className="size-5" />
            Mulai Setup Owner
          </button>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex flex-1 flex-col gap-6 pt-6"
        >
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">Buat Akun Owner</h1>
            <p className="mt-1 text-sm text-ink-soft">
              Owner dapat mengelola karyawan, harga, dan laporan lengkap.
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="owner-name" className="text-sm font-semibold text-foreground">
              Nama Anda
            </label>
            <input
              id="owner-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="cth: Pak Zen"
              maxLength={40}
              className="h-12 w-full rounded-2xl border border-input bg-card px-4 text-[15px] font-semibold outline-none transition placeholder:font-normal placeholder:text-ink-soft focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="rounded-3xl border border-border bg-card p-4 shadow-sm">
            <PinPad
              value={pin}
              onChange={setPin}
              maxLength={6}
              hint="Buat PIN (4-6 digit)"
              shake={shake}
            />
          </div>

          <div className="rounded-3xl border border-border bg-card p-4 shadow-sm">
            <PinPad
              value={pin2}
              onChange={setPin2}
              maxLength={6}
              hint="Ulangi PIN sekali lagi"
              shake={shake}
            />
          </div>

          <div className="mt-auto space-y-3 pt-2">
            <button
              type="button"
              disabled={saving}
              onClick={submit}
              className="flex h-13 w-full items-center justify-center rounded-2xl bg-primary text-[15px] font-bold text-primary-foreground shadow-lg shadow-primary/25 transition hover:bg-primary/90 active:scale-[0.98] disabled:opacity-60"
            >
              {saving ? 'Menyimpan...' : 'Selesaikan Setup'}
            </button>
            <button
              type="button"
              onClick={() => setStep(0)}
              className="h-11 w-full rounded-2xl text-sm font-semibold text-ink-soft transition hover:text-foreground"
            >
              Kembali
            </button>
          </div>
        </motion.div>
      )}
    </div>
  )
}
