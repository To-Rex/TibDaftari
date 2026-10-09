/**
 * Cheque list view state: the basic filters (search, status, payment, period), the extra ones (payment method,
 * amount, debt, discount, department, service, cashier) and the sort. Kept per browser tab (sessionStorage) so
 * coming back from a cheque keeps the list as it was.
 */
import type { Category, Id, OrderListFilters, OrderStatus, PaymentMethod, PaymentStatus } from '@/domain'
import { presetRange, type DatePreset, type DateRange } from '@/shared/lib/dates'

/** 'custom' = any day to any day (either end may be left empty: "from that day on" / "up to that day";
 * both empty = every cheque). The list opens on today. */
export type OrdersRange = DatePreset | 'custom'

export interface ExtraFilters {
  methods: PaymentMethod[]
  minTotal?: number
  maxTotal?: number
  debt?: boolean
  discount?: boolean
  /** a department — the cheque has a service of it or of one of its sub-departments */
  categoryId?: Id
  serviceTypeId?: Id
  createdBy?: Id
  results?: 'ready' | 'partial' | 'none'
  minItems?: number
  maxItems?: number
  refunded?: boolean
}

export interface OrdersView {
  search: string
  status: 'all' | OrderStatus
  payment: 'all' | PaymentStatus
  range: OrdersRange
  custom: DateRange
  extra: ExtraFilters
  sortBy: string
  sortDir: 'asc' | 'desc'
  pageSize: number
}

export const EMPTY_EXTRA: ExtraFilters = { methods: [] }

export const defaultView = (): OrdersView => ({
  search: '', status: 'all', payment: 'all', range: 'today', custom: presetRange('last7'), extra: EMPTY_EXTRA, sortBy: 'createdAt', sortDir: 'desc', pageSize: 20,
})

/** How many extra filters are set (the badge on the "Filtrlar" button). */
export const activeExtraCount = (f: ExtraFilters): number =>
  [f.methods.length > 0, f.minTotal != null || f.maxTotal != null, f.debt != null, f.discount != null, !!f.categoryId, !!f.serviceTypeId, !!f.createdBy,
    !!f.results, f.minItems != null || f.maxItems != null, f.refunded != null].filter(Boolean).length

/** A department id → it and every sub-department below it. */
export function categoryWithChildren(categories: Category[] | undefined, id: Id): Id[] {
  const out = [id]
  for (let i = 0; i < out.length; i++) for (const c of categories ?? []) if (c.parentId === out[i] && !out.includes(c.id)) out.push(c.id)
  return out
}

/** Extra filters → API query (a reversed amount range is read the other way round). */
export function extraToQuery(f: ExtraFilters, categories: Category[] | undefined): OrderListFilters {
  const [lo, hi] = f.minTotal != null && f.maxTotal != null && f.minTotal > f.maxTotal ? [f.maxTotal, f.minTotal] : [f.minTotal, f.maxTotal]
  return {
    methods: f.methods.length ? f.methods : undefined,
    minTotal: lo,
    maxTotal: hi,
    debt: f.debt,
    discount: f.discount,
    categoryIds: f.categoryId ? categoryWithChildren(categories, f.categoryId) : undefined,
    serviceTypeId: f.serviceTypeId,
    createdBy: f.createdBy,
    results: f.results,
    ...(f.minItems != null && f.maxItems != null && f.minItems > f.maxItems ? { minItems: f.maxItems, maxItems: f.minItems } : { minItems: f.minItems, maxItems: f.maxItems }),
    refunded: f.refunded,
  }
}

/** Sort choices (the table headers sort the same fields). */
export const SORTS: { sortBy: string; sortDir: 'asc' | 'desc' }[] = [
  { sortBy: 'createdAt', sortDir: 'desc' }, { sortBy: 'createdAt', sortDir: 'asc' },
  { sortBy: 'updatedAt', sortDir: 'desc' }, { sortBy: 'completedAt', sortDir: 'desc' },
  { sortBy: 'total', sortDir: 'desc' }, { sortBy: 'total', sortDir: 'asc' },
  { sortBy: 'remaining', sortDir: 'desc' }, { sortBy: 'remaining', sortDir: 'asc' },
  { sortBy: 'paidAmount', sortDir: 'desc' }, { sortBy: 'paidAmount', sortDir: 'asc' },
  { sortBy: 'discountAmount', sortDir: 'desc' }, { sortBy: 'discountPercent', sortDir: 'desc' },
  { sortBy: 'itemCount', sortDir: 'desc' }, { sortBy: 'itemCount', sortDir: 'asc' },
  { sortBy: 'patientName', sortDir: 'asc' }, { sortBy: 'patientName', sortDir: 'desc' },
  { sortBy: 'number', sortDir: 'desc' }, { sortBy: 'number', sortDir: 'asc' },
]

const KEY = 'clinic.orders.view'

export function loadView(): OrdersView {
  const base = defaultView()
  try {
    const raw = sessionStorage.getItem(KEY)
    if (!raw) return base
    const v = JSON.parse(raw) as Partial<OrdersView>
    // the list has no "all" period any more — an old saved one opens on today
    const range = v.range && v.range !== ('all' as string) ? v.range : base.range
    return { ...base, ...v, range, custom: { ...base.custom, ...(v.custom ?? {}) }, extra: { ...EMPTY_EXTRA, ...(v.extra ?? {}), methods: Array.isArray(v.extra?.methods) ? v.extra.methods : [] } }
  } catch {
    return base
  }
}

export function saveView(v: OrdersView): void {
  try { sessionStorage.setItem(KEY, JSON.stringify(v)) } catch { /* private mode / quota — the list still works */ }
}
