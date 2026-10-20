import { useMemo } from 'react'
import type { AttributeSchema, RenderContext, ResultTemplate, ServiceType, TemplateAsset } from '@/domain'
import { sampleOrderRenderContext, sampleReceiptRenderContext, sampleRenderContext } from '@/features/documents/buildContext'
import { useAuth } from '@/features/auth/store'
import { useCategories, useSchemas, useServiceTypes, useTemplateAssets } from '@/features/catalog/queries'
import { useBranches, useCompany } from '@/features/org/queries'
import { useEditorStore } from './useEditorStore'

export interface PaletteService { code: string; name: string; serviceTypeId: string; schema: AttributeSchema | null }

/**
 * Resolve what the editor previews against:
 *   item-scope  -> the schema behind the selected "preview as" service type
 *   order-scope -> every bound service (serviceTypeIds + categoryIds) with its schema, exposed as
 *                  ctx.items so {svc.CODE.field} placeholders and the `items` dataset resolve.
 */
export function useTemplateSchema(serviceTypeId: string | null | undefined, companyId: string, tpl?: Pick<ResultTemplate, 'scope' | 'serviceTypeIds' | 'categoryIds' | 'branchIds'>): { schema: AttributeSchema | null; ctx: RenderContext; assets: TemplateAsset[]; loading: boolean; services: PaletteService[]; orderScope: boolean; receiptScope: boolean } {
  const storeMeta = useEditorStore((s) => s.meta)
  // outside the editor (gallery cards) the template itself says what to preview against
  const meta = tpl ?? storeMeta
  const orderScope = meta?.scope === 'order'
  const receiptScope = meta?.scope === 'receipt'
  const assets = useTemplateAssets(companyId)
  // the preview carries the real letterhead: the clinic and the branch the template belongs to (or the
  // branch selected in the top bar while the template is not bound yet)
  const shellBranchId = useAuth((s) => s.branchId)
  const company = useCompany(companyId)
  const allBranches = useBranches(companyId)
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
  const previewBranchId = meta?.branchIds?.[0] ?? shellBranchId ?? allBranches.data?.find((b) => b.isActive)?.id ?? allBranches.data?.[0]?.id
  const previewBranch = useMemo(() => allBranches.data?.find((b) => b.id === previewBranchId) ?? null, [allBranches.data, previewBranchId])

  const schema: AttributeSchema | null = scData
  const ctx = useMemo(
    () => (receiptScope
      ? sampleReceiptRenderContext(company.data, previewBranch)
      : orderScope
        ? sampleOrderRenderContext(services, company.data, previewBranch, previewCat)
        : sampleRenderContext(schema, company.data, previewBranch, previewCat)),
    [receiptScope, orderScope, services, schema, previewCat, company.data, previewBranch],
  )
  const loading = all.isLoading || schemas.isLoading || assets.isLoading || company.isLoading || allBranches.isLoading
  return { schema, ctx, assets: assets.data ?? [], loading, services, orderScope, receiptScope }
}
