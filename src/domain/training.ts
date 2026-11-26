import type { Id, IsoDateTime } from './common'

/* ------------------------------------------------------------------
   The mandatory training of a new employee («o‘quv rejimi»).
   While `active`, every request of the employee works in the server's sandbox: nothing they register reaches the
   real data and nothing real is shown to them. It ends when every task of their role is done (they press
   «finish») or a manager lets them through.
------------------------------------------------------------------- */

export type TrainingTaskKey =
  | 'patient_create'
  | 'order_create'
  | 'order_add_item'
  | 'payment_take'
  | 'result_enter'
  | 'result_submit'
  | 'result_approve'

/** active — still learning; passed — did every task; skipped — let through by a manager; exempt — never needed it;
 *  pending — has not signed in yet (only ever reported for a colleague). */
export type TrainingState = 'active' | 'passed' | 'skipped' | 'exempt' | 'pending'

export interface TrainingTask {
  key: TrainingTaskKey
  done: boolean
  doneAt?: IsoDateTime | null
  /** false: there is nothing to practise it on in this facility — it does not hold the training back */
  available: boolean
}

/** The signed-in employee's own training. */
export interface TrainingStatus {
  state: TrainingState
  active: boolean
  tasks: TrainingTask[]
  done: number
  total: number
  /** every task is done (or cannot be done here): «finish» will be accepted */
  canComplete: boolean
  startedAt?: IsoDateTime | null
  completedAt?: IsoDateTime | null
  /** the facility whose sandbox holds the practice samples */
  unitId?: Id | null
  unitName?: string | null
}

/** A colleague's training on their card (admin panel). */
export interface EmployeeTraining {
  state: TrainingState
  done: number
  total: number
  startedAt?: IsoDateTime | null
  completedAt?: IsoDateTime | null
  /** who let them through (state `skipped`) */
  completedByName?: string | null
}
