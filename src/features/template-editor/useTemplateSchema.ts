import { useMemo } from 'react'
import type { AttributeSchema, RenderContext, TemplateAsset } from '@/domain'
import { sampleRenderContext } from '@/features/documents/buildContext'
import { useSchema, useServiceType, useTemplateAssets } from '@/features/catalog/queries'

/**
 * Resolve the schema behind a service type (serviceType → schemaId → schema) and build
 * a sample RenderContext for previews. Used by the editor and gallery thumbnails.
 */
export function useTemplateSchema(serviceTypeId: string | null | undefined, companyId: string): { schema: AttributeSchema | null; ctx: RenderContext; assets: TemplateAsset[]; loading: boolean } {
  const st = useServiceType(serviceTypeId)
  const sc = useSchema(st.data?.schemaId ?? null)
  const assets = useTemplateAssets(companyId)
  const schema = sc.data ?? null
  const ctx = useMemo(() => sampleRenderContext(schema), [schema])
  return { schema, ctx, assets: assets.data ?? [], loading: st.isLoading || sc.isLoading || assets.isLoading }
}
