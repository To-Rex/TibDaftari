/** Item status labels/tones shared by lab, confirm and reports. */
import type { ItemStatus } from '@/domain'
import type { Tone } from '@/shared/ui'
import i18n from '@/shared/i18n'

export const ITEM_STATUSES: ItemStatus[] = ['pending', 'entered', 'submitted', 'approved', 'rejected', 'cancelled']

export const itemStatusTone: Record<ItemStatus, Tone> = {
  pending: 'neutral',
  entered: 'info',
  submitted: 'warn',
  approved: 'ok',
  rejected: 'danger',
  cancelled: 'neutral',
}

/** Tailwind bg class for the status stripe (left edge of rows). */
export const itemStatusStripe: Record<ItemStatus, string> = {
  pending: 'bg-line-strong',
  entered: 'bg-info',
  submitted: 'bg-warn',
  approved: 'bg-ok',
  rejected: 'bg-danger',
  cancelled: 'bg-line',
}

export const itemStatusLabel = (s: ItemStatus): string => i18n.t(`clinical.status.${s}`)
