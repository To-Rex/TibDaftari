import { addDays, endOfMonth, startOfMonth, subDays } from 'date-fns'
import { isoDay } from './format'

export type DatePreset = 'today' | 'yesterday' | 'last7' | 'last30' | 'thisMonth'
export interface DateRange { from: string; to: string }

export function presetRange(p: DatePreset, now = new Date()): DateRange {
  switch (p) {
    case 'today': return { from: isoDay(now), to: isoDay(now) }
    case 'yesterday': return { from: isoDay(subDays(now, 1)), to: isoDay(subDays(now, 1)) }
    case 'last7': return { from: isoDay(subDays(now, 6)), to: isoDay(now) }
    case 'last30': return { from: isoDay(subDays(now, 29)), to: isoDay(now) }
    case 'thisMonth': return { from: isoDay(startOfMonth(now)), to: isoDay(endOfMonth(now)) }
  }
}
export const shiftRange = (r: DateRange, days: number): DateRange => ({ from: isoDay(addDays(new Date(r.from), days)), to: isoDay(addDays(new Date(r.to), days)) })
