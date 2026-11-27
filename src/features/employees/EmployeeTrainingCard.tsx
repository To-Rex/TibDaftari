/**
 * A colleague's mandatory training as a manager sees it: where they stand, WHICH tasks are done and which are not
 * (the same picture the employee has), and the two decisions — let them through without the tasks, or send them
 * (back) to practise. The server keeps the rules (never oneself, only inside one's scope, a role with nothing to
 * practise cannot be sent). `TrainingDetails` is the body — on the employee's card and in the overview's drawer.
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CalendarClock, Check, GraduationCap, Hourglass, ListChecks, Repeat2, RotateCcw, ShieldCheck, UserRound } from 'lucide-react'
import type { Employee, EmployeeTraining, Id, TrainingState } from '@/domain'
import { PlanPicker, WHOLE_PLAN, choiceValid, tasksOf, type PlanChoice } from '@/features/training/PlanPicker'
import { TaskMarkList, trainingDays } from '@/features/training/TaskMarks'
import { errorMessage } from '@/shared/lib/errors'
import { fmtDate, fmtRelative } from '@/shared/lib/format'
import { Badge, Button, Card, CardHeader, ConfirmDialog, Modal, toast, type Tone } from '@/shared/ui'
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
  // a repeat of their own: nobody is waiting for it
  if (training.state === 'active' && training.voluntary) return <Badge tone="info" dot size={size}>{t('training.admin.ownBadge')}</Badge>
  if (training.state === 'active' && training.stalled) return <Badge tone="danger" dot size={size}>{t('training.admin.stalledBadge')}</Badge>
  return <Badge tone={TONE[training.state]} dot size={size}>{t(`training.admin.state.${training.state}`)}</Badge>
}

export function TrainingDetails({ employeeId, name, training: tr, canWrite, isSelf, onChanged }: { employeeId: Id; name: string; training: EmployeeTraining; canWrite: boolean; isSelf: boolean; onChanged?: (e: Employee) => void }) {
  const { t } = useTranslation()
  const change = useEmployeeTraining()
  const [ask, setAsk] = useState<'skip' | 'reset' | null>(null)
  const [choice, setChoice] = useState<PlanChoice>(WHOLE_PLAN)
  const waiting = tr.state === 'active' || tr.state === 'pending'
  const own = tr.state === 'active' && !!tr.voluntary
  const percent = tr.total ? Math.round((tr.done / tr.total) * 100) : 0
  const tasks = tr.tasks ?? []
  const days = tr.state === 'active' ? trainingDays(tr.startedAt) : null
  // what the employee can be sent (back) to: the tasks their role has now (an older API: the ones on the row)
  const plan = tr.plan?.length ? tr.plan : tasks.map((x) => x.key as string)
  const attempt = tr.attempt ?? 1

  const run = async () => {
    if (!ask) return
    try {
      const e = await change.mutateAsync({ id: employeeId, action: ask, tasks: ask === 'reset' ? tasksOf(choice, plan) : undefined })
      toast.success(ask === 'reset' ? t('training.admin.resetDone') : own ? t('training.admin.stoppedOwn') : t('training.admin.skipped'))
      onChanged?.(e)
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setAsk(null)
    }
  }
  const openReset = () => { setChoice(WHOLE_PLAN); setAsk('reset') }

  return (
    <div data-employee-training={tr.state} data-own={own || undefined}>
      <p className="text-[13.5px] leading-relaxed text-ink-2">{own ? t('training.admin.descOwn') : t(`training.admin.desc.${tr.state}`)}</p>

      {/* what kind of round this is: which time, who started it, the whole plan or a part of it */}
      {tr.state !== 'exempt' && tr.state !== 'pending' && (attempt > 1 || tr.partial || tr.startedByName) && (
        <p className="mt-2 flex flex-wrap items-center gap-1.5" data-training-round={attempt}>
          {attempt > 1 && <Badge size="sm"><Repeat2 className="size-3" />{t('training.admin.attemptNote', { n: attempt })}</Badge>}
          {tr.partial && <Badge size="sm" tone="brand"><ListChecks className="size-3" />{t('training.admin.partialNote')}</Badge>}
          {tr.startedByName && <Badge size="sm"><UserRound className="size-3" />{t('training.admin.sentBy', { name: tr.startedByName })}</Badge>}
        </p>
      )}

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
          <p className="min-w-0 text-[13px] text-ink-3">{own ? t('training.admin.stopOwnHint') : waiting ? t('training.admin.skipHint') : t('training.admin.resetHint')}</p>
          <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
            {/* someone already in a training they were sent to can be given another plan */}
            {tr.state === 'active' && !own && plan.length > 0 && <Button variant="ghost" className="max-sm:w-full" data-training-replan leftIcon={<RotateCcw className="size-4" />} onClick={openReset}>{t('training.admin.changePlan')}</Button>}
            {waiting
              ? <Button variant="secondary" className="max-sm:w-full" data-training-skip leftIcon={<ShieldCheck className="size-4" />} onClick={() => setAsk('skip')}>{own ? t('training.admin.stopOwn') : t('training.admin.skip')}</Button>
              : <Button variant="secondary" className="max-sm:w-full" data-training-reset leftIcon={<RotateCcw className="size-4" />} onClick={openReset}>{t('training.admin.reset')}</Button>}
          </div>
        </div>
      )}

      <ConfirmDialog open={ask === 'skip'} onClose={() => setAsk(null)} onConfirm={run} loading={change.isPending}
        title={t(own ? 'training.admin.stopOwnConfirm' : 'training.admin.skipConfirm', { name })}
        description={own ? t('training.admin.stopOwnHint') : t('training.admin.skipHint')}
        confirmText={own ? t('training.admin.stopOwn') : t('training.admin.skip')} cancelText={t('common.cancel')} />

      {/* send (back) to the training: the whole plan as on the first day, or only what was forgotten */}
      <Modal open={ask === 'reset'} onClose={() => setAsk(null)} size="sm" title={t('training.admin.resetConfirm', { name })}
        footer={<>
          <Button variant="ghost" onClick={() => setAsk(null)}>{t('common.cancel')}</Button>
          <Button data-training-reset-go loading={change.isPending} disabled={!plan.length || !choiceValid(choice)} leftIcon={<GraduationCap className="size-4" />} onClick={() => void run()}>{t('training.admin.resetGo')}</Button>
        </>}>
        <div className="flex flex-col gap-3.5" data-training-reset-plan>
          <p className="text-[13.5px] leading-relaxed text-ink-2">{t('training.admin.resetIntro')}</p>
          {plan.length > 0
            ? <PlanPicker plan={plan} value={choice} onChange={setChoice} wholeHint={t('training.admin.resetWholeHint')} someHint={t('training.admin.resetSomeHint')} />
            : <p className="text-[13.5px] text-warn">{t('training.admin.noPlan')}</p>}
        </div>
      </Modal>
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
