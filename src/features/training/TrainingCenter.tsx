/**
 * The training as the employee sees it: a banner under the top bar («O‘quv rejimi» — nothing here is real, the
 * next task), the checklist drawer with a way to the very record each task is done on, a reminder of what is left
 * at every sign-in, and the moment it ends. Rendered by the staff shell for everyone; it shows nothing unless the
 * session is in the training or has just left / entered it.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowRight, Check, CircleSlash, GraduationCap, ListChecks, LogOut, MapPin, PartyPopper, RotateCcw, TriangleAlert } from 'lucide-react'
import type { Id, TrainingStatus, TrainingTask } from '@/domain'
import { repos } from '@/data'
import { onRealmChange, setStaffTraining, useAuth, useInTraining } from '@/features/auth/store'
import { useTour } from '@/features/tour'
import { cn } from '@/shared/lib/cn'
import { errorMessage } from '@/shared/lib/errors'
import { storage } from '@/shared/lib/storage'
import { Button, ConfirmDialog, Drawer, Modal, Skeleton, toast } from '@/shared/ui'
import { PlanPicker, WHOLE_PLAN, choiceValid, tasksOf, type PlanChoice } from './PlanPicker'
import { pointAt } from './point'
import { taskHint, taskIcon, taskPlace, taskTitle, toursOf } from './tasks'
import { trainingKeys, useTrainingPanel, useTrainingStatus } from './useTraining'

type Notice = 'finished' | 'released' | 'started' | null

const nextTask = (s: TrainingStatus | undefined): TrainingTask | undefined => s?.tasks.find((x) => !x.done && x.available)

/**
 * «You still have tasks» is said once per sign-in — and once a day to someone who never signs out. Remembered per
 * employee in this browser as the sign-in (the end of its token, never the token) and the day.
 */
const REMINDED_KEY = 'clinic.training.reminded'
const visitOf = (token: string) => `${token.slice(-16)}|${new Date().toLocaleDateString('en-CA')}`
const wasReminded = (who: string, token: string) => storage.get<Record<string, string>>(REMINDED_KEY, {})[who] === visitOf(token)
const markReminded = (who: string, token: string) => storage.set(REMINDED_KEY, { ...storage.get<Record<string, string>>(REMINDED_KEY, {}), [who]: visitOf(token) })
const forgetReminded = (who: string) => { const all = storage.get<Record<string, string>>(REMINDED_KEY, {}); delete all[who]; storage.set(REMINDED_KEY, all) }

/**
 * A round of the training is known by the moment it started. The first time this browser sees a REPEAT (the second
 * round or later), the guided tours are shown again — all of them for the whole plan («as on the first day»), the
 * tours of the chosen tasks' pages for a partial one. Remembered per employee, so it happens once per round.
 */
const ROUND_KEY = 'clinic.training.round'
const roundSeen = (who: string) => storage.get<Record<string, string>>(ROUND_KEY, {})[who]
const markRound = (who: string, startedAt: string) => storage.set(ROUND_KEY, { ...storage.get<Record<string, string>>(ROUND_KEY, {}), [who]: startedAt })

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
  const token = useAuth((s) => s.staff?.accessToken)
  const tour = useTour()
  const qc = useQueryClient()
  const { open, setOpen, repeat, setRepeat } = useTrainingPanel()
  const status = useTrainingStatus(unitId, ready)
  const [notice, setNotice] = useState<Notice>(null)
  // what the closing dialog still says while it fades out
  const lastNotice = useRef<Notice>(null)
  if (notice) lastNotice.current = notice
  const said = notice ?? lastNotice.current
  const finishing = useRef(false)
  // the realm is about to change by the employee's own doing: they started a repeat, or they are leaving one
  const mine = useRef<'start' | 'leave' | null>(null)
  const [askLeave, setAskLeave] = useState(false)
  const tRef = useRef(t)
  tRef.current = t

  // what is left, said at the sign-in
  const [remind, setRemind] = useState(false)
  const who = useRef({ employeeId, token })
  who.current = { employeeId, token }

  // the realm changed under the session: by the employee's own «finish», or by a manager elsewhere
  useEffect(() => onRealmChange((training) => {
    const own = mine.current
    mine.current = null
    setOpen(false)
    setRemind(false)
    setRepeat(false)
    setAskLeave(false)
    if (training) {
      // sent by a manager: «you were moved to the training». Their own choice needs no telling — the checklist opens
      if (own !== 'start') setNotice('started')
    } else if (own === 'leave') {
      toast.info(tRef.current('training.repeat.left'), tRef.current('training.repeat.leftBody'))
    } else {
      setNotice(finishing.current ? 'finished' : 'released')
    }
    finishing.current = false
    // «you were sent to the training» has just said it: no second window about the same thing
    const { employeeId: id, token: tk } = who.current
    if (training && id && tk) markReminded(id, tk)
  }), [setOpen, setRepeat])
  // another person signed in on this browser: nothing of the previous one's training is left on screen
  useEffect(() => { setNotice(null); setOpen(false); setRemind(false); setRepeat(false); setAskLeave(false) }, [employeeId, setOpen, setRepeat])

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

  // ---- again, by one's own wish ---------------------------------------------------------------------------------
  // what a repeat can be made of: the checklist knows it while in the training; otherwise it is asked for when the
  // window opens
  const offer = useQuery({ queryKey: ['training', 'plan', unitId], queryFn: () => repos.training.status(unitId), enabled: repeat && !active && ready, staleTime: 0, gcTime: 0 })
  const plan = (active ? data?.plan : offer.data?.plan) ?? []
  const planKnown = active ? !!data : offer.isFetched
  // a training one was sent to (the first one, or by a manager) is not one's own to shorten or to leave
  const mandatory = active && !data?.voluntary
  const [choice, setChoice] = useState<PlanChoice>(WHOLE_PLAN)
  useEffect(() => { if (repeat) setChoice(WHOLE_PLAN) }, [repeat])
  // (the answer's `X-Training` flips the realm before the promise resolves — what was true when it was asked is kept)
  const fromReal = useRef(false)
  const again = useMutation({
    mutationFn: (tasks?: string[]) => { fromReal.current = !active; if (!active) mine.current = 'start'; return repos.training.restart(unitId, tasks) },
    onSuccess: (out) => {
      const fresh = fromReal.current
      mine.current = null
      setRepeat(false)
      if (out.active) setStaffTraining(true)
      void qc.invalidateQueries({ queryKey: trainingKeys.all })
      toast.success(fresh ? t('training.repeat.started') : t('training.repeat.againDone'))
      // the whole plan of a repeat is taught as on the first day: the tours come back by themselves, then «what is
      // to do» is said. A few chosen tasks — or the same tasks started over — go straight to the checklist.
      if (out.active && !out.partial && (out.attempt ?? 1) > 1 && employeeId) forgetReminded(employeeId)
      else setOpen(true)
    },
    onError: (e) => { mine.current = null; toast.error(errorMessage(e)) },
  })
  const leaving = useMutation({
    mutationFn: () => { mine.current = 'leave'; return repos.training.leave() },
    onSuccess: (out) => { if (!out.active) setStaffTraining(false); setAskLeave(false) },
    onError: (e) => { mine.current = null; setAskLeave(false); toast.error(errorMessage(e)); void status.refetch() },
  })

  // a repeat teaches again: the tours come back — all of them for the whole plan, those of the chosen tasks' pages
  // otherwise (once per round in this browser)
  const round = data?.active ? data.startedAt ?? null : null
  const repeated = (data?.attempt ?? 1) > 1
  const partial = !!data?.partial
  const roundTasks = data?.active ? data.tasks.map((x) => x.key).join(',') : ''
  const replay = tour.replay
  useEffect(() => {
    if (!round || !employeeId || roundSeen(employeeId) === round) return
    markRound(employeeId, round)
    if (repeated) replay(partial ? toursOf(roundTasks.split(',')) : 'all')
  }, [round, repeated, partial, roundTasks, employeeId, replay])

  const next = nextTask(data)
  // to the very record the task is done on (the server names it), and the control to press there is shown
  const go = useCallback((task: TrainingTask) => {
    setOpen(false)
    setRemind(false)
    const place = taskPlace(task)
    nav(place.to)
    pointAt(place.point)
  }, [nav, setOpen])
  const percent = data && data.total ? Math.round((data.done / data.total) * 100) : 0
  const left = data ? data.tasks.filter((x) => !x.done) : []
  const todo = left.filter((x) => x.available).length

  // every sign-in: what is still to do, and a way straight back to it. The first-visit tour goes first (it opens by
  // itself once the page has settled); someone already busy in a window of the page is not interrupted — the
  // banner stays in sight either way.
  const inTraining = !!data?.active
  const busy = notice !== null || open || remind || repeat || askLeave || tour.active || tour.pending
  useEffect(() => {
    if (!inTraining || busy || !employeeId || !token || wasReminded(employeeId, token)) return
    const id = window.setTimeout(() => {
      if (document.querySelector('[role="dialog"]')) return
      markReminded(employeeId, token)
      setRemind(true)
    }, 700)
    return () => window.clearTimeout(id)
  }, [inTraining, busy, employeeId, token])

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
              {data?.voluntary ? t('training.repeat.barOwn') : module === 'admin' ? t('training.barAdmin') : t('training.barText')}
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
                {/* a repeat of one's own: the way back to the real work is always one press away */}
                {data.voluntary && (
                  <Button size="xs" variant="ghost" className="shrink-0" data-training-leave leftIcon={<LogOut className="size-3.5" />} onClick={() => setAskLeave(true)} title={t('training.repeat.leave')}>
                    <span className="max-sm:hidden">{t('training.repeat.leaveShort')}</span>
                  </Button>
                )}
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
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
              <Button size="sm" variant="ghost" data-training-again leftIcon={<RotateCcw className="size-3.5" />} onClick={() => setRepeat(true)}>{t('training.repeat.again')}</Button>
              {data.voluntary && <Button size="sm" variant="ghost" data-training-leave leftIcon={<LogOut className="size-3.5" />} onClick={() => setAskLeave(true)}>{t('training.repeat.leave')}</Button>}
            </div>
          </div>
        )}>
        <div className="flex flex-col gap-4">
          <div className="rounded-[var(--radius)] bg-warn-soft/60 p-3.5 text-[13.5px] leading-relaxed text-ink-2 ring-1 ring-warn/20">
            <p>{t('training.intro')}</p>
            <p className="mt-2 font-medium text-ink">{data?.voluntary ? t('training.repeat.introOwn') : t('training.introGoal')}</p>
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

      <Modal open={remind && active && !!data} onClose={() => setRemind(false)} size="sm"
        title={data?.canComplete ? t('training.remind.readyTitle') : data?.done ? t('training.remind.title') : repeated ? t('training.remind.repeatTitle') : t('training.remind.firstTitle')}
        footer={<>
          <Button variant="ghost" data-training-remind-later onClick={() => setRemind(false)}>{t('training.remind.later')}</Button>
          {data?.canComplete
            ? <Button data-training-remind-go loading={complete.isPending} leftIcon={<Check className="size-4" />} onClick={() => { setRemind(false); complete.mutate() }}>{t('training.finish')}</Button>
            : next && <Button data-training-remind-go rightIcon={<ArrowRight className="size-4" />} onClick={() => go(next)}>{t('training.remind.continue')}</Button>}
        </>}>
        {data && (
          <div className="flex flex-col gap-4" data-training-remind={data.canComplete ? 'ready' : data.done ? 'left' : 'first'}>
            <div className="flex items-start gap-3">
              <span className={cn('grid size-10 shrink-0 place-items-center rounded-full', data.canComplete ? 'bg-ok-soft text-ok' : 'bg-warn-soft text-warn')}>
                {data.canComplete ? <Check className="size-5" /> : <GraduationCap className="size-5" />}
              </span>
              <p className="text-[14px] leading-relaxed text-ink-2">
                {data.canComplete ? t('training.remind.readyBody')
                  : data.voluntary ? t('training.remind.ownBody', { n: todo })
                  : data.done ? t('training.remind.body', { n: todo })
                  : repeated ? t('training.remind.repeatBody', { n: todo })
                  : t('training.remind.firstBody', { n: todo })}
              </p>
            </div>
            <div>
              <div className="mb-1.5 flex items-center justify-between text-[12.5px] text-ink-3">
                <span>{t('training.progress', { done: data.done, total: data.total })}</span>
                <span className="tabular">{percent}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-surface-2"><div className="h-full rounded-full bg-ok" style={{ width: `${percent}%` }} /></div>
            </div>
            {left.length > 0 && (
              <div>
                <p className="mb-1.5 text-[12px] font-semibold uppercase tracking-[0.06em] text-ink-3">{t('training.remind.left')}</p>
                <ul className="flex flex-col gap-1.5">
                  {left.map((task) => {
                    const Icon = taskIcon(task.key)
                    return (
                      <li key={task.key}>
                        <button type="button" disabled={!task.available} data-training-remind-task={task.key} onClick={() => go(task)}
                          className={cn('group flex w-full items-center gap-2.5 rounded-[var(--radius)] border px-3 py-2 text-left', task.available ? 'border-line bg-surface hover:border-warn/50' : 'border-dashed border-line bg-surface-2/40')}>
                          <Icon className="size-4 shrink-0 text-ink-3" />
                          <span className="min-w-0 flex-1">
                            <span className={cn('block break-words text-[13.5px] font-medium', !task.available && 'text-ink-3')}>{taskTitle(t, task.key)}</span>
                            {!task.available && <span className="block text-[12px] text-ink-3">{t('training.unavailable')}</span>}
                          </span>
                          {task.available && <ArrowRight className="size-3.5 shrink-0 text-warn transition-transform group-hover:translate-x-0.5" />}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal open={repeat} onClose={() => setRepeat(false)} size="sm"
        title={mandatory ? t('training.repeat.againTitle') : t('training.repeat.title')}
        footer={<>
          <Button variant="ghost" onClick={() => setRepeat(false)}>{t('common.cancel')}</Button>
          <Button data-training-repeat-go loading={again.isPending} disabled={!plan.length || (!mandatory && !choiceValid(choice))} leftIcon={active ? <RotateCcw className="size-4" /> : <GraduationCap className="size-4" />}
            onClick={() => again.mutate(mandatory ? undefined : tasksOf(choice, plan))}>
            {active ? t('training.repeat.again') : t('training.repeat.start')}
          </Button>
        </>}>
        <div className="flex flex-col gap-3.5" data-training-repeat={mandatory ? 'mandatory' : active ? 'own' : 'new'}>
          {!planKnown ? <Skeleton className="h-28" />
            : !plan.length ? <p className="text-[14px] leading-relaxed text-ink-2">{offer.isError ? errorMessage(offer.error) : t('training.repeat.noTasks')}</p>
            : mandatory ? <p className="text-[14px] leading-relaxed text-ink-2">{t('training.repeat.againHint')}</p>
            : (
              <>
                <p className="text-[13.5px] leading-relaxed text-ink-2">{t('training.repeat.intro')}</p>
                <PlanPicker plan={plan} value={choice} onChange={setChoice} wholeHint={t('training.repeat.wholeHint')} someHint={t('training.repeat.someHint')} />
                <p className="flex items-start gap-2 rounded-[var(--radius)] bg-warn-soft/60 p-3 text-[12.5px] leading-relaxed text-ink-2 ring-1 ring-warn/20">
                  <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warn" />
                  <span>{active ? t('training.repeat.againHint') : t('training.repeat.warn')}</span>
                </p>
              </>
            )}
        </div>
      </Modal>

      <ConfirmDialog open={askLeave} onClose={() => setAskLeave(false)} onConfirm={() => leaving.mutate()} loading={leaving.isPending}
        title={t('training.repeat.leaveConfirm')} description={t('training.repeat.leaveHint')} confirmText={t('training.repeat.leave')} cancelText={t('common.cancel')} />

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
