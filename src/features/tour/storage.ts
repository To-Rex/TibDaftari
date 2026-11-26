/**
 * What a reader has already been shown, kept in this browser per user (`clinic.tour`): the tours seen (with their
 * version) and whether new pages may open their tour by themselves. Nothing here is needed for the app to work —
 * a cleared storage only means the tours are offered once more.
 */
import { storage } from '@/shared/lib/storage'

const KEY = 'clinic.tour'
export interface TourMemory { auto: boolean; seen: Record<string, number> }
type Store = Record<string, TourMemory>

const blank = (): TourMemory => ({ auto: true, seen: {} })
const read = (): Store => {
  const s = storage.get<Store | null>(KEY, null)
  return s && typeof s === 'object' ? s : {}
}

export function tourMemory(user: string): TourMemory {
  const m = read()[user]
  return m && typeof m === 'object' ? { auto: m.auto !== false, seen: { ...(m.seen ?? {}) } } : blank()
}
function update(user: string, change: (m: TourMemory) => void) {
  const all = read()
  const m = tourMemory(user)
  change(m)
  all[user] = m
  storage.set(KEY, all)
}
export const markTourSeen = (user: string, ids: string[], version = 1) => update(user, (m) => { for (const id of ids) m.seen[id] = Math.max(m.seen[id] ?? 0, version) })
export const setTourAuto = (user: string, on: boolean) => update(user, (m) => { m.auto = on })
