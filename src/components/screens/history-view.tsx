'use client'

import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, Filter, Pencil, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { api, buildQuery } from '@/lib/api-client'
import { formatRupiah } from '@/lib/format'
import {
  formatJakartaDate,
  formatJakartaTime,
  jakartaDateKey,
  parseJakartaDateInput,
} from '@/lib/time'
import { useSession } from '@/components/app/session-provider'
import { Segmented } from '@/components/shared/segmented'
import { Keypad } from '@/components/shared/keypad'
import { TransactionRow, EmptyState } from '@/components/shared/transaction-rows'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { CategoryItem, TxItem, TxType } from '@/lib/client-types'

type Period = 'today' | '7d' | '30d' | 'all'
type TypeFilter = 'all' | TxType

const PERIOD_LABEL: Record<Period, string> = {
  today: 'Hari Ini',
  '7d': '7 Hari',
  '30d': '30 Hari',
  all: 'Semua',
}

/** Tab riwayat: filter periode/jenis, daftar per tanggal, detail + aksi owner */
export function HistoryView() {
  const { user } = useSession()
  const qc = useQueryClient()
  const isOwner = user?.role === 'OWNER'

  const [period, setPeriod] = useState<Period>('7d')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [q, setQ] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [selected, setSelected] = useState<TxItem | null>(null)
  const [editing, setEditing] = useState(false)
  const [editDigits, setEditDigits] = useState('')
  const [editNote, setEditNote] = useState('')
  const [editCategoryId, setEditCategoryId] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [limit, setLimit] = useState(50)

  const { from, to } = useMemo(() => {
    const today = jakartaDateKey(new Date())
    if (period === 'today') return { from: today, to: today }
    if (period === '7d') {
      const d = new Date(Date.now() - 6 * 86400000)
      return { from: jakartaDateKey(d), to: today }
    }
    if (period === '30d') {
      const d = new Date(Date.now() - 29 * 86400000)
      return { from: jakartaDateKey(d), to: today }
    }
    // "Semua": rentang lebar 2 tahun ke belakang
    const d = new Date(Date.now() - 730 * 86400000)
    return { from: jakartaDateKey(d), to: today }
  }, [period])

  const query = buildQuery({ from, to, type: typeFilter === 'all' ? '' : typeFilter, q, limit })

  const { data, isLoading } = useQuery<{ items: TxItem[]; total: number; hasMore: boolean }>({
    queryKey: ['transactions', query],
    queryFn: () => api(`/api/transactions${query}`),
  })

  const { data: categoriesData } = useQuery<{ items: CategoryItem[] }>({
    queryKey: ['categories'],
    queryFn: () => api<{ items: CategoryItem[] }>('/api/categories'),
  })

  const items = data?.items ?? []

  // Kelompokkan per tanggal
  const groups = useMemo(() => {
    const map = new Map<string, TxItem[]>()
    for (const tx of items) {
      const key = jakartaDateKey(tx.createdAt)
      const arr = map.get(key) ?? []
      arr.push(tx)
      map.set(key, arr)
    }
    return [...map.entries()]
  }, [items])

  const editMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: object }) =>
      api<{ item: TxItem }>(`/api/transactions/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
  })
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api(`/api/transactions/${id}`, { method: 'DELETE' }),
  })

  async function refreshAll() {
    await qc.invalidateQueries({ queryKey: ['transactions'] })
    await qc.invalidateQueries({ queryKey: ['dashboard'] })
    await qc.invalidateQueries({ queryKey: ['reports'] })
  }

  function openDetail(tx: TxItem) {
    setSelected(tx)
    setEditing(false)
    setEditDigits(String(tx.amount))
    setEditNote(tx.note ?? '')
    setEditCategoryId(tx.categoryId ?? '')
  }

  async function saveEdit() {
    if (!selected) return
    const amount = Number(editDigits || '0')
    if (amount < 1) {
      toast.error('Nominal minimal Rp1')
      return
    }
    try {
      const body: Record<string, unknown> = { amount, note: editNote.trim() || '' }
      if (selected.type === 'EXPENSE' && editCategoryId) body.categoryId = editCategoryId
      await editMutation.mutateAsync({ id: selected.id, body })
      toast.success('Transaksi diperbarui')
      setSelected(null)
      await refreshAll()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal menyimpan')
    }
  }

  async function doDelete() {
    if (!selected) return
    try {
      await deleteMutation.mutateAsync(selected.id)
      toast.success('Transaksi dihapus')
      setConfirmDelete(false)
      setSelected(null)
      await refreshAll()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal menghapus')
    }
  }

  return (
    <div className="px-4 pb-4 pt-2">
      <header className="flex items-center justify-between gap-2">
        <h1 className="text-[22px] font-extrabold tracking-tight">Riwayat</h1>
        <button
          type="button"
          aria-label="Cari transaksi"
          onClick={() => setShowSearch((s) => !s)}
          className={cn(
            'flex size-10 items-center justify-center rounded-2xl border transition',
            showSearch
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-border bg-card text-ink-soft',
          )}
        >
          <Search className="size-4.5" />
        </button>
      </header>

      <AnimatePresence>
        {showSearch && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari catatan, layanan, kategori..."
              className="mt-3 h-11 w-full rounded-2xl border border-input bg-card px-4 text-sm font-semibold outline-none focus:border-primary"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filter periode */}
      <div className="mt-3 flex gap-2 overflow-x-auto no-scrollbar">
        {(Object.keys(PERIOD_LABEL) as Period[]).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPeriod(p)}
            className={cn(
              'shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold transition',
              period === p
                ? 'bg-foreground text-cream shadow-md'
                : 'border border-border bg-card text-ink-soft',
            )}
          >
            {PERIOD_LABEL[p]}
          </button>
        ))}
      </div>

      <div className="mt-2.5">
        <Segmented
          options={[
            { value: 'all' as TypeFilter, label: 'Semua', icon: <Filter className="size-3.5" /> },
            { value: 'INCOME' as TypeFilter, label: 'Masuk' },
            { value: 'EXPENSE' as TypeFilter, label: 'Keluar' },
          ]}
          value={typeFilter}
          onChange={setTypeFilter}
        />
      </div>

      {/* Daftar */}
      <div className="mt-4 space-y-5">
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-2xl" />
            ))}
          </div>
        ) : groups.length === 0 ? (
          <EmptyState
            title="Tidak ada transaksi"
            description="Coba ubah filter periode atau jenis transaksi."
          />
        ) : (
          groups.map(([dateKey, txs]) => {
            const dayIn = txs.filter((t) => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0)
            const dayOut = txs.filter((t) => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0)
            return (
              <section key={dateKey}>
                <div className="mb-1.5 flex items-center justify-between px-1">
                  <h2 className="text-sm font-extrabold text-foreground">
                    {jakartaDateKey(new Date()) === dateKey
                      ? 'Hari Ini'
                      : formatJakartaDate(parseJakartaDateInput(dateKey) ?? new Date())}
                  </h2>
                  <p className="tnum text-xs font-bold">
                    <span className="text-income">+{formatRupiah(dayIn)}</span>
                    <span className="mx-1 text-border">|</span>
                    <span className="text-expense">−{formatRupiah(dayOut)}</span>
                  </p>
                </div>
                <div className="rounded-3xl border border-border bg-card p-1.5 shadow-sm">
                  <div className="divide-y divide-border/70">
                    {txs.map((tx) => (
                      <TransactionRow key={tx.id} tx={tx} onClick={() => openDetail(tx)} />
                    ))}
                  </div>
                </div>
              </section>
            )
          })
        )}

        {data?.hasMore && (
          <button
            type="button"
            onClick={() => setLimit((l) => l + 50)}
            className="mx-auto flex items-center gap-1 rounded-full border border-border bg-card px-4 py-2 text-sm font-bold text-ink-soft transition hover:text-foreground"
          >
            Muat lebih banyak <ChevronDown className="size-4" />
          </button>
        )}
      </div>

      {/* Detail / edit */}
      <Sheet open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent side="bottom" className="rounded-t-[28px] px-5 pb-8 pt-4">
          {selected && (
            <>
              <SheetHeader className="p-0 pb-2">
                <SheetTitle className="flex items-center gap-2 text-base">
                  Detail Transaksi
                  {!isOwner && (
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold text-ink-soft">
                      hanya owner bisa ubah
                    </span>
                  )}
                </SheetTitle>
              </SheetHeader>

              {editing ? (
                <div className="space-y-4 pt-1">
                  <div className="rounded-2xl border border-border bg-background p-3">
                    <p className="text-xs font-bold text-ink-soft">Nominal</p>
                    <p className="tnum text-right text-2xl font-extrabold text-foreground">
                      {formatRupiah(Number(editDigits || '0'))}
                    </p>
                    <Keypad value={editDigits} onChange={setEditDigits} className="mt-2" quickAdd />
                  </div>
                  {selected.type === 'EXPENSE' && (
                    <div>
                      <p className="mb-1.5 text-xs font-bold text-ink-soft">Kategori</p>
                      <div className="flex flex-wrap gap-2">
                        {(categoriesData?.items ?? []).map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => setEditCategoryId(c.id)}
                            className={cn(
                              'rounded-xl border px-3 py-1.5 text-xs font-bold transition',
                              editCategoryId === c.id
                                ? 'border-expense bg-expense text-white'
                                : 'border-border bg-card text-foreground',
                            )}
                          >
                            {c.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <input
                    value={editNote}
                    onChange={(e) => setEditNote(e.target.value)}
                    placeholder="Catatan (opsional)"
                    className="h-11 w-full rounded-2xl border border-input bg-card px-4 text-sm font-semibold outline-none focus:border-primary"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEditing(false)}
                      className="h-12 flex-1 rounded-2xl border border-border bg-card text-sm font-bold text-foreground"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={saveEdit}
                      disabled={editMutation.isPending}
                      className="h-12 flex-1 rounded-2xl bg-foreground text-sm font-bold text-cream disabled:opacity-60"
                    >
                      Simpan
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-1 pt-1 text-sm">
                  <DetailRow label="Jenis" value={selected.type === 'INCOME' ? 'Pemasukan' : 'Pengeluaran'} />
                  <DetailRow
                    label="Layanan / Kategori"
                    value={selected.serviceName ?? selected.categoryName ?? '—'}
                  />
                  <DetailRow label="Nominal" value={formatRupiah(selected.amount)} bold />
                  <DetailRow label="Waktu" value={formatJakartaTime(selected.createdAt)} />
                  <DetailRow label="Tanggal" value={formatJakartaDate(selected.createdAt)} />
                  <DetailRow label="Dicatat oleh" value={selected.userName} />
                  <DetailRow label="Catatan" value={selected.note ?? '—'} />
                  {isOwner && (
                    <div className="flex gap-2 pt-4">
                      <button
                        type="button"
                        onClick={() => setEditing(true)}
                        className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-foreground text-sm font-bold text-cream"
                      >
                        <Pencil className="size-4" /> Ubah
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(true)}
                        className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl border border-expense/40 bg-expense-soft text-sm font-bold text-expense"
                      >
                        <Trash2 className="size-4" /> Hapus
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus transaksi ini?</AlertDialogTitle>
            <AlertDialogDescription>
              Transaksi {formatRupiah(selected?.amount ?? 0)} akan dihapus permanen dari laporan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={doDelete}
              className="rounded-xl bg-expense text-white hover:bg-expense/90"
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function DetailRow({ label, value, bold = false }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border/60 py-2.5">
      <span className="shrink-0 font-semibold text-ink-soft">{label}</span>
      <span className={cn('text-right', bold ? 'tnum text-base font-extrabold' : 'font-semibold')}>
        {value}
      </span>
    </div>
  )
}
