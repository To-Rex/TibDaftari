/**
 * Patient-portal react-query hooks. All keys are scoped by patientId.
 * Only `repos.portal.*` (patient token) is used here — clinic/branch cards, template assets and
 * schemas arrive inside the portal payloads, so no staff-only endpoint is ever called from the portal.
 */
import { useQuery } from '@tanstack/react-query'
import type { Id } from '@/domain'
import type { PortalBranch } from '@/data'
import { repos } from '@/data'

export const portalKeys = {
  overview: (patientId: Id) => ['portal', 'overview', patientId] as const,
  order: (patientId: Id, orderId: Id) => ['portal', 'order', patientId, orderId] as const,
  document: (patientId: Id, documentId: Id) =>
    ['portal', 'document', patientId, documentId] as const,
}

export const usePortalOverview = (patientId: Id) =>
  useQuery({
    queryKey: portalKeys.overview(patientId),
    queryFn: () => repos.portal.overview(patientId),
    staleTime: 60_000,
  })

export const usePortalOrder = (patientId: Id, orderId: Id | undefined) =>
  useQuery({
    queryKey: portalKeys.order(patientId, orderId ?? ''),
    queryFn: () => repos.portal.order(patientId, orderId!),
    enabled: !!orderId,
  })

export const usePortalDocument = (patientId: Id, documentId: Id | undefined) =>
  useQuery({
    queryKey: portalKeys.document(patientId, documentId ?? ''),
    queryFn: () => repos.portal.document(patientId, documentId!),
    enabled: !!documentId,
  })

/** Branch id → name map built from the overview payload (every clinic the patient has visited). */
export const branchNameMap = (branches: PortalBranch[] | undefined): Map<Id, string> =>
  new Map((branches ?? []).map((b) => [b.id, b.name]))
