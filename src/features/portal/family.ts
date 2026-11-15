/**
 * One phone, a whole family — in the portal. An SMS-code session sees everyone on the number; this keeps which
 * family member the pages show ("all" by default) and filters the overview's visits and results to them.
 */
import { useMemo } from 'react'
import { create } from 'zustand'
import type { Id, Order, ResultDocument } from '@/domain'
import type { PortalFamilyMember } from '@/data'
import { storage } from '@/shared/lib/storage'
import { firstName } from './status'

export type { PortalFamilyMember }

const KEY = 'clinic.portal.member'
interface MemberState { memberId: Id | 'all'; setMember: (id: Id | 'all') => void }
export const usePortalMember = create<MemberState>((set) => ({
  memberId: storage.get<Id | 'all'>(KEY, 'all'),
  setMember: (id) => { storage.set(KEY, id); set({ memberId: id }) },
}))

/** the overview narrowed to the chosen family member, plus a "whose is it" label for rows while everyone is shown */
export function useFamilyView(data?: { family?: PortalFamilyMember[]; orders: Order[]; documents: ResultDocument[] }) {
  const stored = usePortalMember((s) => s.memberId)
  const family = useMemo(() => data?.family ?? [], [data?.family])
  const many = family.length > 1
  // a remembered member who is no longer in this session's family falls back to everyone
  const memberId: Id | 'all' = many && stored !== 'all' && family.some((m) => m.id === stored) ? stored : 'all'
  return useMemo(() => {
    const orders = data?.orders ?? []
    const documents = data?.documents ?? []
    const orderOwner = new Map(orders.map((o) => [o.id, o.patientId]))
    // the given name ("Karimova Aziza Rustamovna" → "Aziza"), as the greeting uses it
    const names = new Map(family.map((m) => [m.id, firstName(m.fullName)]))
    return {
      family,
      many,
      memberId,
      orders: memberId === 'all' ? orders : orders.filter((o) => o.patientId === memberId),
      documents: memberId === 'all' ? documents : documents.filter((d) => orderOwner.get(d.orderId) === memberId),
      /** first name of whose visit / result it is — only while several people are shown */
      whoOfOrder: (o: Order) => (many && memberId === 'all' ? names.get(o.patientId) : undefined),
      whoOfDocument: (d: ResultDocument) => {
        const pid = orderOwner.get(d.orderId)
        return many && memberId === 'all' && pid ? names.get(pid) : undefined
      },
    }
  }, [data?.orders, data?.documents, family, many, memberId])
}

/** visits per family member (the switch shows them on each pill) */
export function countsOf(orders: Order[]): Record<Id, number> {
  const out: Record<Id, number> = {}
  for (const o of orders) out[o.patientId] = (out[o.patientId] ?? 0) + 1
  return out
}

/** results per family member */
export function docCountsOf(documents: ResultDocument[], orders: Order[]): Record<Id, number> {
  const owner = new Map(orders.map((o) => [o.id, o.patientId]))
  const out: Record<Id, number> = {}
  for (const d of documents) {
    const pid = owner.get(d.orderId)
    if (pid) out[pid] = (out[pid] ?? 0) + 1
  }
  return out
}
