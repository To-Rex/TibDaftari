/**
 * What each training task looks like in the checklist: its icon, the page it is done on, and the real names of
 * that page and of the button to press — a hint quotes the interface itself (`{{page}}` / `{{button}}`), so it reads
 * right in every language and cannot drift from the labels.
 */
import type { TFunction } from 'i18next'
import { BadgeCheck, CreditCard, FlaskConical, ListPlus, ReceiptText, SendHorizontal, UserPlus, type LucideIcon } from 'lucide-react'
import type { TrainingTaskKey } from '@/domain'
import { routes } from '@/shared/config/routes'

interface TaskMeta { icon: LucideIcon; to: string; page?: string; button?: string }

export const TASK_META: Record<TrainingTaskKey, TaskMeta> = {
  patient_create: { icon: UserPlus, to: routes.app.patients, page: 'nav.patients', button: 'staff.patients.new' },
  order_create: { icon: ReceiptText, to: routes.app.reception, page: 'nav.reception', button: 'staff.reception.newOrder' },
  order_add_item: { icon: ListPlus, to: routes.app.orders },
  payment_take: { icon: CreditCard, to: routes.app.orders, button: 'staff.reception.pay' },
  result_enter: { icon: FlaskConical, to: routes.app.lab, page: 'nav.lab', button: 'common.save' },
  result_submit: { icon: SendHorizontal, to: routes.app.lab, button: 'clinical.lab.submit' },
  result_approve: { icon: BadgeCheck, to: routes.app.confirm, page: 'nav.confirm', button: 'clinical.confirm.approve' },
}

/** A task the server knows and this build does not yet: shown by its key, never hidden (it still has to be done). */
const metaOf = (key: string): TaskMeta | undefined => (TASK_META as Record<string, TaskMeta | undefined>)[key]

export const taskIcon = (key: string): LucideIcon => metaOf(key)?.icon ?? BadgeCheck
export const taskRoute = (key: string): string => metaOf(key)?.to ?? routes.app.root
export const taskTitle = (t: TFunction, key: string): string => t(`training.tasks.${key}.title`, { defaultValue: key })
export const taskHint = (t: TFunction, key: string): string => {
  const m = metaOf(key)
  return t(`training.tasks.${key}.hint`, { defaultValue: '', page: m?.page ? t(m.page) : '', button: m?.button ? t(m.button) : '' })
}
