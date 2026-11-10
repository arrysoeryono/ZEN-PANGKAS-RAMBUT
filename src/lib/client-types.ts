/** Tipe data yang dipakai bersama frontend & API */

export type Role = 'OWNER' | 'KASIR'
export type TxType = 'INCOME' | 'EXPENSE'

export interface SessionUser {
  id: string
  name: string
  role: Role
}

export interface ServiceItem {
  id: string
  name: string
  price: number
  active: boolean
  sortOrder: number
}

export interface CategoryItem {
  id: string
  name: string
  active: boolean
  sortOrder: number
}

export interface TxItem {
  id: string
  type: TxType
  amount: number
  note: string | null
  serviceId: string | null
  serviceName: string | null
  categoryId: string | null
  categoryName: string | null
  userId: string
  userName: string
  createdAt: string
}

export interface Totals {
  income: number
  expense: number
  net: number
  count: number
}

export interface SeriesPoint {
  date: string
  label: string
  income: number
  expense: number
}

export interface DashboardData {
  today: Totals
  yesterday: Totals
  month: Totals & { dayOfMonth: number }
  series: SeriesPoint[]
  insights: {
    avgIncomePerDay: number
    bestDay: { date: string; income: number } | null
    topService: { name: string; count: number } | null
  }
  recent: TxItem[]
}

export interface ReportData {
  from: string
  to: string
  days: number
  summary: {
    income: number
    expense: number
    net: number
    count: number
    incomeCount: number
    expenseCount: number
    avgPerDay: number
  }
  byService: { name: string; count: number; total: number }[]
  byCategory: { name: string; count: number; total: number }[]
  byEmployee: {
    userId: string
    name: string
    role: Role
    incomeCount: number
    incomeTotal: number
    expenseCount: number
    expenseTotal: number
  }[]
  byDay: { date: string; income: number; expense: number; net: number }[]
}

export interface EmployeeItem {
  id: string
  name: string
  role: Role
  active: boolean
  createdAt: string
  transactionCount: number
}
