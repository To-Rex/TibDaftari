/** Which receipt template prints a facility's cheques — mirror of the backend `_pick_template` for `scope == 'receipt'`. */
import type { Id, ResultTemplate } from '@/domain'

/**
 * The active receipt template usable at the facility: bound to the facility itself > bound to the nearest unit
 * above it (`ancestorIds`, root → parent, as `unitAncestors` returns them) > bound to nothing; ties go to the
 * older template. `templates` is what the API lists for the facility (`templates.list(scopeId, { unitId })`), so a
 * binding that matches neither the facility nor a known ancestor is still taken for an ancestor's.
 */
export function pickReceiptTemplate(templates: ResultTemplate[], unitId: Id | null | undefined, ancestorIds: Id[] = []): ResultTemplate | undefined {
  const active = templates.filter((t) => t.scope === 'receipt' && t.status === 'active')
  const nearestFirst = [...ancestorIds].filter((id) => id !== unitId).reverse()
  const rank = (t: ResultTemplate): number => {
    if (!t.unitIds.length) return nearestFirst.length + 2
    if (unitId != null && t.unitIds.includes(unitId)) return 0
    const i = nearestFirst.findIndex((a) => t.unitIds.includes(a))
    return i >= 0 ? i + 1 : nearestFirst.length + 1
  }
  return [...active].sort((a, b) => rank(a) - rank(b) || a.createdAt.localeCompare(b.createdAt))[0]
}
