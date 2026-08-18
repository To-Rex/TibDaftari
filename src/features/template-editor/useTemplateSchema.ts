import { useMemo } from 'react'
import type { AttributeSchema, RenderContext, ServiceType, TemplateAsset } from '@/domain'
import { sampleOrderRenderContext, sampleRenderContext } from '@/features/documents/buildContext'
import { useCategories, useSchemas, useServiceTypes, useTemplateAssets } from '@/features/catalog/queries'
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
  const assets = useTemplateAssets(companyId)
  // one cached list each (prefetched at login) instead of one request per card / per service / per schema
  const all = useServiceTypes(companyId, {})
  const schemas = useSchemas(companyId)
  const stData = useMemo(() => (serviceTypeId ? all.data?.find((s) => s.id === serviceTypeId) ?? null : null), [all.data, serviceTypeId])
  const schemaMap = useMemo(() => new Map((schemas.data ?? []).map((s) => [s.id, s])), [schemas.data])
  const scData = stData?.schemaId ? (schemaMap.get(stData.schemaId) ?? null) : null

  const bound: ServiceType[] = useMemo(() => {
    if (!orderScope || !all.data || !meta) return []
    return all.data.filter((s) => meta.serviceTypeIds.includes(s.id) || meta.categoryIds.includes(s.categoryId))
  }, [orderScope, all.data, meta])
  const cats = useCategories(companyId)
  const previewCat = useMemo(() => cats.data?.find((c) => c.id === (stData?.categoryId ?? bound[0]?.categoryId)) ?? null, [cats.data, stData, bound])
  const services: PaletteService[] = useMemo(() => bound.map((s) => ({ code: s.code ?? s.id, name: s.name, serviceTypeId: s.id, schema: s.schemaId ? (schemaMap.get(s.schemaId) ?? null) : null })), [bound, schemaMap])

  const schema: AttributeSchema | null = scData
  const ctx = useMemo(() => (orderScope ? sampleOrderRenderContext(services, null, null, previewCat) : sampleRenderContext(schema, null, null, previewCat)), [orderScope, services, schema, previewCat])
  const loading = all.isLoading || schemas.isLoading || assets.isLoading
  return { schema, ctx, assets: assets.data ?? [], loading, services, orderScope }
}
