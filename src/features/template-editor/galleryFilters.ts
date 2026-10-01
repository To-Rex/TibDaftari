/**
 * Template gallery filtering, sorting and service coverage — pure functions over the already-loaded lists
 * (templates, services, categories), shared by the result-document and cheque galleries.
 */
import type { Category, Id, PaperSize, ResultTemplate, ServiceType } from '@/domain'
import { descendantIds } from '@/features/catalog/tree'
import type { TemplateKind } from './kind'

export type GallerySort = 'updated' | 'created' | 'name' | 'usage'
export type SortDir = 'asc' | 'desc'
export type GalleryView = 'grid' | 'list'

export interface GalleryFilters {
  /** result documents only */
  scope: 'all' | 'item' | 'order'
  /** result documents only: bound to services/categories, or generic (bound to nothing) */
  binding: 'all' | 'bound' | 'generic'
  /** result documents only: bound to the category (or a sub-category), directly or through one of its services */
  categoryId: Id | ''
  /** result documents only: the templates a service can print with — bound to it, to its category, or generic */
  serviceTypeId: Id | ''
  language: 'all' | ResultTemplate['language']
  paper: 'all' | PaperSize
  /** only while the top bar shows every branch: a branch, or 'none' = bound to no branch */
  branch: 'all' | 'none' | Id
}

export const EMPTY_FILTERS: GalleryFilters = { scope: 'all', binding: 'all', categoryId: '', serviceTypeId: '', language: 'all', paper: 'all', branch: 'all' }

export const RESULT_PAPERS: PaperSize[] = ['A4', 'A5', 'Letter']
export const RECEIPT_PAPERS: PaperSize[] = ['Receipt80', 'Receipt58']

/**
 * Collation for names in the interface language. Browsers without Uzbek collation data silently use the
 * system locale (a Russian Windows sorts Cyrillic first) — such languages fall back to the Latin-first default.
 */
export function collationLocale(lang: string | undefined): string {
  const base = (lang ?? 'en').split('-')[0]!
  try { return Intl.Collator.supportedLocalesOf([base]).length ? base : 'en' } catch { return 'en' }
}

/** Default direction of each sort: names A→Z, everything else newest / most used first. */
export const defaultSortDir = (s: GallerySort): SortDir => (s === 'name' ? 'asc' : 'desc')

/**
 * The filters that actually apply on this page: service/category/scope/binding filters mean nothing for
 * cheques, and the branch filter only exists while the top bar shows every branch.
 */
export function effectiveFilters(f: GalleryFilters, kind: TemplateKind, topBarBranchId: Id | null): GalleryFilters {
  const out = { ...f }
  if (kind === 'receipt') Object.assign(out, { scope: 'all', binding: 'all', categoryId: '', serviceTypeId: '' })
  if (topBarBranchId) out.branch = 'all'
  const papers = kind === 'receipt' ? RECEIPT_PAPERS : RESULT_PAPERS
  if (out.paper !== 'all' && !papers.includes(out.paper)) out.paper = 'all'
  return out
}

export const activeFilterCount = (f: GalleryFilters): number => (Object.keys(EMPTY_FILTERS) as (keyof GalleryFilters)[]).filter((k) => f[k] !== EMPTY_FILTERS[k]).length

/** Bound to no service and no category: offered for every service. */
export const isGeneric = (t: Pick<ResultTemplate, 'serviceTypeIds' | 'categoryIds'>): boolean => !t.serviceTypeIds.length && !t.categoryIds.length

/** A template is bound to the service itself or to the service's category. */
export const boundToService = (t: Pick<ResultTemplate, 'serviceTypeIds' | 'categoryIds'>, s: Pick<ServiceType, 'id' | 'categoryId'>): boolean =>
  t.serviceTypeIds.includes(s.id) || t.categoryIds.includes(s.categoryId)

export function filterTemplates(list: ResultTemplate[], f: GalleryFilters, ctx: { services: ServiceType[]; categories: Category[] }): ResultTemplate[] {
  const service = f.serviceTypeId ? ctx.services.find((s) => s.id === f.serviceTypeId) : undefined
  const catIds = f.categoryId ? descendantIds(ctx.categories, f.categoryId) : null
  const serviceCat = catIds ? new Map(ctx.services.map((s) => [s.id, s.categoryId])) : null
  return list.filter((t) => {
    if (f.scope !== 'all' && t.scope !== f.scope) return false
    if (f.binding === 'bound' && isGeneric(t)) return false
    if (f.binding === 'generic' && !isGeneric(t)) return false
    if (f.language !== 'all' && t.language !== f.language) return false
    if (f.paper !== 'all' && t.doc.paper !== f.paper) return false
    if (f.branch === 'none' && t.branchIds.length) return false
    if (f.branch !== 'all' && f.branch !== 'none' && !t.branchIds.includes(f.branch)) return false
    if (catIds && serviceCat && !t.categoryIds.some((c) => catIds.has(c)) && !t.serviceTypeIds.some((s) => catIds.has(serviceCat.get(s) ?? ''))) return false
    if (f.serviceTypeId && !(service ? boundToService(t, service) || isGeneric(t) : t.serviceTypeIds.includes(f.serviceTypeId))) return false
    return true
  })
}

/** Names collate in the interface language (`locale`): Latin first in uz/en, Cyrillic first in ru. */
export function sortTemplates(list: ResultTemplate[], sort: GallerySort, dir: SortDir, locale?: string): ResultTemplate[] {
  const sign = dir === 'asc' ? 1 : -1
  const byName = (a: ResultTemplate, b: ResultTemplate) => a.name.localeCompare(b.name, locale, { sensitivity: 'base', numeric: true })
  const cmp: Record<GallerySort, (a: ResultTemplate, b: ResultTemplate) => number> = {
    name: byName,
    usage: (a, b) => a.usage - b.usage || -byName(a, b),
    updated: (a, b) => a.updatedAt.localeCompare(b.updatedAt),
    created: (a, b) => a.createdAt.localeCompare(b.createdAt),
  }
  return [...list].sort((a, b) => sign * cmp[sort](a, b))
}

export interface Coverage {
  /** active services with a result schema — the ones whose approval issues a document */
  needing: ServiceType[]
  /** an active template is bound to the service or its category */
  direct: number
  /** no own template: approval falls back to an active template without service bindings */
  fallback: ServiceType[]
  /** no template at all: approval cannot issue a document */
  missing: ServiceType[]
}

/**
 * Which services of the branch print a result document, mirroring the API's resolution on approval: an active
 * template bound to the service or its category, else an active template without service bindings
 * (`find_generic_template`), else none. A template counts in the branch when bound to it or to no branch.
 */
export function templateCoverage(templates: ResultTemplate[], services: ServiceType[], branchId: Id | null, locale?: string): Coverage {
  const active = templates.filter((t) => t.status === 'active' && t.scope !== 'receipt' && (!branchId || !t.branchIds.length || t.branchIds.includes(branchId)))
  const anyFallback = active.some((t) => !t.serviceTypeIds.length)
  const needing = services.filter((s) => s.isActive && s.schemaId).sort((a, b) => a.name.localeCompare(b.name, locale, { sensitivity: 'base', numeric: true }))
  const out: Coverage = { needing, direct: 0, fallback: [], missing: [] }
  for (const s of needing) {
    if (active.some((t) => boundToService(t, s))) out.direct++
    else if (anyFallback) out.fallback.push(s)
    else out.missing.push(s)
  }
  return out
}

/* ---------- per-tab memory: filters survive a trip to the editor and back ---------- */
export interface GalleryState { status: 'all' | ResultTemplate['status']; search: string; filters: GalleryFilters }
export interface GalleryPrefs { view: GalleryView; sort: GallerySort; dir: SortDir }

const stateKey = (kind: TemplateKind) => `clinic.tpl.gallery.${kind}`
const PREFS_KEY = 'clinic.tpl.gallery.prefs'
export const DEFAULT_STATE: GalleryState = { status: 'all', search: '', filters: EMPTY_FILTERS }
export const DEFAULT_PREFS: GalleryPrefs = { view: 'grid', sort: 'updated', dir: 'desc' }

export function loadGalleryState(kind: TemplateKind): GalleryState {
  try {
    const raw = sessionStorage.getItem(stateKey(kind))
    if (!raw) return DEFAULT_STATE
    const v = JSON.parse(raw) as Partial<GalleryState>
    return { status: v.status ?? 'all', search: typeof v.search === 'string' ? v.search : '', filters: { ...EMPTY_FILTERS, ...(v.filters ?? {}) } }
  } catch {
    return DEFAULT_STATE
  }
}
export function saveGalleryState(kind: TemplateKind, s: GalleryState): void {
  try { sessionStorage.setItem(stateKey(kind), JSON.stringify(s)) } catch { /* storage unavailable */ }
}
export function loadGalleryPrefs(kind: TemplateKind): GalleryPrefs {
  try {
    const all = JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}') as Record<string, Partial<GalleryPrefs>>
    return { ...DEFAULT_PREFS, ...(all[kind] ?? {}) }
  } catch {
    return DEFAULT_PREFS
  }
}
export function saveGalleryPrefs(kind: TemplateKind, p: GalleryPrefs): void {
  try {
    const all = JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}') as Record<string, GalleryPrefs>
    localStorage.setItem(PREFS_KEY, JSON.stringify({ ...all, [kind]: p }))
  } catch { /* storage unavailable */ }
}
