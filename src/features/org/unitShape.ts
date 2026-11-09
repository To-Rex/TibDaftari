/**
 * The indexed organisation tree behind the header switcher: children per node, facility counts, lineage, and the
 * levels below the sole root — one switcher column each.
 */
import { useMemo } from 'react'
import { UNIT_LEVELS, type Id, type OrgUnit, type UnitLevel } from '@/domain'

export interface UnitShape {
  byId: Map<Id, OrgUnit>
  children: Map<Id | null, OrgUnit[]>
  /** facilities under each node (a facility counts itself) */
  facilities: Map<Id, number>
  roots: OrgUnit[]
  /** the only root, when there is exactly one — browsing starts inside it */
  soleRoot: OrgUnit | null
  /** the levels below the sole root (or the roots' level and below), top → bottom */
  levels: UnitLevel[]
  /** the lineage above a unit, top → down, without the unit itself */
  ancestors: (id: Id) => OrgUnit[]
  /** the parent as the switcher sees it: a unit of the tree, or null at the top */
  parentOf: (u: OrgUnit) => Id | null
  hasKids: (id: Id) => boolean
}

export function useUnitShape(units: OrgUnit[]): UnitShape {
  return useMemo(() => {
    const byId = new Map(units.map((u) => [u.id, u] as const))
    const parentOf = (u: OrgUnit): Id | null => (u.parentId && byId.has(u.parentId) ? u.parentId : null)
    const children = new Map<Id | null, OrgUnit[]>()
    for (const u of units) {
      const pid = parentOf(u)
      const list = children.get(pid) ?? []
      list.push(u)
      children.set(pid, list)
    }
    const cmp = (a: OrgUnit, b: OrgUnit) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)
    for (const list of children.values()) list.sort(cmp)
    const facilities = new Map<Id, number>()
    const count = (u: OrgUnit): number => {
      const n = (u.level === 'facility' ? 1 : 0) + (children.get(u.id) ?? []).reduce((s, c) => s + count(c), 0)
      facilities.set(u.id, n)
      return n
    }
    const roots = children.get(null) ?? []
    roots.forEach(count)
    const soleRoot = roots.length === 1 ? roots[0]! : null
    const levels = UNIT_LEVELS.filter((l) => units.some((u) => u.level === l && u !== soleRoot))
    const ancestors = (id: Id) => {
      const out: OrgUnit[] = []
      let cur = byId.get(id)
      while (cur) {
        const pid = parentOf(cur)
        cur = pid ? byId.get(pid) : undefined
        if (cur) out.unshift(cur)
      }
      return out
    }
    return { byId, children, facilities, roots, soleRoot, levels, ancestors, parentOf, hasKids: (id) => (children.get(id)?.length ?? 0) > 0 }
  }, [units])
}

/** The level above, by name — from the tree when it is there, else from the geo names the API sends. */
export function parentName(u: OrgUnit, shape: UnitShape): string | null {
  const p = u.parentId ? shape.byId.get(u.parentId) : undefined
  if (p) return p.name
  if (u.level === 'region') return u.countryName ?? null
  if (u.level === 'district') return u.regionName ?? null
  if (u.level === 'facility') return u.districtName ?? u.regionName ?? null
  return null
}

/** "O‘zbekiston › Xorazm viloyati › Bog‘ot tumani" — where a unit sits, without the unit itself. */
export function parentsPath(u: OrgUnit, shape: UnitShape): string {
  const anc = shape.ancestors(u.id)
  if (anc.length) return anc.map((a) => a.name).join(' › ')
  const own = ` › ${u.name}`
  return u.path.endsWith(own) ? u.path.slice(0, -own.length) : u.path === u.name ? '' : u.path
}
