/**
 * A colleague's tasks as a manager reads them: which are done (and when), which are still to do, and which cannot
 * be practised where the employee works (those do not hold the training back). The list for a card or a drawer,
 * the dots for a table row.
 */
import { useTranslation } from 'react-i18next'
import { Check, CircleSlash } from 'lucide-react'
import type { TrainingTask } from '@/domain'
import { cn } from '@/shared/lib/cn'
import { fmtDateTime } from '@/shared/lib/format'
import { taskIcon, taskTitle } from './tasks'

/** Whole days since the training started (0 on the first day). */
export const trainingDays = (startedAt?: string | null): number | null => {
  if (!startedAt) return null
  const ms = Date.now() - new Date(startedAt).getTime()
  return Number.isFinite(ms) ? Math.max(0, Math.floor(ms / 86_400_000)) : null
}

type Mark = 'done' | 'todo' | 'off'
const markOf = (task: TrainingTask): Mark => (task.done ? 'done' : task.available === false ? 'off' : 'todo')

/** `planned`: the tasks are still to be given (the employee has not signed in yet) — nothing is «not done». */
export function TaskMarkList({ tasks, planned, className }: { tasks: TrainingTask[]; planned?: boolean; className?: string }) {
  const { t } = useTranslation()
  if (!tasks.length) return null
  return (
    <ol className={cn('flex flex-col gap-1.5', className)} data-training-marks>
      {tasks.map((task, i) => {
        const mark = markOf(task)
        const Icon = taskIcon(task.key)
        return (
          <li key={task.key} data-task={task.key} data-mark={planned ? 'planned' : mark}
            className={cn('flex items-center gap-3 rounded-[var(--radius)] border px-3 py-2', mark === 'done' ? 'border-ok/25 bg-ok-soft/40' : mark === 'off' ? 'border-dashed border-line bg-surface-2/40' : 'border-line bg-surface')}>
            <span className={cn('grid size-7 shrink-0 place-items-center rounded-full text-[12px] font-semibold', mark === 'done' ? 'bg-ok text-white' : 'bg-surface-2 text-ink-3')}>
              {mark === 'done' ? <Check className="size-3.5" /> : mark === 'off' ? <CircleSlash className="size-3.5" /> : i + 1}
            </span>
            <span className="min-w-0 flex-1">
              <span className={cn('flex items-center gap-1.5 text-[13.5px] font-medium', mark === 'off' && 'text-ink-3')}>
                <Icon className="size-4 shrink-0 text-ink-3" />
                <span className="min-w-0 break-words">{taskTitle(t, task.key)}</span>
              </span>
              {mark === 'off' && <span className="mt-0.5 block text-[12px] text-ink-3">{t('training.admin.taskOff')}</span>}
            </span>
            {!planned && (
              <span className={cn('shrink-0 text-right text-[12px]', mark === 'done' ? 'text-ok' : mark === 'todo' ? 'font-medium text-warn' : 'text-ink-3')}>
                {mark === 'done' ? (task.doneAt ? <span className="tabular">{fmtDateTime(task.doneAt)}</span> : t('training.done')) : mark === 'todo' ? t('training.admin.taskTodo') : '—'}
              </span>
            )}
          </li>
        )
      })}
    </ol>
  )
}

/** One dot per task, in the order they are practised — a row's progress at a glance (each dot names its task). */
export function TaskDots({ tasks, planned }: { tasks: TrainingTask[]; planned?: boolean }) {
  const { t } = useTranslation()
  return (
    <span className="inline-flex items-center gap-1" data-training-dots>
      {tasks.map((task) => {
        const mark = markOf(task)
        const state = planned ? '' : mark === 'done' ? t('training.done') : mark === 'todo' ? t('training.admin.taskTodo') : t('training.admin.taskOff')
        return (
          <span key={task.key} title={state ? `${taskTitle(t, task.key)} — ${state}` : taskTitle(t, task.key)}
            className={cn('grid size-[18px] place-items-center rounded-full', mark === 'done' ? 'bg-ok text-white' : mark === 'off' ? 'border border-dashed border-line-strong' : planned ? 'border border-line-strong' : 'border-[1.5px] border-warn/70 bg-warn-soft')}>
            {mark === 'done' && <Check className="size-3" strokeWidth={3} />}
          </span>
        )
      })}
    </span>
  )
}
