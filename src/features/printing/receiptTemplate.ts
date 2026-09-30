/** Which receipt template prints a branch's cheques — mirror of the backend `find_receipt_template`. */
import type { Id, ResultTemplate } from '@/domain'

/** Active receipt template bound to the branch (fewest branches = most specific first), else a company-wide one. */
export function pickReceiptTemplate(templates: ResultTemplate[], branchId: Id | null | undefined): ResultTemplate | undefined {
  const active = templates.filter((t) => t.scope === 'receipt' && t.status === 'active')
  const fits = active.filter((t) => t.branchIds.length === 0 || (branchId != null && t.branchIds.includes(branchId)))
  const specificity = (t: ResultTemplate) => (t.branchIds.length === 0 ? Number.MAX_SAFE_INTEGER : t.branchIds.length)
  return [...fits].sort((a, b) => specificity(a) - specificity(b) || a.createdAt.localeCompare(b.createdAt))[0]
}
