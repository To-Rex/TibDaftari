/**
 * A colleague's mandatory training as a manager sees it: where they stand, WHICH tasks are done and which are not
 * (the same picture the employee has), and the two decisions — let them through without the tasks, or send them
 * (back) to practise. The server keeps the rules (never oneself, only inside one's scope, a role with nothing to
 * practise cannot be sent). `TrainingDetails` is the body — on the employee's card and in the overview's drawer.
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CalendarClock, Check, GraduationCap, Hourglass, RotateCcw, ShieldCheck } from 'lucide-react'
import type { Employee, EmployeeTraining, Id, TrainingState } from '@/domain'
import { TaskMarkList, trainingDays } from '@/features/training/TaskMarks'
import { errorMessage } from '@/shared/lib/errors'
import { fmtDate, fmtRelative } from '@/shared/lib/format'
import { Badge, Button, Card, CardHeader, ConfirmDialog, toast, type Tone } from '@/shared/ui'
import { useEmployeeTraining } from './queries'

const TONE: Record<TrainingState, Tone> = { active: 'warn', passed: 'ok', skipped: 'info', exempt: 'neutral', pending: 'neutral' }

/** The short mark for lists: only someone who is practising right now stands out. */
export function TrainingBadge({ training }: { training?: EmployeeTraining | null }) {
  const { t } = useTranslation()
  if (!training || training.state !== 'active') return null
  return <Badge tone="warn" size="sm"><GraduationCap className="size-3" />{t('training.admin.badge', { done: training.done, total: training.total })}</Badge>
}

/** The state in one badge, with what a manager most needs to know about it: stuck, or only «finish» left. */
export function TrainingStateBadge({ training, size }: { training: EmployeeTraining; size?: 'sm' | 'md' }) {
  const { t } = useTranslation()
  if (training.state === 'active' && training.canComplete) return <Badge tone="ok" dot size={size}>{t('training.admin.readyBadge')}</Badge>
  if (training.state === 'active' && training.stalled) return <Badge tone="danger" dot size={size}>{t('training.admin.stalledBadge')}</Badge>
  return <Badge tone={TONE[training.state]} dot size={size}>{t(`training.admin.state.${training.state}`)}</Badge>
}

export function TrainingDetails({ employeeId, name, training: tr, canWrite, isSelf, onChanged }: { employeeId: Id; name: string; training: EmployeeTraining; canWrite: boolean; isSelf: boolean; onChanged?: (e: Employee) => void }) {
  const { t } = useTranslation()
  const change = useEmployeeTraining()
  const [ask, setAsk] = useState<'skip' | 'reset' | null>(null)
  const waiting = tr.state === 'active' || tr.state === 'pending'
  const percent = tr.total ? Math.round((tr.done / tr.total) * 100) : 0
  const tasks = tr.tasks ?? []
  const days = tr.state === 'active' ? trainingDays(tr.startedAt) : null

  const run = async () => {
    if (!ask) return
    try {
      const e = await change.mutateAsync({ id: employeeId, action: ask })
      toast.success(ask === 'skip' ? t('training.admin.skipped') : t('training.admin.resetDone'))
      onChanged?.(e)
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setAsk(null)
    }
  }

  return (
    <div data-employee-training={tr.state}>
      <p className="text-[13.5px] leading-relaxed text-ink-2">{t(`training.admin.desc.${tr.state}`)}</p>

      {tr.state === 'active' && (
        <div className="mt-3 flex flex-col gap-2">
          {tr.total > 0 && (
            <div className="max-w-sm">
              <p className="mb-1.5 text-[12.5px] text-ink-3">{t('training.admin.progress', { done: tr.done, total: tr.total })}</p>
              <div className="h-1.5 overflow-hidden rounded-full bg-surface-2"><div className={tr.canComplete ? 'h-full rounded-full bg-ok' : 'h-full rounded-full bg-warn'} style={{ width: `${percent}%` }} /></div>
            </div>
          )}
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] text-ink-3">
            {days !== null && (
              <span className={tr.stalled ? 'inline-flex items-center gap-1.5 font-medium text-danger' : 'inline-flex items-center gap-1.5'} data-training-days={days}>
                <Hourglass className="size-3.5 shrink-0" />{days > 0 ? t('training.admin.daysIn', { n: days }) : t('training.admin.startedToday')}
              </span>
            )}
            {tr.lastTaskAt && <span className="inline-flex items-center gap-1.5"><CalendarClock className="size-3.5 shrink-0" />{t('training.admin.lastTask')}: {fmtRelative(tr.lastTaskAt)}</span>}
          </p>
          {tr.canComplete && <p className="flex items-start gap-1.5 text-[13px] text-ok" data-training-ready><Check className="mt-0.5 size-4 shrink-0" />{t('training.admin.readyHint')}</p>}
        </div>
      )}

      {(tr.state === 'passed' || tr.state === 'skipped') && tr.completedAt && (
        <p className="mt-2 text-[12.5px] text-ink-3 tabular">
          {fmtDate(tr.completedAt)}{tr.state === 'skipped' && tr.completedByName ? ` · ${t('training.admin.by', { name: tr.completedByName })}` : ''}
        </p>
      )}

      {tasks.length > 0 && tr.state !== 'exempt' && (
        <div className="mt-4">
          <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.06em] text-ink-3">
            {tr.state === 'pending' ? t('training.admin.tasksComing') : tr.state === 'active' ? t('training.admin.tasksLeft', { n: tasks.filter((x) => !x.done && x.available !== false).length }) : t('training.admin.tasksTitle')}
          </p>
          <TaskMarkList tasks={tasks} planned={tr.state === 'pending'} />
        </div>
      )}

      {canWrite && !isSelf && (
        <div className="mt-4 flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="min-w-0 text-[13px] text-ink-3">{waiting ? t('training.admin.skipHint') : t('training.admin.resetHint')}</p>
          {waiting
            ? <Button variant="secondary" className="shrink-0 max-sm:w-full" data-training-skip leftIcon={<ShieldCheck className="size-4" />} onClick={() => setAsk('skip')}>{t('training.admin.skip')}</Button>
            : <Button variant="secondary" className="shrink-0 max-sm:w-full" data-training-reset leftIcon={<RotateCcw className="size-4" />} onClick={() => setAsk('reset')}>{t('training.admin.reset')}</Button>}
        </div>
      )}
      <ConfirmDialog open={ask !== null} onClose={() => setAsk(null)} onConfirm={run} loading={change.isPending}
        title={t(ask === 'reset' ? 'training.admin.resetConfirm' : 'training.admin.skipConfirm', { name })}
        description={ask === 'reset' ? t('training.admin.resetHint') : t('training.admin.skipHint')}
        confirmText={ask === 'reset' ? t('training.admin.reset') : t('training.admin.skip')} cancelText={t('common.cancel')} />
    </div>
  )
}

export function EmployeeTrainingCard({ employee, canWrite, isSelf }: { employee: Employee; canWrite: boolean; isSelf: boolean }) {
  const { t } = useTranslation()
  const tr = employee.training
  // an older API says nothing about the training; a superadmin never has one
  if (!tr || employee.isSuperAdmin) return null
  return (
    <Card>
      <CardHeader title={<span className="flex items-center gap-2"><GraduationCap className="size-[18px] text-ink-3" />{t('training.admin.title')}</span>}
        actions={<TrainingStateBadge training={tr} />} />
      <TrainingDetails employeeId={employee.id} name={employee.fullName} training={tr} canWrite={canWrite} isSelf={isSelf} />
    </Card>
  )
}
