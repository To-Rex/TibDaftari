import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Branch, BranchSmsInput, Company, Id, PageQuery, SmsTemplateOverrides } from '@/domain'
import { repos } from '@/data'

export const orgKeys = {
  company: (id: Id) => ['company', id] as const,
  companies: (q: PageQuery) => ['companies', q] as const,
  branches: (companyId: Id) => ['branches', companyId] as const,
  branchSms: (branchId: Id) => ['branch-sms-templates', branchId] as const,
  branchSmsAccount: (branchId: Id) => ['branch-sms-account', branchId] as const,
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

/** A branch's SMS texts (its own, or the company's while it has none). */
export const useBranchSmsTemplates = (branchId: Id | null) =>
  useQuery({ queryKey: orgKeys.branchSms(branchId ?? ''), queryFn: () => repos.tenant.getBranchSmsTemplates(branchId as Id), enabled: !!branchId })

export function useSaveBranchSmsTemplates() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ branchId, ...input }: { branchId: Id; templates: SmsTemplateOverrides; applyToAll?: boolean }) => repos.tenant.saveBranchSmsTemplates(branchId, input),
    onSuccess: (r, v) => {
      qc.setQueryData(orgKeys.branchSms(r.branchId), r)
      // every branch (and the company default) changed
      if (v.applyToAll) {
        void qc.invalidateQueries({ queryKey: ['branch-sms-templates'] })
        void qc.invalidateQueries({ queryKey: ['company'] })
      }
    },
  })
}

/** A branch's SMS account (its own Xabarchi key, the company's shared one, or off). */
export const useBranchSms = (branchId: Id | null) =>
  useQuery({ queryKey: orgKeys.branchSmsAccount(branchId ?? ''), queryFn: () => repos.tenant.getBranchSms(branchId as Id), enabled: !!branchId })

export function useSaveBranchSms(companyId: Id) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ branchId, ...input }: BranchSmsInput & { branchId: Id }) => repos.tenant.saveBranchSms(branchId, input),
    onSuccess: (r) => {
      qc.setQueryData(orgKeys.branchSmsAccount(r.branchId), r)
      void qc.invalidateQueries({ queryKey: orgKeys.branches(companyId) }) // the per-branch SMS status
    },
  })
}
