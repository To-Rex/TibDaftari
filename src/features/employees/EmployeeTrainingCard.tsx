/**
 * A colleague's mandatory training on their card: where they stand, and a manager's two decisions — let them
 * through without the tasks, or send them (back) to practise. The server keeps the rules (never oneself, only
 * inside one's scope, a role with nothing to practise cannot be sent).
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { GraduationCap, RotateCcw, ShieldCheck } from 'lucide-react'
import type { Employee, EmployeeTraining, TrainingState } from '@/domain'
import { errorMessage } from '@/shared/lib/errors'
import { fmtDate } from '@/shared/lib/format'
import { Badge, Button, Card, CardHeader, ConfirmDialog, toast, type Tone } from '@/shared/ui'
import { useEmployeeTraining } from './queries'

const TONE: Record<TrainingState, Tone> = { active: 'warn', passed: 'ok', skipped: 'info', exempt: 'neutral', pending: 'neutral' }

/** The short mark for lists: only someone who is practising right now stands out. */
export function TrainingBadge({ training }: { training?: EmployeeTraining | null }) {
  const { t } = useTranslation()
  if (!training || training.state !== 'active') return null
  return <Badge tone="warn" size="sm"><GraduationCap className="size-3" />{t('training.admin.badge', { done: training.done, total: training.total })}</Badge>
}

export function EmployeeTrainingCard({ employee, canWrite, isSelf }: { employee: Employee; canWrite: boolean; isSelf: boolean }) {
  const { t } = useTranslation()
  const change = useEmployeeTraining()
  const [ask, setAsk] = useState<'skip' | 'reset' | null>(null)
  const tr = employee.training
  // an older API says nothing about the training; a superadmin never has one
  if (!tr || employee.isSuperAdmin) return null
  const waiting = tr.state === 'active' || tr.state === 'pending'
  const percent = tr.total ? Math.round((tr.done / tr.total) * 100) : 0

  const run = async () => {
    if (!ask) return
    try {
      await change.mutateAsync({ id: employee.id, action: ask })
      toast.success(ask === 'skip' ? t('training.admin.skipped') : t('training.admin.resetDone'))
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setAsk(null)
    }
  }

  return (
    <Card data-employee-training={tr.state}>
      <CardHeader title={<span className="flex items-center gap-2"><GraduationCap className="size-[18px] text-ink-3" />{t('training.admin.title')}</span>}
        actions={<Badge tone={TONE[tr.state]} dot>{t(`training.admin.state.${tr.state}`)}</Badge>} />
      <p className="text-[13.5px] leading-relaxed text-ink-2">{t(`training.admin.desc.${tr.state}`)}</p>
      {tr.state === 'active' && tr.total > 0 && (
        <div className="mt-3 max-w-sm">
          <p className="mb-1.5 text-[12.5px] text-ink-3">{t('training.admin.progress', { done: tr.done, total: tr.total })}</p>
          <div className="h-1.5 overflow-hidden rounded-full bg-surface-2"><div className="h-full rounded-full bg-warn" style={{ width: `${percent}%` }} /></div>
        </div>
      )}
      {(tr.state === 'passed' || tr.state === 'skipped') && tr.completedAt && (
        <p className="mt-2 text-[12.5px] text-ink-3 tabular">
          {fmtDate(tr.completedAt)}{tr.state === 'skipped' && tr.completedByName ? ` · ${t('training.admin.by', { name: tr.completedByName })}` : ''}
        </p>
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
        title={t(ask === 'reset' ? 'training.admin.resetConfirm' : 'training.admin.skipConfirm', { name: employee.fullName })}
        description={ask === 'reset' ? t('training.admin.resetHint') : t('training.admin.skipHint')}
        confirmText={ask === 'reset' ? t('training.admin.reset') : t('training.admin.skip')} cancelText={t('common.cancel')} />
    </Card>
  )
}
