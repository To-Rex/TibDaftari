/** Data needed to preview a result document for an order item. */
import { useQuery } from '@tanstack/react-query'
import type { Id, OrderItem } from '@/domain'
import { repos } from '@/data'

export function useTemplatesFor(companyId: Id, item: Pick<OrderItem, 'serviceTypeId' | 'categoryId'> | undefined) {
  return useQuery({
    queryKey: ['templates', companyId, 'active', item?.serviceTypeId],
    queryFn: async () => {
      const all = (await repos.templates.list(companyId, { status: 'active', serviceTypeId: item!.serviceTypeId })).filter((t) => t.scope !== 'order')
      // most specific first: service-bound → category-bound → generic
      return all.sort((a, b) => score(b, item!) - score(a, item!))
    },
    enabled: !!item,
    staleTime: 60_000,
  })
}
const score = (t: { serviceTypeIds: Id[]; categoryIds: Id[] }, item: Pick<OrderItem, 'serviceTypeId' | 'categoryId'>) =>
  t.serviceTypeIds.includes(item.serviceTypeId) ? 2 : t.categoryIds.includes(item.categoryId) ? 1 : 0

export const useTemplateAssets = (companyId: Id) =>
  useQuery({ queryKey: ['template-assets', companyId], queryFn: () => repos.templates.listAssets(companyId), staleTime: 5 * 60_000 })

export const useCompany = (companyId: Id) =>
  useQuery({ queryKey: ['company', companyId], queryFn: () => repos.tenant.getCompany(companyId), staleTime: 5 * 60_000 })

export const useBranches = (companyId: Id) =>
  useQuery({ queryKey: ['branches', companyId], queryFn: () => repos.tenant.listBranches(companyId), staleTime: 5 * 60_000 })

export const useTemplate = (templateId: Id | undefined) =>
  useQuery({ queryKey: ['template', templateId], queryFn: () => repos.templates.get(templateId!), enabled: !!templateId, staleTime: 60_000 })
