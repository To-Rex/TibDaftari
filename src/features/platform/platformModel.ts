/** What the platform page's pieces share: the grouping of every level, the activity numbers, one line of a list. */
import type { OrgUnit, RegionGroupBy, UnitMetrics, UnitRow } from '@/domain'
import type { PlatformLevel } from './PathStepper'

/** the statistics' grouping for the list of each level */
export const GROUP_BY: Record<PlatformLevel, RegionGroupBy> = { company: 'company', country: 'country', region: 'region', district: 'district', facility: 'unit' }
export const METRIC_KEYS: (keyof UnitMetrics)[] = ['units', 'orders', 'revenue', 'patientsNew', 'resultsReady', 'smsSent']
export const ZERO: UnitMetrics = { units: 0, orders: 0, revenue: 0, patientsNew: 0, resultsReady: 0, smsSent: 0 }
export const NO_COUNTS = { regions: 0, districts: 0, facilities: 0, employees: 0 }
export type Counts = typeof NO_COUNTS
export type SortKey = 'name' | keyof UnitMetrics

/** One line of the list at the current level: the activity (zeros when none) and what the tree knows about it. */
export interface Entry extends UnitRow {
  /** the tree node behind it (a company, a company's country) */
  node?: OrgUnit
  /** the all-companies view: the country nodes of every company working there */
  nodes?: OrgUnit[]
  counts?: Counts
}

export const sumCounts = (xs: OrgUnit[]): Counts =>
  xs.reduce((a, u) => ({ regions: a.regions + u.counts.regions, districts: a.districts + u.counts.districts, facilities: a.facilities + u.counts.facilities, employees: a.employees + u.counts.employees }), NO_COUNTS)

/**
 * The list of the current level. Companies and countries come from the tree (every one, with or without activity) with
 * their numbers added; regions, districts and facilities come from the numbers, completed with the units of the tree
 * that have none yet (a region opened yesterday is listed too) when one company is looked at.
 */
export function buildEntries(a: {
  level: PlatformLevel
  companies: OrgUnit[]
  countryNodes: OrgUnit[]
  units: OrgUnit[]
  allCompanies: boolean
  companyId?: string
  /** an administrator's own subtree */
  inRoot: Set<string> | null
  sel: { country?: string; region?: string; district?: string }
  rows?: UnitRow[]
  /** the rows belong to the place left a moment ago */
  stale: boolean
  geoOf: (id?: string | null) => { name: string; code: string; label: string } | undefined
}): Entry[] {
  const byId = new Map((a.rows ?? []).map((r) => [r.id, r] as const))
  if (a.level === 'company') {
    return a.companies.map((c) => ({ ...ZERO, ...byId.get(c.id), id: c.id, kind: 'company', name: c.name, unitId: c.id, code: c.code, isActive: c.isActive, node: c }))
  }
  if (a.level === 'country') {
    if (a.allCompanies) {
      // every country any company works in (and any with activity), the companies there, their sizes summed
      const geo = new Set<string>([...a.countryNodes.flatMap((n) => (n.countryId ? [n.countryId] : [])), ...(a.rows ?? []).map((r) => r.id)])
      return [...geo].map((g): Entry => {
        const mine = a.countryNodes.filter((n) => n.countryId === g)
        const r = byId.get(g)
        const c = a.geoOf(g)
        return { ...ZERO, ...r, id: g, kind: 'country', name: c?.label ?? r?.name ?? mine[0]?.name ?? '—', code: c?.code ?? null, unitId: mine.length === 1 ? mine[0]!.id : null, nodes: mine, counts: sumCounts(mine) }
      }).sort((x, y) => x.name.localeCompare(y.name))
    }
    const mine = a.countryNodes.filter((n) => n.parentId === a.companyId && (!a.inRoot || a.inRoot.has(n.id)))
    const out: Entry[] = mine.map((n) => ({ ...ZERO, ...(n.countryId ? byId.get(n.countryId) : undefined), id: n.countryId ?? n.id, kind: 'country', name: n.name, code: a.geoOf(n.countryId)?.code ?? n.code ?? null, unitId: n.id, isActive: n.isActive, node: n, counts: n.counts }))
    // activity in a country the tree does not show still gets its card
    for (const r of a.rows ?? []) if (!out.some((e) => e.id === r.id)) out.push({ ...r, counts: NO_COUNTS })
    return out
  }
  if (!a.rows || a.stale) return a.rows ?? []
  const byKey = new Map<string, Entry>(a.rows.map((r) => [r.id, { ...r }]))
  if (a.companyId) {
    for (const n of a.units) {
      if (n.companyId !== a.companyId || (a.inRoot && !a.inRoot.has(n.id))) continue
      const here = a.level === 'region' ? n.level === 'region' && n.countryId === a.sel.country
        : a.level === 'district' ? n.level === 'district' && n.regionId === a.sel.region
          : n.level === 'facility' && n.districtId === a.sel.district
      const key = !here ? null : a.level === 'region' ? n.regionId : a.level === 'district' ? n.districtId : n.id
      if (!key) continue
      const have = byKey.get(key)
      if (have) { if (!have.unitId) have.unitId = n.id }
      else byKey.set(key, { ...ZERO, id: key, kind: GROUP_BY[a.level], name: n.name, unitId: n.id, code: a.level === 'facility' ? n.code : null, isActive: n.isActive, units: a.level === 'facility' ? 1 : n.counts.facilities })
    }
  }
  return [...byKey.values()]
}
