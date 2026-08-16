/** Shared primitives used across every domain module. */

export type Id = string
export type IsoDateTime = string // e.g. 2026-08-16T09:30:00.000Z
export type IsoDate = string // e.g. 2026-08-16
export type Money = number // integer UZS (tiyin-free); formatted in UI

export type Locale = 'uz' | 'ru' | 'en'

/** Server-style paged response — the future FastAPI contract. */
export interface Page<T> {
  items: T[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export interface PageQuery {
  page?: number
  pageSize?: number
  search?: string
  sortBy?: string
  sortDir?: 'asc' | 'desc'
}

export interface AuditStamp {
  createdAt: IsoDateTime
  updatedAt: IsoDateTime
  createdBy?: Id
}

/** Every tenant-owned entity carries these. */
export interface TenantScoped {
  companyId: Id
  branchId?: Id
}

export const emptyPage = <T>(pageSize = 20): Page<T> => ({
  items: [],
  page: 1,
  pageSize,
  total: 0,
  totalPages: 0,
})
