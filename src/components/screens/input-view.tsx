'use client'

import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Minus, Plus, StickyNote, Wallet, X } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api-client'
import { formatRupiah } from '@/lib/format'
import { Segmented } from '@/components/shared/segmented'
import { Keypad } from '@/components/shared/keypad'
import { cn } from '@/lib/utils'
import type { CategoryItem, ServiceItem, TxType } from '@/lib/client-types'

interface SelectedService {
  service: ServiceItem
  qty: number
}

interface CustomIncome {
  label: string
  amountDigits: string
}

/** Tab catat transaksi: pemasukan (layanan) & pengeluaran (kategori + keypad) */
export function InputView({
  initialMode = 'INCOME',
  onDone,
}: {
  initialMode?: TxType
  onDone: () => void
}) {
  const qc = useQueryClient()
  const [mode, setMode] = useState<TxType>(initialMode)
  const [selectedServices, setSelectedServices] = useState<Map<string, SelectedService>>(new Map())
  const [custom, setCustom] = useState<CustomIncome | null>(null)
  const [expenseCategory, setExpenseCategory] = useState<CategoryItem | null>(null)
  const [amountDigits, setAmountDigits] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  const { data: servicesData } = useQuery<{ items: ServiceItem[] }>({
    queryKey: ['services'],
    queryFn: () => api<{ items: ServiceItem[] }>('/api/services'),
  })
  const { data: categoriesData } = useQuery<{ items: CategoryItem[] }>({
    queryKey: ['categories'],
    queryFn: () => api<{ items: CategoryItem[] }>('/api/categories'),
  })

  const services = servicesData?.items ?? []
  const categories = categoriesData?.items ?? []

  const incomeTotal = useMemo(() => {
    let t = 0
    for (const s of selectedServices.values()) t += s.service.price * s.qty
    if (custom && custom.amountDigits) t += Number(custom.amountDigits)
    return t
  }, [selectedServices, custom])

  const expenseAmount = Number(amountDigits || '0')

  const hasIncomeItems = selectedServices.size > 0 || (custom !== null && Number(custom.amountDigits) >= 1)
  const canSaveExpense = expenseCategory !== null && expenseAmount >= 1

  const saveMutation = useMutation({
    mutationFn: (items: object[]) =>
      api<{ created: number }>('/api/transactions', {
        method: 'POST',
        body: JSON.stringify({ items }),
      }),
  })

  function bumpService(service: ServiceItem, delta: 1 | -1) {
    setSelectedServices((prev) => {
      const next = new Map(prev)
      const cur = next.get(service.id)
      const qty = (cur?.qty ?? 0) + delta
      if (qty <= 0) next.delete(service.id)
      else next.set(service.id, { service, qty: Math.min(50, qty) })
      return next
    })
  }

  function resetForm() {
    setSelectedServices(new Map())
    setCustom(null)
    setExpenseCategory(null)
    setAmountDigits('')
    setNote('')
  }

  async function save() {
    const items: object[] = []

    if (mode === 'INCOME') {
      if (!hasIncomeItems) {
        toast.error('Pilih layanan terlebih dahulu')
        return
      }
      for (const s of selectedServices.values()) {
        items.push({ type: 'INCOME', serviceId: s.service.id, qty: s.qty })
      }
      if (custom && Number(custom.amountDigits) >= 1) {
        items.push({
          type: 'INCOME',
          amount: Number(custom.amountDigits),
          note: custom.label.trim() || undefined,
        })
      }
      if (note.trim()) {
        // lampirkan catatan pada item pertama
        const first = items[0] as Record<string, unknown>
        first.note = note.trim()
      }
    } else {
      if (!canSaveExpense) {
        toast.error(!expenseCategory ? 'Pilih kategori pengeluaran' : 'Isi nominal minimal Rp1')
        return
      }
      items.push({
        type: 'EXPENSE',
        amount: expenseAmount,
        categoryId: expenseCategory!.id,
        note: note.trim() || undefined,
      })
    }

    setSaving(true)
    try {
      const res = await saveMutation.mutateAsync(items)
      toast.success(
        mode === 'INCOME'
          ? `${res.created} pemasukan tercatat — terima kasih!`
          : 'Pengeluaran tercatat',
      )
      resetForm()
      await qc.invalidateQueries({ queryKey: ['dashboard'] })
      await qc.invalidateQueries({ queryKey: ['transactions'] })
      await qc.invalidateQueries({ queryKey: ['reports'] })
      onDone()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal menyimpan')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex min-h-full flex-col px-4 pb-4 pt-2">
      <header className="pb-3">
        <h1 className="text-[22px] font-extrabold tracking-tight">Catat Transaksi</h1>
        <p className="text-sm text-ink-soft">Pencatat: Anda (tercatat otomatis)</p>
      </header>

      <Segmented
        options={[
          { value: 'INCOME' as TxType, label: 'Pemasukan' },
          { value: 'EXPENSE' as TxType, label: 'Pengeluaran' },
        ]}
        value={mode}
        onChange={(v) => setMode(v)}
        className="mb-4 w-full"
      />

      <AnimatePresence mode="wait">
        {mode === 'INCOME' ? (
          <motion.div
            key="income"
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.18 }}
            className="flex flex-1 flex-col gap-4"
          >
            {/* Kartu layanan */}
            <div className="space-y-2.5">
              {services.map((svc) => {
                const sel = selectedServices.get(svc.id)
                return (
                  <motion.div
                    key={svc.id}
                    layout
                    className={cn(
                      'flex items-center gap-3 rounded-3xl border bg-card p-4 shadow-sm transition',
                      sel ? 'border-income bg-income-soft/60' : 'border-border',
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => bumpService(svc, 1)}
                      className="flex flex-1 items-center gap-3 text-left"
                    >
                      <span
                        className={cn(
                          'flex size-11 shrink-0 items-center justify-center rounded-2xl',
                          sel ? 'bg-income text-white' : 'bg-income-soft text-income',
                        )}
                      >
                        <Wallet className="size-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-extrabold text-foreground">
                          {svc.name}
                        </span>
                        <span className="tnum text-sm font-bold text-income">
                          {formatRupiah(svc.price)}
                        </span>
                      </span>
                    </button>

                    {sel ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          aria-label="Kurangi"
                          onClick={() => bumpService(svc, -1)}
                          className="flex size-9 items-center justify-center rounded-xl bg-card text-foreground shadow-sm transition active:scale-90"
                        >
                          <Minus className="size-4" />
                        </button>
                        <motion.span
                          key={sel.qty}
                          initial={{ scale: 1.3 }}
                          animate={{ scale: 1 }}
                          className="tnum flex h-9 w-8 items-center justify-center text-lg font-extrabold text-foreground"
                        >
                          {sel.qty}
                        </motion.span>
                        <button
                          type="button"
                          aria-label="Tambah"
                          onClick={() => bumpService(svc, 1)}
                          className="flex size-9 items-center justify-center rounded-xl bg-income text-white shadow-sm transition active:scale-90"
                        >
                          <Plus className="size-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => bumpService(svc, 1)}
                        className="flex size-9 items-center justify-center rounded-xl border border-income/30 text-income transition hover:bg-income-soft active:scale-90"
                        aria-label={`Tambah ${svc.name}`}
                      >
                        <Plus className="size-4" />
                      </button>
                    )}
                  </motion.div>
                )
              })}
              {services.length === 0 && (
                <div className="rounded-2xl border border-dashed border-border p-4 text-center text-sm text-ink-soft">
                  Belum ada layanan aktif. Owner bisa menambahnya di Menu.
                </div>
              )}
            </div>

            {/* Pendapatan lain (custom) */}
            {custom ? (
              <div className="rounded-3xl border border-income/30 bg-card p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-extrabold text-foreground">Pendapatan Lain</p>
                  <button
                    type="button"
                    aria-label="Hapus pendapatan lain"
                    onClick={() => setCustom(null)}
                    className="flex size-8 items-center justify-center rounded-full bg-expense-soft text-expense"
                  >
                    <X className="size-4" />
                  </button>
                </div>
                <input
                  value={custom.label}
                  onChange={(e) => setCustom({ ...custom, label: e.target.value })}
                  placeholder="cth: Keratin, Shampoo, Tip..."
                  maxLength={60}
                  className="mt-3 h-11 w-full rounded-2xl border border-input bg-background px-4 text-sm font-semibold outline-none focus:border-income"
                />
                <div className="mt-2">
                  <Keypad
                    value={custom.amountDigits}
                    onChange={(v) => setCustom({ ...custom, amountDigits: v })}
                    quickAdd
                  />
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setCustom({ label: '', amountDigits: '' })}
                className="flex items-center justify-center gap-2 rounded-3xl border border-dashed border-income/40 bg-income-soft/50 py-3.5 text-sm font-bold text-income transition active:scale-[0.98]"
              >
                <Plus className="size-4.5" /> Tambah pendapatan lain (nominal bebas)
              </button>
            )}

            <NoteInput value={note} onChange={setNote} />

            {/* Footer simpan */}
            <div className="sticky bottom-[calc(64px+env(safe-area-inset-bottom))] -mx-4 mt-auto bg-gradient-to-t from-background via-background to-transparent px-4 pb-1 pt-4">
              <div className="mb-2 flex items-center justify-between rounded-2xl bg-card px-4 py-2.5 shadow-sm">
                <span className="text-sm font-bold text-ink-soft">Total Pemasukan</span>
                <span className="tnum text-lg font-extrabold text-income">
                  {formatRupiah(incomeTotal)}
                </span>
              </div>
              <button
                type="button"
                disabled={!hasIncomeItems || saving}
                onClick={save}
                className="flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-income text-[15px] font-extrabold text-white shadow-lg shadow-income/30 transition hover:bg-income/90 active:scale-[0.98] disabled:opacity-40 disabled:shadow-none"
              >
                <Check className="size-5" />
                {saving ? 'Menyimpan...' : 'Simpan Pemasukan'}
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="expense"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 16 }}
            transition={{ duration: 0.18 }}
            className="flex flex-1 flex-col gap-4"
          >
            {/* Kategori */}
            <div>
              <p className="mb-2 text-sm font-bold text-foreground">Kategori Pengeluaran</p>
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => {
                  const active = expenseCategory?.id === cat.id
                  return (
                    <motion.button
                      key={cat.id}
                      whileTap={{ scale: 0.95 }}
                      type="button"
                      onClick={() => setExpenseCategory(cat)}
                      className={cn(
                        'rounded-2xl border px-4 py-2.5 text-sm font-bold transition',
                        active
                          ? 'border-expense bg-expense text-white shadow-md shadow-expense/25'
                          : 'border-border bg-card text-foreground shadow-sm hover:border-expense/40',
                      )}
                    >
                      {cat.name}
                    </motion.button>
                  )
                })}
                {categories.length === 0 && (
                  <div className="w-full rounded-2xl border border-dashed border-border p-4 text-center text-sm text-ink-soft">
                    Belum ada kategori. Owner bisa menambahnya di Menu.
                  </div>
                )}
              </div>
            </div>

            {/* Nominal */}
            <div className="rounded-3xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-baseline justify-between">
                <p className="text-sm font-bold text-ink-soft">Nominal</p>
                <p
                  className={cn(
                    'tnum text-[32px] font-extrabold leading-none transition',
                    expenseAmount > 0 ? 'text-expense' : 'text-ink-soft/50',
                  )}
                >
                  {formatRupiah(expenseAmount)}
                </p>
              </div>
              <div className="mt-4">
                <Keypad value={amountDigits} onChange={setAmountDigits} quickAdd />
              </div>
            </div>

            <NoteInput value={note} onChange={setNote} />

            <div className="sticky bottom-[calc(64px+env(safe-area-inset-bottom))] -mx-4 mt-auto bg-gradient-to-t from-background via-background to-transparent px-4 pb-1 pt-4">
              <button
                type="button"
                disabled={!canSaveExpense || saving}
                onClick={save}
                className="flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-expense text-[15px] font-extrabold text-white shadow-lg shadow-expense/30 transition hover:bg-expense/90 active:scale-[0.98] disabled:opacity-40 disabled:shadow-none"
              >
                <Check className="size-5" />
                {saving ? 'Menyimpan...' : 'Simpan Pengeluaran'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function NoteInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative">
      <StickyNote className="pointer-events-none absolute left-4 top-1/2 size-4.5 -translate-y-1/2 text-ink-soft" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Catatan (opsional)"
        maxLength={100}
        className="h-12 w-full rounded-2xl border border-input bg-card pl-11 pr-4 text-sm font-semibold outline-none transition placeholder:font-normal placeholder:text-ink-soft focus:border-primary"
      />
    </div>
  )
}
