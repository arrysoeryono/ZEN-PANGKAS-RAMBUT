import { db } from '@/lib/db'
import { ok, bad, requireAuth, isAuthFailure } from '@/lib/api-utils'
import { jakartaDayStart, jakartaDayEnd, parseJakartaDateInput } from '@/lib/time'

const MAX_AMOUNT = 100_000_000

interface CreateItem {
  type: 'INCOME' | 'EXPENSE'
  amount: number
  note?: string
  serviceId?: string
  qty?: number
  categoryId?: string
}

/** Daftar transaksi dengan filter tanggal/jenis/user/pencarian */
export async function GET(req: Request) {
  const auth = await requireAuth()
  if (isAuthFailure(auth)) return auth
  const url = new URL(req.url)

  const fromRaw = url.searchParams.get('from')
  const toRaw = url.searchParams.get('to')
  const type = url.searchParams.get('type')
  const userId = url.searchParams.get('userId')
  const q = url.searchParams.get('q')?.trim()
  const offset = Math.max(0, Number(url.searchParams.get('offset') ?? 0))
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') ?? 50)))

  const where: Record<string, object> = {}

  if (fromRaw && toRaw) {
    const from = parseJakartaDateInput(fromRaw)
    const to = parseJakartaDateInput(toRaw)
    if (from && to) where.createdAt = { gte: jakartaDayStart(from), lt: jakartaDayEnd(to) }
  }
  if (type === 'INCOME' || type === 'EXPENSE') where.type = type
  if (userId) where.userId = userId
  if (q) {
    where.OR = [
      { note: { contains: q, mode: 'insensitive' } },
      { serviceName: { contains: q, mode: 'insensitive' } },
      { categoryName: { contains: q, mode: 'insensitive' } },
    ]
  }

  const [rows, total] = await Promise.all([
    db.transaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
      include: { user: { select: { name: true } } },
    }),
    db.transaction.count({ where }),
  ])

  return ok({
    items: rows.map((t) => ({
      id: t.id,
      type: t.type,
      amount: t.amount,
      note: t.note,
      serviceId: t.serviceId,
      serviceName: t.serviceName,
      categoryId: t.categoryId,
      categoryName: t.categoryName,
      userId: t.userId,
      userName: t.user.name,
      createdAt: t.createdAt,
    })),
    total,
    hasMore: offset + rows.length < total,
  })
}

/** Catat transaksi baru (tunggal atau batch) */
export async function POST(req: Request) {
  const auth = await requireAuth()
  if (isAuthFailure(auth)) return auth
  const session = auth

  let body: { items?: unknown; type?: unknown; amount?: unknown; note?: unknown; serviceId?: unknown; qty?: unknown; categoryId?: unknown }
  try {
    body = await req.json()
  } catch {
    return bad('Format permintaan tidak valid')
  }

  // Normalisasi: single object atau { items: [...] }
  let items: CreateItem[] = []
  if (Array.isArray(body.items)) {
    items = body.items as CreateItem[]
  } else if (typeof body.type === 'string') {
    items = [
      {
        type: body.type as 'INCOME' | 'EXPENSE',
        amount: Number(body.amount ?? 0),
        note: typeof body.note === 'string' ? body.note : undefined,
        serviceId: typeof body.serviceId === 'string' ? body.serviceId : undefined,
        qty: body.qty ? Number(body.qty) : 1,
        categoryId: typeof body.categoryId === 'string' ? body.categoryId : undefined,
      },
    ]
  } else {
    return bad('Data transaksi tidak valid')
  }

  if (items.length === 0) return bad('Tidak ada transaksi untuk disimpan')
  if (items.length > 50) return bad('Maksimal 50 transaksi per pengiriman')

  const toCreate: {
    type: 'INCOME' | 'EXPENSE'
    amount: number
    note: string | null
    serviceId: string | null
    serviceName: string | null
    categoryId: string | null
    categoryName: string | null
    userId: string
  }[] = []

  for (const item of items) {
    if (item.type !== 'INCOME' && item.type !== 'EXPENSE') {
      return bad('Jenis transaksi tidak valid')
    }
    const qty = Math.min(50, Math.max(1, Math.floor(Number(item.qty ?? 1))))

    if (item.type === 'INCOME' && item.serviceId) {
      const service = await db.service.findUnique({ where: { id: item.serviceId } })
      if (!service || !service.active) return bad('Layanan tidak ditemukan')
      const amount = service.price * qty
      if (amount > MAX_AMOUNT) return bad('Nominal terlalu besar')
      toCreate.push({
        type: 'INCOME',
        amount,
        note: item.note?.trim() || null,
        serviceId: service.id,
        serviceName: service.name,
        categoryId: null,
        categoryName: null,
        userId: session.id,
      })
      continue
    }

    const amount = Math.floor(Number(item.amount ?? 0))
    if (!Number.isFinite(amount) || amount < 1) return bad('Nominal minimal Rp1')
    if (amount > MAX_AMOUNT) return bad('Nominal terlalu besar (maks 100 juta)')

    if (item.type === 'INCOME') {
      // Pemasukan bebas (tanpa layanan baku)
      toCreate.push({
        type: 'INCOME',
        amount,
        note: item.note?.trim() || null,
        serviceId: null,
        serviceName: item.note?.trim() || 'Pendapatan Lain',
        categoryId: null,
        categoryName: null,
        userId: session.id,
      })
      continue
    }

    // EXPENSE wajib kategori
    if (!item.categoryId) return bad('Pilih kategori pengeluaran')
    const category = await db.category.findUnique({ where: { id: item.categoryId } })
    if (!category) return bad('Kategori tidak ditemukan')
    toCreate.push({
      type: 'EXPENSE',
      amount,
      note: item.note?.trim() || null,
      serviceId: null,
      serviceName: null,
      categoryId: category.id,
      categoryName: category.name,
      userId: session.id,
    })
  }

  const created = await db.transaction.createMany({ data: toCreate })
  const latest = await db.transaction.findMany({
    where: { userId: session.id },
    orderBy: { createdAt: 'desc' },
    take: created.count,
  })

  return ok({ created: created.count, items: latest }, { status: 201 })
}
