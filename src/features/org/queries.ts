/** Organisation-tree queries: the visible tree, one unit's card, SMS account / texts, mutations. */
import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Id, OrgUnit, SmsTemplateOverrides, UnitCreateInput, UnitSmsInput, UnitTreeQuery, UnitUpdateInput } from '@/domain'
import { buildUnitTree, facilitiesUnder, flattenUnitTree, unitAncestors, unitsUnder } from '@/domain'
import { repos } from '@/data'

export const orgKeys = {
  tree: (q: UnitTreeQuery = {}) => ['units', 'tree', q] as const,
  unit: (id: Id) => ['unit', id] as const,
  sms: (unitId: Id) => ['unit-sms', unitId] as const,
  smsTemplates: (unitId: Id) => ['unit-sms-templates', unitId] as const,
}

/** Every unit the caller may see (flat). Shared by the shell switchers and every unit picker. */
export const useUnitTree = (q: UnitTreeQuery = {}, enabled = true) =>
  useQuery({ queryKey: orgKeys.tree(q), queryFn: () => repos.org.tree(q), staleTime: 60_000, enabled })

export const useUnit = (id: Id | null | undefined) =>
  useQuery({ queryKey: orgKeys.unit(id ?? ''), queryFn: () => repos.org.get(id as Id), enabled: !!id })

/** The flat tree as nested nodes + handy derived lists (memoised). */
export function useUnitTreeShape(units: OrgUnit[] | undefined) {
  return useMemo(() => {
    const list = units ?? []
    const roots = buildUnitTree(list)
    return {
      units: list,
      roots,
      flat: flattenUnitTree(roots),
      byId: new Map(list.map((u) => [u.id, u])),
      under: (rootId: Id) => unitsUnder(list, rootId),
      facilitiesUnder: (rootId: Id) => facilitiesUnder(list, rootId),
      ancestors: (id: Id) => unitAncestors(list, id),
    }
  }, [units])
}

function useInvalidateTree() {
  const qc = useQueryClient()
  return (unitId?: Id) => {
    void qc.invalidateQueries({ queryKey: ['units'] })
    if (unitId) void qc.invalidateQueries({ queryKey: orgKeys.unit(unitId) })
    void qc.invalidateQueries({ queryKey: ['unit'] })
  }
}

export function useCreateUnit() {
  const inv = useInvalidateTree()
  return useMutation({
    mutationFn: (input: UnitCreateInput) => repos.org.create(input),
    onSuccess: (u) => inv(u.parentId ?? undefined),
  })
}

export function useUpdateUnit() {
  const qc = useQueryClient()
  const inv = useInvalidateTree()
  return useMutation({
    mutationFn: ({ id, ...input }: UnitUpdateInput & { id: Id }) => repos.org.update(id, input),
    onSuccess: (u) => { qc.setQueryData(orgKeys.unit(u.id), u); inv(u.id) },
  })
}

/** The unit's SMS account (its own Xabarchi key, an inherited one, or off). */
export const useUnitSms = (unitId: Id | null) =>
  useQuery({ queryKey: orgKeys.sms(unitId ?? ''), queryFn: () => repos.org.getSms(unitId as Id), enabled: !!unitId })

export function useSaveUnitSms() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ unitId, ...input }: UnitSmsInput & { unitId: Id }) => repos.org.saveSms(unitId, input),
    onSuccess: (r, v) => {
      qc.setQueryData(orgKeys.sms(v.unitId), r)
      // every unit below inherits the change
      void qc.invalidateQueries({ queryKey: ['unit-sms'] })
      void qc.invalidateQueries({ queryKey: ['unit'] })
    },
  })
}

/** The unit's SMS texts (its own, or inherited). */
export const useUnitSmsTemplates = (unitId: Id | null) =>
  useQuery({ queryKey: orgKeys.smsTemplates(unitId ?? ''), queryFn: () => repos.org.getSmsTemplates(unitId as Id), enabled: !!unitId })

export function useSaveUnitSmsTemplates() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ unitId, ...input }: { unitId: Id; templates: SmsTemplateOverrides; applyToAll?: boolean }) => repos.org.saveSmsTemplates(unitId, input),
    onSuccess: (r) => {
      qc.setQueryData(orgKeys.smsTemplates(r.unitId), r)
      void qc.invalidateQueries({ queryKey: ['unit-sms-templates'] })
    },
  })
}

export function useSetUnitTelegram() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ unitId, botToken }: { unitId: Id; botToken: string | null }) => repos.org.setTelegram(unitId, botToken),
    onSuccess: (u) => { qc.setQueryData(orgKeys.unit(u.id), u); void qc.invalidateQueries({ queryKey: ['unit'] }) },
  })
}
