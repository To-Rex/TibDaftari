import { useMemo } from 'react'
import type { AttributeSchema, Id, OrgUnit, RenderContext, ResultTemplate, ServiceType, TemplateAsset } from '@/domain'
import { sampleOrderRenderContext, sampleReceiptRenderContext, sampleRenderContext } from '@/features/documents/buildContext'
import { useAuth } from '@/features/auth/store'
import { useCategories, useSchemas, useServiceTypes, useTemplateAssets } from '@/features/catalog/queries'
import { useUnitTree, useUnitTreeShape } from '@/features/org/queries'
import { fmtPhone } from '@/shared/lib/format'
import { useEditorStore } from './useEditorStore'

export interface PaletteService { code: string; name: string; serviceTypeId: string; schema: AttributeSchema | null }

/** Letterhead of a preview: the organisation (`org`) and the facility (`unit`) — mirrors the backend renderer context. */
export interface OrgCtx { name: string; shortName?: string; legalName?: string; phone?: string; email?: string; address?: string; logoUrl?: string }
export interface UnitCtx { name: string; code?: string; phone?: string; address?: string; timezone?: string; district?: string; region?: string }
/** `company.*` / `branch.*` stay as aliases of `org.*` / `unit.*` so templates made before the organisation tree keep previewing. */
export type PreviewContext = RenderContext & { org: OrgCtx; unit: UnitCtx; company: OrgCtx & { slug?: string }; branch: UnitCtx }

const orgCtx = (u: OrgUnit | null | undefined): OrgCtx | null => u ? {
  name: u.shortName || u.name, shortName: u.shortName ?? undefined, legalName: u.legalName ?? undefined, phone: u.phone ? fmtPhone(u.phone) : undefined,
  email: u.email ?? undefined, address: u.address ?? undefined, logoUrl: u.logoUrl ?? undefined,
} : null
const unitCtx = (u: OrgUnit | null | undefined): UnitCtx | null => u ? {
  name: u.name, code: u.code ?? undefined, phone: u.phone ? fmtPhone(u.phone) : undefined, address: u.address ?? undefined, timezone: u.timezone,
  district: u.districtName ?? undefined, region: u.regionName ?? undefined,
} : null

/** The sample builders' own placeholders when the tree is not loaded yet. */
const SAMPLE_ORG: OrgCtx = { name: 'TibDaftari', legalName: 'TibDaftari MChJ', email: 'info@tibdaftari.uz' }
const SAMPLE_UNIT: UnitCtx = { name: 'Markaziy muassasa', code: 'M', timezone: 'Asia/Tashkent' }

/** `org` / `unit` plus the legacy `company` / `branch` aliases on top of a built context (`company.slug` → `unit.code`). */
export function withOrgAliases(ctx: RenderContext, org: OrgCtx | null, unit: UnitCtx | null): PreviewContext {
  const o = org ?? SAMPLE_ORG
  const u = unit ?? SAMPLE_UNIT
  return { ...ctx, org: o, unit: u, company: { ...o, slug: u.code }, branch: u }
}

/**
 * Resolve what the editor previews against:
 *   item-scope  -> the schema behind the selected "preview as" service type
 *   order-scope -> every bound service (serviceTypeIds + categoryIds) with its schema, exposed as
 *                  ctx.items so {svc.CODE.field} placeholders and the `items` dataset resolve.
 * The letterhead is real: the facility the template is for (its first bound unit, else the facility the shell
 * works in, else the first facility under the owner) and the organisation above it (the nearest non-facility unit).
 */
export function useTemplateSchema(serviceTypeId: string | null | undefined, scopeId: Id, tpl?: Pick<ResultTemplate, 'scope' | 'serviceTypeIds' | 'categoryIds' | 'unitIds' | 'ownerUnitId'>): { schema: AttributeSchema | null; ctx: PreviewContext; assets: TemplateAsset[]; loading: boolean; services: PaletteService[]; orderScope: boolean; receiptScope: boolean } {
  const storeMeta = useEditorStore((s) => s.meta)
  const storeOwner = useEditorStore((s) => s.template?.ownerUnitId)
  // outside the editor (gallery cards) the template itself says what to preview against
  const meta = tpl ?? storeMeta
  const ownerUnitId = tpl?.ownerUnitId ?? storeOwner ?? scopeId
  const orderScope = meta?.scope === 'order'
  const receiptScope = meta?.scope === 'receipt'
  const assets = useTemplateAssets(scopeId)
  // the facility the shell works in (admins of a region pick one) — the fallback letterhead while the template is not bound
  const shellFacilityId = useAuth((s) => s.facilityId)
  const tree = useUnitTree()
  const shape = useUnitTreeShape(tree.data)
  // one cached list each (prefetched at login) instead of one request per card / per service / per schema
  const all = useServiceTypes(scopeId, {})
  const schemas = useSchemas(scopeId)
  const stData = useMemo(() => (serviceTypeId ? all.data?.find((s) => s.id === serviceTypeId) ?? null : null), [all.data, serviceTypeId])
  const schemaMap = useMemo(() => new Map((schemas.data ?? []).map((s) => [s.id, s])), [schemas.data])
  const scData = stData?.schemaId ? (schemaMap.get(stData.schemaId) ?? null) : null

  const bound: ServiceType[] = useMemo(() => {
    if (!orderScope || !all.data || !meta) return []
    return all.data.filter((s) => meta.serviceTypeIds.includes(s.id) || meta.categoryIds.includes(s.categoryId))
  }, [orderScope, all.data, meta])
  const cats = useCategories(scopeId)
  const previewCat = useMemo(() => cats.data?.find((c) => c.id === (stData?.categoryId ?? bound[0]?.categoryId)) ?? null, [cats.data, stData, bound])
  const services: PaletteService[] = useMemo(() => bound.map((s) => ({ code: s.code ?? s.id, name: s.name, serviceTypeId: s.id, schema: s.schemaId ? (schemaMap.get(s.schemaId) ?? null) : null })), [bound, schemaMap])

  const firstUnitId = meta?.unitIds?.[0]
  const letterhead = useMemo(() => {
    if (!tree.data?.length) return { org: null, unit: null }
    const root = shape.byId.get(ownerUnitId) ?? shape.byId.get(scopeId)
    // the facility: the first bound unit when it is one (else the first facility under it), else the shell's facility
    // when it lies under the owner, else the first facility under the owner, else the owner itself
    const boundUnit = firstUnitId ? shape.byId.get(firstUnitId) : undefined
    const underOwner = root ? new Set(shape.under(root.id).map((u) => u.id)) : null
    const facility: OrgUnit | undefined =
      (boundUnit && (boundUnit.level === 'facility' ? boundUnit : shape.facilitiesUnder(boundUnit.id)[0]))
      ?? (shellFacilityId && (!underOwner || underOwner.has(shellFacilityId)) ? shape.byId.get(shellFacilityId) : undefined)
      ?? (root ? shape.facilitiesUnder(root.id)[0] : undefined)
      ?? root
    // the organisation: the nearest non-facility unit on the facility's path
    const org = facility ? [...shape.ancestors(facility.id)].reverse().find((u) => u.level !== 'facility') ?? facility : undefined
    return { org: orgCtx(org), unit: unitCtx(facility) }
  }, [tree.data, shape, ownerUnitId, scopeId, firstUnitId, shellFacilityId])

  const schema: AttributeSchema | null = scData
  const ctx = useMemo(() => {
    const { org, unit } = letterhead
    const base = receiptScope
      ? sampleReceiptRenderContext(org, unit)
      : orderScope
        ? sampleOrderRenderContext(services, org, unit, previewCat)
        : sampleRenderContext(schema, org, unit, previewCat)
    return withOrgAliases(base, org, unit)
  }, [receiptScope, orderScope, services, schema, previewCat, letterhead])
  const loading = all.isLoading || schemas.isLoading || assets.isLoading || tree.isLoading
  return { schema, ctx, assets: assets.data ?? [], loading, services, orderScope, receiptScope }
}
