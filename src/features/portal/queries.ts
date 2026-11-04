/**
 * Patient-portal react-query hooks. All keys are scoped by patientId and by how the patient signed in:
 * an SMS-code session sees every patient of the phone, a login session only its own — they never share a cache.
 * Only `repos.portal.*` (patient token) is used here — clinic/branch cards, template assets and
 * schemas arrive inside the portal payloads, so no staff-only endpoint is ever called from the portal.
 */
import { useQuery } from '@tanstack/react-query'
import type { Id } from '@/domain'
import type { PortalBranch } from '@/data'
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

/** Branch id → name map built from the overview payload (every clinic the patient has visited). */
export const branchNameMap = (branches: PortalBranch[] | undefined): Map<Id, string> =>
  new Map((branches ?? []).map((b) => [b.id, b.name]))
