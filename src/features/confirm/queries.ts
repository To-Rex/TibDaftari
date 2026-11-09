/** Data needed to preview a result document for an order item. `scopeId` = the facility the staff app works in. */
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { Id, OrderItem, OrgUnit } from '@/domain'
import { repos } from '@/data'
import { useUnit, useUnitTree, useUnitTreeShape } from '@/features/org/queries'

/** Active item-scope templates usable at the item's facility, most specific first. */
export function useTemplatesFor(scopeId: Id, item: Pick<OrderItem, 'serviceTypeId' | 'categoryId' | 'unitId'> | undefined) {
  return useQuery({
    queryKey: ['templates', scopeId, 'active', item?.serviceTypeId, item?.unitId],
    queryFn: async () => {
      const all = (await repos.templates.list(scopeId, { status: 'active', serviceTypeId: item!.serviceTypeId, unitId: item!.unitId })).filter((t) => t.scope !== 'order' && t.scope !== 'receipt')
      // most specific first: service-bound → category-bound → generic
      return all.sort((a, b) => score(b, item!) - score(a, item!))
    },
    enabled: !!item,
    staleTime: 60_000,
  })
}
const score = (t: { serviceTypeIds: Id[]; categoryIds: Id[] }, item: Pick<OrderItem, 'serviceTypeId' | 'categoryId'>) =>
  t.serviceTypeIds.includes(item.serviceTypeId) ? 2 : t.categoryIds.includes(item.categoryId) ? 1 : 0

export const useTemplateAssets = (scopeId: Id) =>
  useQuery({ queryKey: ['template-assets', scopeId], queryFn: () => repos.templates.listAssets(scopeId), staleTime: 5 * 60_000 })

export const useTemplate = (templateId: Id | undefined) =>
  useQuery({ queryKey: ['template', templateId], queryFn: () => repos.templates.get(templateId!), enabled: !!templateId, staleTime: 60_000 })

/**
 * The facility a document belongs to (`unit`) and the organisation that issues it (`org` = the nearest ancestor
 * above facility level) — the letterhead blocks of the render context. The facility card comes from the API
 * (`GET /units/{id}`, the tree row while it loads); the organisation from the tree's ancestors, which the API
 * always includes for the caller's units (a parent fetched by id as a fallback).
 */
export function useDocumentUnits(unitId: Id | null | undefined): { unit: OrgUnit | null; org: OrgUnit | null; loading: boolean } {
  const card = useUnit(unitId)
  const tree = useUnitTree()
  const shape = useUnitTreeShape(tree.data)
  const fromTree = unitId ? shape.byId.get(unitId) : undefined
  const unit = card.data ?? fromTree ?? null
  const orgFromTree = useMemo(() => (unitId ? [...shape.ancestors(unitId)].reverse().find((u) => u.level !== 'facility') ?? null : null), [shape, unitId])
  const parent = useUnit(!orgFromTree && unit?.level === 'facility' ? unit.parentId : null)
  const org = orgFromTree ?? parent.data ?? null
  return { unit, org, loading: (!unit && (card.isLoading || tree.isLoading)) || (!org && parent.isLoading) }
}
