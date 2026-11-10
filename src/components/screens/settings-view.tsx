'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  BadgeCheck,
  Crown,
  Info,
  LogOut,
  Plus,
  Scissors,
  Tags,
  UserRoundPlus,
} from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api-client'
import { formatRupiah } from '@/lib/format'
import { useSession } from '@/components/app/session-provider'
import { Keypad } from '@/components/shared/keypad'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { CategoryItem, EmployeeItem, ServiceItem } from '@/lib/client-types'

type EmployeeDialogMode =
  | { kind: 'add' }
  | { kind: 'reset'; target: EmployeeItem }
  | null

/** Tab Menu: profil & pengaturan (lengkap untuk owner, ringkas untuk karyawan) */
export function SettingsView() {
  const { user, logout } = useSession()
  const isOwner = user?.role === 'OWNER'
  const [loggingOut, setLoggingOut] = useState(false)

  return (
    <div className="space-y-4 px-4 pb-4 pt-2">
      <header>
        <h1 className="text-[22px] font-extrabold tracking-tight">Menu</h1>
        <p className="text-sm text-ink-soft">
          {isOwner ? 'Kelola ZEN Pangkas Rambut' : 'Profil & akun Anda'}
        </p>
      </header>

      {/* Kartu profil */}
      <section className="flex items-center gap-4 rounded-3xl border border-border bg-card p-5 shadow-sm">
        <span
          className={cn(
            'flex size-14 items-center justify-center rounded-2xl text-lg font-extrabold',
            isOwner ? 'bg-primary/10 text-primary' : 'bg-income-soft text-income',
          )}
        >
          {user?.name
            .split(' ')
            .slice(0, 2)
            .map((w) => w[0]?.toUpperCase() ?? '')
            .join('')}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-extrabold text-foreground">{user?.name}</p>
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold',
              isOwner ? 'bg-primary/10 text-primary' : 'bg-income-soft text-income',
            )}
          >
            {isOwner ? <Crown className="size-3" /> : <BadgeCheck className="size-3" />}
            {isOwner ? 'Owner' : 'Karyawan'}
          </span>
        </div>
      </section>

      {isOwner ? (
        <OwnerSettings />
      ) : (
        <section className="rounded-3xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <Info className="mt-0.5 size-5 shrink-0 text-income" />
            <div>
              <p className="text-sm font-extrabold text-foreground">Tugas Anda</p>
              <p className="mt-1 text-sm leading-relaxed text-ink-soft">
                Catat setiap pemasukan jasa pangkas dan pengeluaran lewat tombol
                <span className="font-bold text-foreground"> Catat Transaksi</span>. Semua catatan
                langsung masuk ke laporan owner.
              </p>
            </div>
          </div>
        </section>
      )}

      <button
        type="button"
        onClick={() => setLoggingOut(true)}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-expense/30 bg-expense-soft text-sm font-extrabold text-expense transition active:scale-[0.98]"
      >
        <LogOut className="size-4.5" /> Keluar (Logout)
      </button>

      <p className="pt-2 text-center text-[11px] font-semibold text-ink-soft">
        ZEN Pangkas Rambut · v1.0 · dibuat untuk memudahkan usaha
      </p>

      <AlertDialog open={loggingOut} onOpenChange={setLoggingOut}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Keluar dari aplikasi?</AlertDialogTitle>
            <AlertDialogDescription>
              Anda perlu memasukkan PIN lagi untuk mencatat transaksi berikutnya.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void logout()}
              className="rounded-xl bg-expense text-white hover:bg-expense/90"
            >
              Keluar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function OwnerSettings() {
  const qc = useQueryClient()

  // ===== Karyawan =====
  const { data: employeesData, isLoading: loadingEmployees } = useQuery<{ items: EmployeeItem[] }>({
    queryKey: ['employees'],
    queryFn: () => api<{ items: EmployeeItem[] }>('/api/employees'),
  })
  const [employeeDialog, setEmployeeDialog] = useState<EmployeeDialogMode>(null)
  const [empName, setEmpName] = useState('')
  const [empPin, setEmpPin] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<EmployeeItem | null>(null)

  const saveEmployee = useMutation({
    mutationFn: (payload: object) => {
      if (employeeDialog?.kind === 'add')
        return api('/api/employees', { method: 'POST', body: JSON.stringify(payload) })
      if (employeeDialog?.kind === 'reset')
        return api(`/api/employees/${employeeDialog.target.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        })
      throw new Error('Tidak ada dialog aktif')
    },
  })

  const toggleEmployee = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      api(`/api/employees/${id}`, { method: 'PATCH', body: JSON.stringify({ active }) }),
  })

  const deleteEmployee = useMutation({
    mutationFn: (id: string) => api(`/api/employees/${id}`, { method: 'DELETE' }),
  })

  function openAddEmployee() {
    setEmpName('')
    setEmpPin('')
    setEmployeeDialog({ kind: 'add' })
  }

  function openResetPin(target: EmployeeItem) {
    setEmpPin('')
    setEmployeeDialog({ kind: 'reset', target })
  }

  async function submitEmployee() {
    if (empName.trim().length < 2) {
      toast.error('Nama minimal 2 karakter')
      return
    }
    if (!/^\d{4,6}$/.test(empPin)) {
      toast.error('PIN harus 4-6 digit angka')
      return
    }
    try {
      const name = employeeDialog?.kind === 'reset' ? employeeDialog.target.name : empName.trim()
      await saveEmployee.mutateAsync(
        employeeDialog?.kind === 'reset' ? { pin: empPin } : { name: name, pin: empPin },
      )
      toast.success(
        employeeDialog?.kind === 'reset'
          ? `PIN ${name} direset. Beritahu PIN baru kepada yang bersangkutan.`
          : `${name} ditambahkan. PIN: ${empPin} — beritahu kepada yang bersangkutan`,
      )
      setEmployeeDialog(null)
      await qc.invalidateQueries({ queryKey: ['employees'] })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal menyimpan')
    }
  }

  // ===== Layanan =====
  const { data: servicesAll, isLoading: loadingServices } = useQuery<{ items: ServiceItem[] }>({
    queryKey: ['services', 'all'],
    queryFn: () => api<{ items: ServiceItem[] }>('/api/services?all=1'),
  })
  const [serviceDialog, setServiceDialog] = useState<{
    target: ServiceItem | null // null = tambah baru
    name: string
    price: string
  } | null>(null)

  const saveService = useMutation({
    mutationFn: (payload: object) => {
      if (serviceDialog?.target)
        return api(`/api/services/${serviceDialog.target.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        })
      return api('/api/services', { method: 'POST', body: JSON.stringify(payload) })
    },
  })

  const toggleService = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      api(`/api/services/${id}`, { method: 'PATCH', body: JSON.stringify({ active }) }),
  })

  function openServiceDialog(target: ServiceItem | null) {
    setServiceDialog({
      target,
      name: target?.name ?? '',
      price: target ? String(target.price) : '',
    })
  }

  async function submitService() {
    if (!serviceDialog) return
    const name = serviceDialog.name.trim()
    const price = Number(serviceDialog.price || '0')
    if (name.length < 2) {
      toast.error('Nama layanan minimal 2 karakter')
      return
    }
    if (!Number.isFinite(price) || price < 1) {
      toast.error('Harga harus angka (minimal Rp1)')
      return
    }
    try {
      await saveService.mutateAsync({ name, price })
      toast.success('Layanan tersimpan')
      setServiceDialog(null)
      await qc.invalidateQueries({ queryKey: ['services'] })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal menyimpan')
    }
  }

  // ===== Kategori =====
  const { data: categoriesAll, isLoading: loadingCategories } = useQuery<{ items: CategoryItem[] }>({
    queryKey: ['categories', 'all'],
    queryFn: () => api<{ items: CategoryItem[] }>('/api/categories?all=1'),
  })
  const [categoryDialog, setCategoryDialog] = useState<{
    target: CategoryItem | null
    name: string
  } | null>(null)

  const saveCategory = useMutation({
    mutationFn: (payload: object) => {
      if (categoryDialog?.target)
        return api(`/api/categories/${categoryDialog.target.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        })
      return api('/api/categories', { method: 'POST', body: JSON.stringify(payload) })
    },
  })

  const toggleCategory = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      api(`/api/categories/${id}`, { method: 'PATCH', body: JSON.stringify({ active }) }),
  })

  async function submitCategory() {
    if (!categoryDialog) return
    const name = categoryDialog.name.trim()
    if (name.length < 2) {
      toast.error('Nama kategori minimal 2 karakter')
      return
    }
    try {
      await saveCategory.mutateAsync({ name })
      toast.success('Kategori tersimpan')
      setCategoryDialog(null)
      await qc.invalidateQueries({ queryKey: ['categories'] })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal menyimpan')
    }
  }

  return (
    <div className="space-y-4">
      {/* Karyawan */}
      <section className="rounded-3xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-extrabold">
            <UserRoundPlus className="size-4 text-income" /> Karyawan
          </h2>
          <button
            type="button"
            onClick={openAddEmployee}
            className="flex items-center gap-1 rounded-full bg-income px-3 py-1.5 text-xs font-extrabold text-white shadow-sm transition active:scale-95"
          >
            <Plus className="size-3.5" /> Tambah
          </button>
        </div>
        <div className="mt-3 space-y-2">
          {loadingEmployees ? (
            <Skeleton className="h-14 rounded-2xl" />
          ) : (
            (employeesData?.items ?? []).map((emp) => (
              <div
                key={emp.id}
                className={cn(
                  'flex items-center gap-3 rounded-2xl border border-border px-3 py-2.5',
                  !emp.active && 'opacity-50',
                )}
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-income-soft text-xs font-extrabold text-income">
                  {emp.name
                    .split(' ')
                    .slice(0, 2)
                    .map((w) => w[0]?.toUpperCase() ?? '')
                    .join('')}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-foreground">{emp.name}</p>
                  <p className="text-[11px] font-semibold text-ink-soft">
                    {emp.role === 'OWNER' ? 'Owner' : 'Karyawan'} · {emp.transactionCount} transaksi
                    {!emp.active && ' · nonaktif'}
                  </p>
                </div>
                {emp.role === 'KASIR' && (
                  <>
                    <button
                      type="button"
                      onClick={() => openResetPin(emp)}
                      className="rounded-xl border border-border px-2.5 py-1.5 text-[11px] font-bold text-ink-soft transition hover:text-foreground"
                    >
                      Reset PIN
                    </button>
                    <Switch
                      checked={emp.active}
                      onCheckedChange={(active) => {
                        toggleEmployee.mutate(
                          { id: emp.id, active },
                          {
                            onSuccess: () => {
                              toast.success(active ? 'Karyawan diaktifkan' : 'Karyawan dinonaktifkan')
                              void qc.invalidateQueries({ queryKey: ['employees'] })
                            },
                            onError: (e) => toast.error(e.message),
                          },
                        )
                      }}
                      aria-label={`Aktifkan ${emp.name}`}
                    />
                    <button
                      type="button"
                      aria-label="Hapus karyawan"
                      onClick={() => setDeleteTarget(emp)}
                      className="text-expense/70 transition hover:text-expense"
                    >
                      <TrashIcon />
                    </button>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </section>

      {/* Layanan & harga */}
      <section className="rounded-3xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-extrabold">
            <Scissors className="size-4 text-primary" /> Layanan & Harga
          </h2>
          <button
            type="button"
            onClick={() => openServiceDialog(null)}
            className="flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-extrabold text-primary-foreground shadow-sm transition active:scale-95"
          >
            <Plus className="size-3.5" /> Tambah
          </button>
        </div>
        <div className="mt-3 space-y-2">
          {loadingServices ? (
            <Skeleton className="h-14 rounded-2xl" />
          ) : (
            (servicesAll?.items ?? []).map((svc) => (
              <div
                key={svc.id}
                className={cn(
                  'flex items-center gap-3 rounded-2xl border border-border px-3 py-2.5',
                  !svc.active && 'opacity-50',
                )}
              >
                <button
                  type="button"
                  onClick={() => openServiceDialog(svc)}
                  className="min-w-0 flex-1 text-left"
                >
                  <p className="truncate text-sm font-bold text-foreground">{svc.name}</p>
                  <p className="tnum text-xs font-bold text-income">{formatRupiah(svc.price)}</p>
                </button>
                <Switch
                  checked={svc.active}
                  onCheckedChange={(active) => {
                    toggleService.mutate(
                      { id: svc.id, active },
                      {
                        onSuccess: () => {
                          void qc.invalidateQueries({ queryKey: ['services'] })
                        },
                        onError: (e) => toast.error(e.message),
                      },
                    )
                  }}
                  aria-label={`Aktifkan ${svc.name}`}
                />
              </div>
            ))
          )}
        </div>
      </section>

      {/* Kategori pengeluaran */}
      <section className="rounded-3xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-extrabold">
            <Tags className="size-4 text-expense" /> Kategori Pengeluaran
          </h2>
          <button
            type="button"
            onClick={() => setCategoryDialog({ target: null, name: '' })}
            className="flex items-center gap-1 rounded-full bg-expense px-3 py-1.5 text-xs font-extrabold text-white shadow-sm transition active:scale-95"
          >
            <Plus className="size-3.5" /> Tambah
          </button>
        </div>
        <div className="mt-3 space-y-2">
          {loadingCategories ? (
            <Skeleton className="h-14 rounded-2xl" />
          ) : (
            (categoriesAll?.items ?? []).map((cat) => (
              <div
                key={cat.id}
                className={cn(
                  'flex items-center gap-3 rounded-2xl border border-border px-3 py-2.5',
                  !cat.active && 'opacity-50',
                )}
              >
                <button
                  type="button"
                  onClick={() => setCategoryDialog({ target: cat, name: cat.name })}
                  className="min-w-0 flex-1 text-left"
                >
                  <p className="truncate text-sm font-bold text-foreground">{cat.name}</p>
                </button>
                <Switch
                  checked={cat.active}
                  onCheckedChange={(active) => {
                    toggleCategory.mutate(
                      { id: cat.id, active },
                      {
                        onSuccess: () => {
                          void qc.invalidateQueries({ queryKey: ['categories'] })
                        },
                        onError: (e) => toast.error(e.message),
                      },
                    )
                  }}
                  aria-label={`Aktifkan ${cat.name}`}
                />
              </div>
            ))
          )}
        </div>
      </section>

      {/* Dialog karyawan */}
      <Dialog open={employeeDialog !== null} onOpenChange={(open) => !open && setEmployeeDialog(null)}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto rounded-3xl">
          {employeeDialog?.kind === 'add' ? (
            <>
              <DialogHeader>
                <DialogTitle>Tambah Karyawan</DialogTitle>
                <DialogDescription>
                  Karyawan dapat langsung mencatat pemasukan & pengeluaran dengan PIN sendiri.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="emp-name">Nama</Label>
                  <Input
                    id="emp-name"
                    value={empName}
                    onChange={(e) => setEmpName(e.target.value)}
                    placeholder="cth: Bagas"
                    className="mt-1 h-11 rounded-2xl"
                    maxLength={40}
                  />
                </div>
                <div>
                  <Label>PIN (4-6 digit)</Label>
                  <div className="mt-2 rounded-2xl border border-border p-3">
                    <Keypad value={empPin} onChange={setEmpPin} maxLength={6} />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={submitEmployee}
                  disabled={saveEmployee.isPending}
                  className="h-12 flex-1 rounded-2xl bg-income text-white hover:bg-income/90"
                >
                  {saveEmployee.isPending ? 'Menyimpan...' : 'Simpan Karyawan'}
                </Button>
              </DialogFooter>
            </>
          ) : employeeDialog?.kind === 'reset' ? (
            <>
              <DialogHeader>
                <DialogTitle>Reset PIN {employeeDialog.target.name}</DialogTitle>
                <DialogDescription>
                  Buat PIN baru, lalu beritahu langsung kepada yang bersangkutan.
                </DialogDescription>
              </DialogHeader>
              <div className="rounded-2xl border border-border p-3">
                <Keypad value={empPin} onChange={setEmpPin} maxLength={6} />
              </div>
              <DialogFooter>
                <Button
                  onClick={submitEmployee}
                  disabled={saveEmployee.isPending}
                  className="h-12 flex-1 rounded-2xl bg-foreground text-cream hover:bg-foreground/90"
                >
                  {saveEmployee.isPending ? 'Menyimpan...' : 'Simpan PIN Baru'}
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Dialog layanan */}
      <Dialog open={serviceDialog !== null} onOpenChange={(open) => !open && setServiceDialog(null)}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle>{serviceDialog?.target ? 'Ubah Layanan' : 'Tambah Layanan'}</DialogTitle>
            <DialogDescription>
              Layanan aktif langsung muncul di halaman catat pemasukan.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="svc-name">Nama layanan</Label>
              <Input
                id="svc-name"
                value={serviceDialog?.name ?? ''}
                onChange={(e) =>
                  setServiceDialog((s) => (s ? { ...s, name: e.target.value } : s))
                }
                placeholder="cth: Cukur Jenggot"
                className="mt-1 h-11 rounded-2xl"
                maxLength={50}
              />
            </div>
            <div>
              <Label htmlFor="svc-price">Harga (Rp)</Label>
              <Input
                id="svc-price"
                inputMode="numeric"
                value={serviceDialog?.price ?? ''}
                onChange={(e) =>
                  setServiceDialog((s) =>
                    s ? { ...s, price: e.target.value.replace(/[^\d]/g, '') } : s,
                  )
                }
                placeholder="15000"
                className="tnum mt-1 h-11 rounded-2xl text-right"
              />
              {serviceDialog && Number(serviceDialog.price) >= 1 && (
                <p className="tnum mt-1 text-right text-xs font-bold text-income">
                  {formatRupiah(Number(serviceDialog.price))}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={submitService}
              disabled={saveService.isPending}
              className="h-12 flex-1 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {saveService.isPending ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog kategori */}
      <Dialog open={categoryDialog !== null} onOpenChange={(open) => !open && setCategoryDialog(null)}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle>{categoryDialog?.target ? 'Ubah Kategori' : 'Tambah Kategori'}</DialogTitle>
            <DialogDescription>Contoh: Belanja, Listrik, Gaji, Sampah, dll.</DialogDescription>
          </DialogHeader>
          <div>
            <Label htmlFor="cat-name">Nama kategori</Label>
            <Input
              id="cat-name"
              value={categoryDialog?.name ?? ''}
              onChange={(e) => setCategoryDialog((s) => (s ? { ...s, name: e.target.value } : s))}
              placeholder="cth: Tagihan Sampah"
              className="mt-1 h-11 rounded-2xl"
              maxLength={50}
            />
          </div>
          <DialogFooter>
            <Button
              onClick={submitCategory}
              disabled={saveCategory.isPending}
              className="h-12 flex-1 rounded-2xl bg-expense text-white hover:bg-expense/90"
            >
              {saveCategory.isPending ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Konfirmasi hapus karyawan */}
      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus {deleteTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Jika karyawan ini sudah punya transaksi, akunnya hanya akan dinonaktifkan agar data
              laporan tetap utuh.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!deleteTarget) return
                try {
                  const res = await deleteEmployee.mutateAsync(deleteTarget.id)
                  toast.success(res?.deactivated ? 'Karyawan dinonaktifkan' : 'Karyawan dihapus')
                  await qc.invalidateQueries({ queryKey: ['employees'] })
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : 'Gagal menghapus')
                } finally {
                  setDeleteTarget(null)
                }
              }}
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

function TrashIcon() {
  return (
    <svg
      className="size-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    </svg>
  )
}
