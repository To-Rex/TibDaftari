/** Patient-portal react-query hooks. All keys are scoped by patientId. */
import { useQueries, useQuery } from '@tanstack/react-query'
import type { Id } from '@/domain'
import { repos } from '@/data'

export const portalKeys = {
  overview: (patientId: Id) => ['portal', 'overview', patientId] as const,
  order: (patientId: Id, orderId: Id) => ['portal', 'order', patientId, orderId] as const,
  document: (patientId: Id, documentId: Id) =>
    ['portal', 'document', patientId, documentId] as const,
  company: (companyId: Id) => ['portal', 'company', companyId] as const,
  branches: (companyId: Id) => ['portal', 'branches', companyId] as const,
  assets: (companyId: Id) => ['portal', 'assets', companyId] as const,
  schema: (schemaId: Id) => ['portal', 'schema', schemaId] as const,
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

export const useCompany = (companyId: Id | undefined) =>
  useQuery({
    queryKey: portalKeys.company(companyId ?? ''),
    queryFn: () => repos.tenant.getCompany(companyId!),
    enabled: !!companyId,
    staleTime: 5 * 60_000,
  })

export const useBranches = (companyId: Id | undefined) =>
  useQuery({
    queryKey: portalKeys.branches(companyId ?? ''),
    queryFn: () => repos.tenant.listBranches(companyId!),
    enabled: !!companyId,
    staleTime: 5 * 60_000,
  })

export const useTemplateAssets = (companyId: Id | undefined) =>
  useQuery({
    queryKey: portalKeys.assets(companyId ?? ''),
    queryFn: () => repos.templates.listAssets(companyId!),
    enabled: !!companyId,
    staleTime: 5 * 60_000,
  })

export const useSchema = (schemaId: Id | null | undefined) =>
  useQuery({
    queryKey: portalKeys.schema(schemaId ?? ''),
    queryFn: () => repos.catalog.getSchema(schemaId!),
    enabled: !!schemaId,
    staleTime: 5 * 60_000,
  })

/** Branch id → name map across every company the patient has visited. */
export function useBranchNames(companyIds: Id[]) {
  const results = useQueries({
    queries: companyIds.map((id) => ({
      queryKey: portalKeys.branches(id),
      queryFn: () => repos.tenant.listBranches(id),
      staleTime: 5 * 60_000,
    })),
  })
  const map = new Map<Id, string>()
  for (const r of results) for (const b of r.data ?? []) map.set(b.id, b.name)
  return map
}

export const usePatient = (patientId: Id) =>
  useQuery({
    queryKey: ['portal', 'patient', patientId] as const,
    queryFn: () => repos.patients.get(patientId),
    staleTime: 5 * 60_000,
  })
