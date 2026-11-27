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

/** The very record a task is done on (ids of the employee's own sandbox): the page opens there, not at a list. */
export interface TrainingTarget {
  patientId?: Id | null
  orderId?: Id | null
  itemId?: Id | null
}

export interface TrainingTask {
  key: TrainingTaskKey
  done: boolean
  doneAt?: IsoDateTime | null
  /** false: there is nothing to practise it on in this facility — it does not hold the training back */
  available: boolean
  /** where to continue — only in the employee's own status, for a task that is still to do */
  target?: TrainingTarget | null
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
  /** a repeat they started themselves: they may leave it at any time */
  voluntary?: boolean
  /** only some tasks of the role were chosen for this round */
  partial?: boolean
  /** which time this is (1 = the first training) */
  attempt?: number
  /** every task the role has now — what a repeat can be made of (absent from an older API) */
  plan?: TrainingTaskKey[]
}

/** A colleague's training as a manager sees it: on their card and in the overview. */
export interface EmployeeTraining {
  state: TrainingState
  done: number
  total: number
  /** every task with its mark (for `pending`: the tasks the first sign-in will give); absent from an older API */
  tasks?: TrainingTask[]
  /** every task is done or cannot be done where they work — only «finish» is left */
  canComplete?: boolean
  /** in the training longer than the reminder threshold */
  stalled?: boolean
  startedAt?: IsoDateTime | null
  /** when they last did a task */
  lastTaskAt?: IsoDateTime | null
  completedAt?: IsoDateTime | null
  /** who let them through (state `skipped`) */
  completedByName?: string | null
  /** a repeat the employee started themselves (they may leave it; nobody is reminded about it) */
  voluntary?: boolean
  /** only some tasks of the role were chosen for this round */
  partial?: boolean
  /** which time this is (1 = the first training) */
  attempt?: number
  /** the manager who sent them (back); absent for the first training and for a repeat of their own */
  startedByName?: string | null
  /** every task the employee's role has now — what a manager chooses from when sending them (back) */
  plan?: TrainingTaskKey[]
}

/** What the overview can be narrowed to: `open` = in the training or not signed in yet; `stalled` = in it for
 *  longer than the reminder threshold; `ready` = every task done, «finish» not pressed. */
export type TrainingOverviewFilter = 'open' | 'active' | 'stalled' | 'ready' | 'pending' | 'passed' | 'skipped' | 'all'

export interface TrainingOverviewQuery {
  /** one unit and everything under it; omitted = the caller's whole scope (a superadmin: every company) */
  unitId?: Id | null
  state?: TrainingOverviewFilter
  search?: string
  page?: number
  pageSize?: number
  sortBy?: 'fullName' | 'startedAt' | 'completedAt' | 'lastLoginAt' | 'progress'
  sortDir?: 'asc' | 'desc'
}

/** One employee in the overview. */
export interface TrainingOverviewRow {
  id: Id
  fullName: string
  login: string
  avatarHue: number
  status: string
  roleId?: Id | null
  roleName?: string | null
  unitId?: Id | null
  unitName?: string | null
  lastLoginAt?: IsoDateTime | null
  training: EmployeeTraining
}

export type TrainingOverviewCounts = Record<'active' | 'stalled' | 'ready' | 'pending' | 'passed' | 'skipped', number>

export interface TrainingOverview {
  items: TrainingOverviewRow[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  /** how many people of the same scope and search stand where, whatever `state` narrows the page to */
  counts: TrainingOverviewCounts
  /** days after which someone still in the training counts as stalled (0 = the reminder is off) */
  stallDays: number
}
