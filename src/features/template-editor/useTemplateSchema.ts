import { useMemo } from 'react'
import { useQueries } from '@tanstack/react-query'
import type { AttributeSchema, RenderContext, ServiceType, TemplateAsset } from '@/domain'
import { repos } from '@/data'
import { sampleOrderRenderContext, sampleRenderContext } from '@/features/documents/buildContext'
import { useCategories, useSchema, useServiceType, useServiceTypes, useTemplateAssets } from '@/features/catalog/queries'
import { useEditorStore } from './useEditorStore'

export interface PaletteService { code: string; name: string; serviceTypeId: string; schema: AttributeSchema | null }

/**
 * Resolve what the editor previews against:
 *   item-scope  -> the schema behind the selected "preview as" service type
 *   order-scope -> every bound service (serviceTypeIds + categoryIds) with its schema, exposed as
 *                  ctx.items so {svc.CODE.field} placeholders and the `items` dataset resolve.
 */
export function useTemplateSchema(serviceTypeId: string | null | undefined, companyId: string): { schema: AttributeSchema | null; ctx: RenderContext; assets: TemplateAsset[]; loading: boolean; services: PaletteService[]; orderScope: boolean } {
  const meta = useEditorStore((s) => s.meta)
  const orderScope = meta?.scope === 'order'
  const st = useServiceType(serviceTypeId)
  const sc = useSchema(st.data?.schemaId ?? null)
  const assets = useTemplateAssets(companyId)
  const all = useServiceTypes(companyId, {})

  const bound: ServiceType[] = useMemo(() => {
    if (!orderScope || !all.data || !meta) return []
    return all.data.filter((s) => meta.serviceTypeIds.includes(s.id) || meta.categoryIds.includes(s.categoryId))
  }, [orderScope, all.data, meta])
  const cats = useCategories(companyId)
  const previewCat = useMemo(() => cats.data?.find((c) => c.id === (st.data?.categoryId ?? bound[0]?.categoryId)) ?? null, [cats.data, st.data, bound])
  const schemaIds = useMemo(() => [...new Set(bound.map((s) => s.schemaId).filter(Boolean) as string[])], [bound])
  const schemaQs = useQueries({ queries: schemaIds.map((id) => ({ queryKey: ['schema', id], queryFn: () => repos.catalog.getSchema(id), staleTime: 5 * 60_000 })) })
  const schemaMap = useMemo(() => { const m = new Map<string, AttributeSchema>(); schemaQs.forEach((q) => { if (q.data) m.set(q.data.id, q.data) }); return m }, [schemaQs])
  const services: PaletteService[] = useMemo(() => bound.map((s) => ({ code: s.code ?? s.id, name: s.name, serviceTypeId: s.id, schema: s.schemaId ? (schemaMap.get(s.schemaId) ?? null) : null })), [bound, schemaMap])

  const schema = sc.data ?? null
  const ctx = useMemo(() => (orderScope ? sampleOrderRenderContext(services, null, null, previewCat) : sampleRenderContext(schema, null, null, previewCat)), [orderScope, services, schema, previewCat])
  const loading = st.isLoading || sc.isLoading || assets.isLoading || (orderScope && (all.isLoading || schemaQs.some((q) => q.isLoading)))
  return { schema, ctx, assets: assets.data ?? [], loading, services, orderScope }
}
