/**
 * What each training task looks like in the checklist: its icon, the page it is done on, and the real names of
 * that page and of the button to press — a hint quotes the interface itself (`{{page}}` / `{{button}}`), so it reads
 * right in every language and cannot drift from the labels.
 *
 * A task also knows WHERE it is done: `taskPlace` turns the record the server names (`task.target` — the patient,
 * the cheque, the analysis of the employee's own sandbox) into the address of that very record, and `point` names
 * the control to press there (its `data-tour` mark), so the page can show it.
 */
import type { TFunction } from 'i18next'
import { BadgeCheck, CreditCard, FlaskConical, ListPlus, ReceiptText, SendHorizontal, UserPlus, type LucideIcon } from 'lucide-react'
import type { TrainingTarget, TrainingTask, TrainingTaskKey } from '@/domain'
import { routes } from '@/shared/config/routes'

interface TaskMeta {
  icon: LucideIcon
  /** the page of the task — where it leads when no record is known */
  to: string
  page?: string
  button?: string
  /** the record's own address, when the server named one */
  at?: (target: TrainingTarget) => string | undefined
  /** the control to press there */
  point?: string
}

/** address parameters the pages understand: open the patient form / pick this patient / open the payment window */
export const NEW_PARAM = 'new'
export const PATIENT_PARAM = 'patient'
export const PAY_PARAM = 'pay'

const withPatient = (t: TrainingTarget) => (t.patientId ? `${routes.app.reception}?${PATIENT_PARAM}=${t.patientId}` : undefined)

export const TASK_META: Record<TrainingTaskKey, TaskMeta> = {
  patient_create: { icon: UserPlus, to: `${routes.app.patients}?${NEW_PARAM}=1`, page: 'nav.patients', button: 'staff.patients.new' },
  order_create: { icon: ReceiptText, to: routes.app.reception, page: 'nav.reception', button: 'staff.reception.newOrder', at: withPatient, point: 'reception-new-order' },
  // without a cheque of their own yet, the step before it: the patient to open one for. (The cheque page answers
  // `pay` itself: the payment window when there is something to pay, else it shows where a service is added.)
  order_add_item: { icon: ListPlus, to: routes.app.reception, at: (t) => (t.orderId ? routes.app.order(t.orderId) : withPatient(t)), point: 'order-add' },
  payment_take: { icon: CreditCard, to: routes.app.reception, button: 'staff.reception.pay', at: (t) => (t.orderId ? `${routes.app.order(t.orderId)}?${PAY_PARAM}=1` : withPatient(t)) },
  result_enter: { icon: FlaskConical, to: routes.app.lab, page: 'nav.lab', button: 'common.save', at: (t) => (t.itemId ? routes.app.labItem(t.itemId) : undefined), point: 'labItem-form' },
  result_submit: { icon: SendHorizontal, to: routes.app.lab, button: 'clinical.lab.submit', at: (t) => (t.itemId ? routes.app.labItem(t.itemId) : undefined), point: 'labItem-submit' },
  result_approve: { icon: BadgeCheck, to: routes.app.confirm, page: 'nav.confirm', button: 'clinical.confirm.approve', at: (t) => (t.itemId ? `${routes.app.confirm}?item=${t.itemId}` : undefined), point: 'confirm-approve' },
}

/** A task the server knows and this build does not yet: shown by its key, never hidden (it still has to be done). */
const metaOf = (key: string): TaskMeta | undefined => (TASK_META as Record<string, TaskMeta | undefined>)[key]

export const taskIcon = (key: string): LucideIcon => metaOf(key)?.icon ?? BadgeCheck
export const taskRoute = (key: string): string => metaOf(key)?.to ?? routes.app.root
/** Where a task is continued: the record itself when the server named one, else the page of the task; with the
 *  control to press there (when the page is the record's own — a list has no such control). */
export const taskPlace = (task: Pick<TrainingTask, 'key' | 'target'>): { to: string; point?: string } => {
  const m = metaOf(task.key)
  const exact = task.target ? m?.at?.(task.target) : undefined
  if (exact) return { to: exact, point: task.target?.patientId && !task.target.orderId && !task.target.itemId ? 'reception-new-order' : m?.point }
  return { to: taskRoute(task.key) }
}
export const taskTitle = (t: TFunction, key: string): string => t(`training.tasks.${key}.title`, { defaultValue: key })
export const taskHint = (t: TFunction, key: string): string => {
  const m = metaOf(key)
  return t(`training.tasks.${key}.hint`, { defaultValue: '', page: m?.page ? t(m.page) : '', button: m?.button ? t(m.button) : '' })
}
