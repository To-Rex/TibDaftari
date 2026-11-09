/**
 * Patient-portal react-query hooks. All keys are scoped by patientId and by how the patient signed in:
 * an SMS-code session sees every patient of the phone, a login session only its own — they never share a cache.
 */
import { useQuery } from '@tanstack/react-query'
import type { Id } from '@/domain'
import type { PortalOrg, PortalUnit } from '@/data'
import { repos } from '@/data'
import { useAuth } from '@/features/auth/store'

type Scope = 'otp' | 'login'

export const portalKeys = {
  overview: (patientId: Id, scope: Scope) => ['portal', 'overview', patientId, scope] as const,
  order: (patientId: Id, orderId: Id, scope: Scope) => ['portal', 'order', patientId, scope, orderId] as const,
  document: (patientId: Id, documentId: Id, scope: Scope) =>
    ['portal', 'document', patientId, scope, documentId] as const,
}

const useScope = (): Scope => useAuth((s) => s.patient?.via ?? 'otp')

export const usePortalOverview = (patientId: Id) => {
  const scope = useScope()
  return useQuery({
    queryKey: portalKeys.overview(patientId, scope),
    queryFn: () => repos.portal.overview(patientId),
    staleTime: 60_000,
  })
}

export const usePortalOrder = (patientId: Id, orderId: Id | undefined) => {
  const scope = useScope()
  return useQuery({
    queryKey: portalKeys.order(patientId, orderId ?? '', scope),
    queryFn: () => repos.portal.order(patientId, orderId!),
    enabled: !!orderId,
  })
}

export const usePortalDocument = (patientId: Id, documentId: Id | undefined) => {
  const scope = useScope()
  return useQuery({
    queryKey: portalKeys.document(patientId, documentId ?? '', scope),
    queryFn: () => repos.portal.document(patientId, documentId!),
    enabled: !!documentId,
  })
}

/** "Tashkilot · Muassasa" — just one of them when the other is missing or they carry the same name. */
export const placeLabel = (org?: string | null, unit?: string | null): string | undefined =>
  org && unit && org !== unit ? `${org} · ${unit}` : org || unit || undefined

/**
 * Where a cheque / document was made, resolved from the overview payload: the facility (`unit`) and the organisation
 * above it (`org`). A row's own `unitName` is the fallback when the facility is not in the list.
 */
export function placeNames(data?: { orgs: PortalOrg[]; units: PortalUnit[] }) {
  const units = new Map((data?.units ?? []).map((u) => [u.id, u]))
  const orgs = new Map((data?.orgs ?? []).map((o) => [o.id, o]))
  const unitOf = (unitId: Id) => units.get(unitId)
  const orgOf = (unitId: Id) => {
    const u = units.get(unitId)
    return u?.orgId ? orgs.get(u.orgId) : undefined
  }
  const place = (row: { unitId: Id; unitName?: string | null }) => placeLabel(orgOf(row.unitId)?.name, unitOf(row.unitId)?.name ?? row.unitName)
  return { unitOf, orgOf, place }
}
