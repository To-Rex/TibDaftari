import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Branch, Company, Id, PageQuery } from '@/domain'
import { repos } from '@/data'

export const orgKeys = {
  company: (id: Id) => ['company', id] as const,
  companies: (q: PageQuery) => ['companies', q] as const,
  branches: (companyId: Id) => ['branches', companyId] as const,
}

export const useCompany = (id: Id) =>
  useQuery({ queryKey: orgKeys.company(id), queryFn: () => repos.tenant.getCompany(id) })

export const useCompanies = (q: PageQuery) =>
  useQuery({ queryKey: orgKeys.companies(q), queryFn: () => repos.tenant.listCompanies(q), placeholderData: (prev) => prev })

export const useBranches = (companyId: Id) =>
  useQuery({ queryKey: orgKeys.branches(companyId), queryFn: () => repos.tenant.listBranches(companyId) })

export function useSaveCompany() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: Partial<Company> & { id?: Id }) => repos.tenant.saveCompany(input),
    onSuccess: (c) => {
      qc.setQueryData(orgKeys.company(c.id), c)
      void qc.invalidateQueries({ queryKey: ['company', c.id] })
      void qc.invalidateQueries({ queryKey: ['companies'] })
    },
  })
}

export function useSaveBranch() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: Partial<Branch> & { companyId: Id; id?: Id }) => repos.tenant.saveBranch(input),
    onSuccess: (b) => {
      void qc.invalidateQueries({ queryKey: orgKeys.branches(b.companyId) })
      void qc.invalidateQueries({ queryKey: ['company', b.companyId] })
    },
  })
}
