/**
 * The training as the employee sees it: a banner under the top bar («O‘quv rejimi» — nothing here is real, the
 * next task), the checklist drawer with a way to each task's page, and the moment it ends. Rendered by the staff
 * shell for everyone; it shows nothing unless the session is in the training or has just left / entered it.
 */
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useMutation } from '@tanstack/react-query'
import { ArrowRight, Check, CircleSlash, GraduationCap, ListChecks, MapPin, PartyPopper } from 'lucide-react'
import type { Id, TrainingStatus, TrainingTask } from '@/domain'
import { repos } from '@/data'
import { onRealmChange, setStaffTraining, useAuth, useInTraining } from '@/features/auth/store'
import { cn } from '@/shared/lib/cn'
import { errorMessage } from '@/shared/lib/errors'
import { Button, Drawer, Modal, toast } from '@/shared/ui'
import { taskHint, taskIcon, taskRoute, taskTitle } from './tasks'
import { useTrainingPanel, useTrainingStatus } from './useTraining'

type Notice = 'finished' | 'released' | 'started' | null

const nextTask = (s: TrainingStatus | undefined): TrainingTask | undefined => s?.tasks.find((x) => !x.done && x.available)

/** The chip in the top bar: always in sight while the page scrolls. */
export function TrainingChip() {
  const { t } = useTranslation()
  const active = useInTraining()
  const setOpen = useTrainingPanel((s) => s.setOpen)
  if (!active) return null
  return (
    <button type="button" data-training-chip onClick={() => setOpen(true)} title={t('training.mode')}
      className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full bg-warn-soft px-2.5 text-[12px] font-semibold uppercase tracking-[0.04em] text-warn ring-1 ring-warn/25 transition-colors hover:ring-warn/50">
      <GraduationCap className="size-3.5" />
      <span className="max-xs:hidden">{t('training.chip')}</span>
    </button>
  )
}

export function TrainingCenter({ module, unitId, ready }: { module: 'staff' | 'admin'; unitId: Id | null; ready: boolean }) {
  const { t } = useTranslation()
  const nav = useNavigate()
  const active = useInTraining()
  const employeeId = useAuth((s) => s.staff?.employeeId)
  const { open, setOpen } = useTrainingPanel()
  const status = useTrainingStatus(unitId, ready)
  const [notice, setNotice] = useState<Notice>(null)
  // what the closing dialog still says while it fades out
  const lastNotice = useRef<Notice>(null)
  if (notice) lastNotice.current = notice
  const said = notice ?? lastNotice.current
  const finishing = useRef(false)

  // the realm changed under the session: by the employee's own «finish», or by a manager elsewhere
  useEffect(() => onRealmChange((training) => {
    setOpen(false)
    setNotice(training ? 'started' : finishing.current ? 'finished' : 'released')
    finishing.current = false
  }), [setOpen])
  // another person signed in on this browser: nothing of the previous one's training is left on screen
  useEffect(() => { setNotice(null); setOpen(false) }, [employeeId, setOpen])

  // a task just got done: say so once
  const data = active ? status.data : undefined
  const seen = useRef<{ who?: string; done: Set<string> } | null>(null)
  useEffect(() => {
    if (!data || !data.active) { seen.current = null; return }
    const done = new Set(data.tasks.filter((x) => x.done).map((x) => x.key as string))
    const before = seen.current
    seen.current = { who: employeeId, done }
    if (!before || before.who !== employeeId) return
    const fresh = [...done].filter((k) => !before.done.has(k))
    if (!fresh.length) return
    if (data.canComplete) toast.success(t('training.allDone'))
    else toast.success(t('training.taskDone'), fresh.map((k) => taskTitle(t, k)).join(', '))
  }, [data, employeeId, t])

  const complete = useMutation({
    mutationFn: () => { finishing.current = true; return repos.training.complete(unitId) },
    // (the answer's `X-Training` has usually said it already; an API in between that drops the header must not matter)
    onSuccess: (out) => { if (!out.active) setStaffTraining(false) },
    onError: (e) => { finishing.current = false; toast.error(errorMessage(e)); void status.refetch() },
  })
  // the server says the training is over (the role changed, a manager let them through) while the session still thinks otherwise
  const over = active && !!status.data && !status.data.active && !status.isFetching
  useEffect(() => { if (over) setStaffTraining(false) }, [over])

  const next = nextTask(data)
  const go = (task: TrainingTask) => { setOpen(false); nav(taskRoute(task.key)) }
  const percent = data && data.total ? Math.round((data.done / data.total) * 100) : 0

  return (
    <>
      {active && (
        <div data-training-bar className="border-b border-warn/25 bg-warn-soft/70 px-3 py-2 sm:px-6">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <span className="inline-flex items-center gap-2 text-[13px] font-semibold text-warn">
              <GraduationCap className="size-4 shrink-0" />
              <span className="uppercase tracking-[0.04em]">{t('training.mode')}</span>
            </span>
            <span className="min-w-0 flex-1 text-[13px] text-ink-2 max-sm:basis-full">
              {module === 'admin' ? t('training.barAdmin') : t('training.barText')}
            </span>
            {data && (
              <div className="flex min-w-0 items-center gap-2 max-sm:basis-full">
                {next ? (
                  <button type="button" onClick={() => go(next)} className="group inline-flex min-w-0 items-center gap-1.5 rounded-full bg-surface px-3 py-1 text-[12.5px] font-medium text-ink shadow-1 ring-1 ring-line hover:ring-warn/50">
                    <span className="shrink-0 text-ink-3">{t('training.next')}:</span>
                    <span className="truncate">{taskTitle(t, next.key)}</span>
                    <ArrowRight className="size-3.5 shrink-0 text-warn transition-transform group-hover:translate-x-0.5" />
                  </button>
                ) : data.canComplete ? (
                  <span className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-ok"><Check className="size-3.5" />{t('training.ready')}</span>
                ) : null}
                <Button size="xs" variant={data.canComplete ? 'primary' : 'secondary'} className="shrink-0" leftIcon={<ListChecks className="size-3.5" />} onClick={() => setOpen(true)}>
                  {t('training.tasksButton')} · <span className="tabular">{data.done}/{data.total}</span>
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      <Drawer open={open && active} onClose={() => setOpen(false)} width="max-w-md"
        title={<span className="flex items-center gap-2"><GraduationCap className="size-5 text-warn" />{t('training.title')}</span>}
        footer={data && (
          <div className="flex w-full flex-col gap-2">
            <p className={cn('text-[12.5px]', data.canComplete ? 'text-ink-2' : 'text-ink-3')}>{data.canComplete ? t('training.finishReady') : t('training.finishHint')}</p>
            <Button block data-training-finish disabled={!data.canComplete} loading={complete.isPending} leftIcon={<Check className="size-4" />} onClick={() => complete.mutate()}>{t('training.finish')}</Button>
          </div>
        )}>
        <div className="flex flex-col gap-4">
          <div className="rounded-[var(--radius)] bg-warn-soft/60 p-3.5 text-[13.5px] leading-relaxed text-ink-2 ring-1 ring-warn/20">
            <p>{t('training.intro')}</p>
            <p className="mt-2 font-medium text-ink">{t('training.introGoal')}</p>
          </div>
          {data?.unitName && (
            <p className="flex items-center gap-1.5 text-[13px] text-ink-3"><MapPin className="size-3.5 shrink-0" />{t('training.place')}: <span className="font-medium text-ink-2">{data.unitName}</span></p>
          )}
          {data && (
            <div>
              <div className="mb-1.5 flex items-center justify-between text-[12.5px] text-ink-3">
                <span>{t('training.progress', { done: data.done, total: data.total })}</span>
                <span className="tabular">{percent}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-surface-2"><div className="h-full rounded-full bg-ok transition-[width] duration-500" style={{ width: `${percent}%` }} /></div>
            </div>
          )}
          <ol className="flex flex-col gap-2">
            {(data?.tasks ?? []).map((task, i) => {
              const Icon = taskIcon(task.key)
              const hint = taskHint(t, task.key)
              return (
                <li key={task.key} data-training-task={task.key} data-done={task.done || undefined}
                  className={cn('flex items-start gap-3 rounded-[var(--radius)] border p-3', task.done ? 'border-ok/25 bg-ok-soft/40' : task.available ? 'border-line bg-surface' : 'border-dashed border-line bg-surface-2/40')}>
                  <span className={cn('mt-0.5 grid size-8 shrink-0 place-items-center rounded-full text-[13px] font-semibold', task.done ? 'bg-ok text-white' : task.available ? 'bg-surface-2 text-ink-2' : 'bg-surface-2 text-ink-3')}>
                    {task.done ? <Check className="size-4" /> : task.available ? i + 1 : <CircleSlash className="size-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className={cn('flex items-center gap-1.5 text-[14px] font-medium', task.done && 'text-ink-2', !task.done && !task.available && 'text-ink-3')}>
                      <Icon className="size-4 shrink-0 text-ink-3" />
                      <span className="min-w-0 break-words">{taskTitle(t, task.key)}</span>
                    </p>
                    {task.done ? <p className="mt-0.5 text-[12.5px] text-ok">{t('training.done')}</p>
                      : !task.available ? <p className="mt-0.5 text-[12.5px] text-ink-3">{t('training.unavailable')}</p>
                      : hint && <p className="mt-0.5 text-[12.5px] leading-snug text-ink-3">{hint}</p>}
                  </div>
                  {!task.done && task.available && <Button size="xs" variant="soft" className="shrink-0" rightIcon={<ArrowRight className="size-3.5" />} onClick={() => go(task)}>{t('training.go')}</Button>}
                </li>
              )
            })}
          </ol>
        </div>
      </Drawer>

      <Modal open={notice !== null} onClose={() => setNotice(null)} size="sm" hideClose
        title={said === 'finished' ? t('training.finishedTitle') : said === 'released' ? t('training.releasedTitle') : t('training.startedTitle')}
        footer={<Button data-training-notice-ok onClick={() => { const n = notice; setNotice(null); if (n === 'started') setOpen(true) }}>{said === 'started' ? t('training.ok') : t('training.start')}</Button>}>
        <div className="flex items-start gap-3" data-training-notice={said ?? undefined}>
          <span className={cn('grid size-10 shrink-0 place-items-center rounded-full', said === 'started' ? 'bg-warn-soft text-warn' : 'bg-ok-soft text-ok')}>
            {said === 'started' ? <GraduationCap className="size-5" /> : <PartyPopper className="size-5" />}
          </span>
          <p className="text-[14px] leading-relaxed text-ink-2">{said === 'finished' ? t('training.finishedBody') : said === 'released' ? t('training.releasedBody') : t('training.startedBody')}</p>
        </div>
      </Modal>
    </>
  )
}
