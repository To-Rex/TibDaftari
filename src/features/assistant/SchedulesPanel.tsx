/**
 * «Rejali topshiriqlar» — the employee's own tasks for the assistant: the list (when each one runs, how the last
 * run went, on / off, run now, open the results) and the form (what to do, when). A task runs by itself with the
 * owner's rights of that moment and read-only tools; its answers land in the task's own conversation.
 */
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { AlertTriangle, ArrowLeft, CalendarClock, CheckCircle2, CirclePause, Loader2, MapPin, MessagesSquare, PencilLine, Play, Plus, Trash2 } from 'lucide-react'
import type { AssistantSchedule, AssistantScheduleInput, AssistantScheduleKind, Id, OrgUnit } from '@/domain'
import { cn } from '@/shared/lib/cn'
import { errorMessage } from '@/shared/lib/errors'
import { fmtDate, fmtDateTime, fmtRelative, isoDay } from '@/shared/lib/format'
import { Button, ConfirmDialog, Drawer, EmptyState, Field, Input, Segmented, Skeleton, Switch, Textarea, toast } from '@/shared/ui'
import { useDeleteSchedule, useRunSchedule, useSaveSchedule, useSchedules } from './queries'

const KINDS: AssistantScheduleKind[] = ['daily', 'weekly', 'monthly', 'once']
const DAYS = [1, 2, 3, 4, 5, 6, 7]
const WORKDAYS = [1, 2, 3, 4, 5]
const PRESETS = ['preset1', 'preset2', 'preset3'] as const
type Rule = Pick<AssistantSchedule, 'kind' | 'time' | 'weekdays' | 'monthDay' | 'runDate'>
interface Form extends Rule { title: string; prompt: string }

/** The rule in the reader's language: «Har kuni 08:00», «Har dushanba, juma 09:30», «Har oyning 1-kuni 10:00». */
export function scheduleWhen(t: TFunction, s: Rule): string {
  const time = s.time || '—'
  if (s.kind === 'once') return t('assistant.schedule.text.once', { date: s.runDate ? fmtDate(s.runDate) : '—', time })
  if (s.kind === 'monthly') return t('assistant.schedule.text.monthly', { day: s.monthDay ?? 1, time })
  if (s.kind === 'weekly') {
    const days = [...new Set(s.weekdays)].sort((a, b) => a - b)
    if (days.length === 7) return t('assistant.schedule.text.daily', { time })
    if (days.join() === WORKDAYS.join()) return t('assistant.schedule.text.workdays', { time })
    return t('assistant.schedule.text.weekly', { days: days.map((d) => t(`assistant.schedule.daysLong.d${d}`)).join(', '), time })
  }
  return t('assistant.schedule.text.daily', { time })
}

const blank = (): Form => ({ title: '', prompt: '', kind: 'daily', time: '08:00', weekdays: WORKDAYS, monthDay: 1, runDate: isoDay(new Date(Date.now() + 86_400_000)) })
const formOf = (s: AssistantSchedule): Form => ({
  title: s.title, prompt: s.prompt, kind: s.kind, time: s.time, weekdays: s.weekdays.length ? s.weekdays : WORKDAYS, monthDay: s.monthDay ?? 1, runDate: s.runDate ?? isoDay(new Date(Date.now() + 86_400_000)),
})
/** only the parts of the rule its kind uses go to the server — the others are cleared */
const inputOf = (f: Form): AssistantScheduleInput => ({
  title: f.title.trim(), prompt: f.prompt.trim(), kind: f.kind, time: f.time,
  weekdays: f.kind === 'weekly' ? [...f.weekdays].sort((a, b) => a - b) : [], monthDay: f.kind === 'monthly' ? (f.monthDay ?? 1) : null, runDate: f.kind === 'once' ? (f.runDate ?? null) : null,
})

function TaskForm({ form, set, unitName, fresh }: { form: Form; set: (patch: Partial<Form>) => void; unitName?: string | null; fresh: boolean }) {
  const { t } = useTranslation()
  const toggleDay = (d: number) => set({ weekdays: form.weekdays.includes(d) ? form.weekdays.filter((x) => x !== d) : [...form.weekdays, d] })
  const workdays = [...form.weekdays].sort((a, b) => a - b).join() === WORKDAYS.join()
  return (
    <div className="space-y-4" data-schedule-form>
      <Field label={t('assistant.schedule.name')} required>
        {(id) => <Input id={id} value={form.title} maxLength={200} placeholder={t('assistant.schedule.namePlaceholder')} onChange={(e) => set({ title: e.target.value })} data-schedule-title />}
      </Field>
      <Field label={t('assistant.schedule.prompt')} hint={t('assistant.schedule.promptHint')} required>
        {(id) => <Textarea id={id} value={form.prompt} rows={5} maxLength={4000} placeholder={t('assistant.schedule.promptPlaceholder')} onChange={(e) => set({ prompt: e.target.value })} data-schedule-prompt />}
      </Field>
      {fresh && (
        <div>
          <div className="mb-1.5 text-[12px] font-medium text-ink-3">{t('assistant.schedule.presets')}</div>
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((p) => (
              <button key={p} type="button" data-schedule-preset={p}
                onClick={() => set({ prompt: t(`assistant.schedule.${p}`), ...(form.title.trim() ? {} : { title: t(`assistant.schedule.${p}Title`) }), ...(p === 'preset2' ? { kind: 'weekly' as const, weekdays: [1] } : {}) })}
                className="rounded-full border border-line bg-surface px-3 py-1 text-[12.5px] text-ink-2 transition-colors hover:border-brand/60 hover:bg-brand-soft/40 hover:text-ink">
                {t(`assistant.schedule.${p}Title`)}
              </button>
            ))}
          </div>
        </div>
      )}
      <Field label={t('assistant.schedule.when')}>
        {() => <Segmented block wrap size="sm" value={form.kind} onChange={(kind) => set({ kind })} items={KINDS.map((k) => ({ value: k, label: t(`assistant.schedule.kind.${k}`) }))} />}
      </Field>
      {form.kind === 'weekly' && (
        <Field label={t('assistant.schedule.weekdays')}>
          {() => (
            <div className="flex flex-wrap items-center gap-1.5" data-schedule-days>
              {DAYS.map((d) => {
                const on = form.weekdays.includes(d)
                return (
                  <button key={d} type="button" aria-pressed={on} onClick={() => toggleDay(d)} data-schedule-day={d}
                    className={cn('h-9 min-w-11 rounded-xl border px-2.5 text-[13px] font-medium transition-colors', on ? 'border-brand bg-brand text-white' : 'border-line bg-surface text-ink-2 hover:border-line-strong hover:text-ink')}>
                    {t(`assistant.schedule.days.d${d}`)}
                  </button>
                )
              })}
              {!workdays && <button type="button" onClick={() => set({ weekdays: WORKDAYS })} className="ml-1 text-[12.5px] font-medium text-brand hover:underline">{t('assistant.schedule.workdays')}</button>}
            </div>
          )}
        </Field>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Field label={t('assistant.schedule.time')} required>
          {(id) => <Input id={id} type="time" value={form.time} onChange={(e) => set({ time: e.target.value })} data-schedule-time />}
        </Field>
        {form.kind === 'monthly' && (
          <Field label={t('assistant.schedule.monthDay')} hint={t('assistant.schedule.monthDayHint')}>
            {(id) => <Input id={id} type="number" min={1} max={31} value={form.monthDay ?? ''} onChange={(e) => set({ monthDay: Math.min(31, Math.max(1, Number(e.target.value) || 1)) })} data-schedule-monthday />}
          </Field>
        )}
        {form.kind === 'once' && (
          <Field label={t('assistant.schedule.date')} required>
            {(id) => <Input id={id} type="date" min={isoDay()} value={form.runDate ?? ''} onChange={(e) => set({ runDate: e.target.value })} data-schedule-date />}
          </Field>
        )}
      </div>
      <p className="flex items-center gap-2 rounded-xl bg-brand-soft/50 px-3 py-2 text-[13.5px] font-medium text-brand-ink" data-schedule-preview>
        <CalendarClock className="size-4 shrink-0 text-brand" />{scheduleWhen(t, form)}
      </p>
      {unitName && (
        <div className="flex items-start gap-2 text-[12.5px] text-ink-3">
          <MapPin className="mt-0.5 size-3.5 shrink-0 text-brand" />
          <span><span className="font-medium text-ink-2">{t('assistant.schedule.unit')}: {unitName}</span> — {t('assistant.schedule.unitHint')}</span>
        </div>
      )}
    </div>
  )
}

function TaskRow({ s, busy, running, onToggle, onRun, onEdit, onDelete, onOpenThread }: { s: AssistantSchedule; busy: boolean; running: boolean; onToggle: (on: boolean) => void; onRun: () => void; onEdit: () => void; onDelete: () => void; onOpenThread: (id: Id) => void }) {
  const { t } = useTranslation()
  const state = s.pausedReason ? 'stopped' : s.finished ? 'finished' : s.isActive ? 'active' : 'paused'
  return (
    <li className={cn('rounded-2xl border bg-bg-elevated p-3.5 transition-colors', state === 'stopped' ? 'border-warn/50' : 'border-line')} data-schedule={s.id} data-schedule-state={state}>
      <div className="flex items-start gap-3">
        <span className={cn('grid size-9 shrink-0 place-items-center rounded-xl', state === 'active' ? 'bg-brand-soft text-brand' : state === 'stopped' ? 'bg-warn-soft text-warn' : 'bg-surface-2 text-ink-3')}>
          {state === 'stopped' ? <AlertTriangle className="size-[18px]" /> : state === 'finished' ? <CheckCircle2 className="size-[18px]" /> : state === 'paused' ? <CirclePause className="size-[18px]" /> : <CalendarClock className="size-[18px]" />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="break-words text-[14px] font-semibold leading-snug">{s.title}</div>
          <div className="mt-0.5 text-[12.5px] text-ink-2" data-schedule-when>{scheduleWhen(t, s)}{s.unitName && <span className="text-ink-3"> · {s.unitName}</span>}</div>
        </div>
        <Switch size="sm" checked={s.isActive} disabled={busy || running} onChange={onToggle} ariaLabel={t('assistant.schedule.active')} className="mt-1" />
      </div>
      <p className="mt-2.5 line-clamp-2 whitespace-pre-wrap break-words text-[13px] leading-relaxed text-ink-2" title={s.prompt}>{s.prompt}</p>
      <div className="mt-2 space-y-0.5 text-[12px] text-ink-3" data-schedule-status>
        <div className={cn(state === 'stopped' && 'text-warn')}>
          {s.pausedReason ? t('assistant.schedule.pausedBySystem', { reason: s.pausedReason }) : s.finished ? t('assistant.schedule.finished') : !s.isActive ? t('assistant.schedule.paused')
            : s.nextRunAt ? <span title={fmtRelative(s.nextRunAt)}>{t('assistant.schedule.next', { when: fmtDateTime(s.nextRunAt) })}</span> : null}
        </div>
        <div className={cn(s.lastStatus === 'failed' && !s.pausedReason && 'text-danger')}>
          {!s.lastRunAt ? t('assistant.schedule.never') : s.lastStatus === 'failed' ? <>{t('assistant.schedule.lastFailed', { when: fmtDateTime(s.lastRunAt) })}{s.lastError && !s.pausedReason && <> · {s.lastError}</>}</> : t('assistant.schedule.lastOk', { when: fmtDateTime(s.lastRunAt) })}
        </div>
      </div>
      <div className="-ml-1 mt-2.5 flex flex-wrap items-center gap-1">
        <Button size="sm" variant="secondary" className="ml-1" leftIcon={running ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />} disabled={busy || running} onClick={onRun} data-schedule-run>{t(running ? 'assistant.schedule.running' : 'assistant.schedule.runNow')}</Button>
        {s.threadId && <Button size="sm" variant="ghost" leftIcon={<MessagesSquare className="size-4" />} onClick={() => onOpenThread(s.threadId as Id)} data-schedule-thread>{t('assistant.schedule.openThread')}</Button>}
        <Button size="sm" variant="ghost" leftIcon={<PencilLine className="size-4" />} disabled={running} onClick={onEdit} data-schedule-edit>{t('common.edit')}</Button>
        <Button size="sm" variant="ghost" className="text-danger hover:text-danger" leftIcon={<Trash2 className="size-4" />} disabled={running} onClick={onDelete} data-schedule-delete>{t('assistant.schedule.delete')}</Button>
      </div>
    </li>
  )
}

export interface SchedulesPanelProps {
  open: boolean
  onClose: () => void
  /** the working unit — a new task runs here */
  unit: OrgUnit | null
  /** show the conversation a task's answers land in */
  onOpenThread: (id: Id) => void
}

export function SchedulesPanel({ open, onClose, unit, onOpenThread }: SchedulesPanelProps) {
  const { t } = useTranslation()
  const list = useSchedules(open)
  const save = useSaveSchedule()
  const remove = useDeleteSchedule()
  const run = useRunSchedule()
  // null = the list; 'new' or a task = the form
  const [editing, setEditing] = useState<AssistantSchedule | 'new' | null>(null)
  const [form, setForm] = useState<Form>(blank)
  const [doomed, setDoomed] = useState<AssistantSchedule | null>(null)
  const [runningId, setRunningId] = useState<Id | null>(null)
  useEffect(() => { if (!open) setEditing(null) }, [open])

  const items = useMemo(() => list.data?.items ?? [], [list.data])
  const max = list.data?.limit ?? 10
  const full = items.length >= max
  const startNew = () => { setForm(blank()); setEditing('new') }
  const startEdit = (s: AssistantSchedule) => { setForm(formOf(s)); setEditing(s) }

  const submit = async () => {
    if (!form.title.trim() || form.prompt.trim().length < 3 || !form.time) { toast.error(t('assistant.schedule.required')); return }
    if (form.kind === 'weekly' && form.weekdays.length === 0) { toast.error(t('assistant.schedule.pickDays')); return }
    if (form.kind === 'once' && !form.runDate) { toast.error(t('assistant.schedule.pickDate')); return }
    try {
      await save.mutateAsync(editing === 'new' ? { input: inputOf(form), unitId: unit?.id } : { id: (editing as AssistantSchedule).id, input: inputOf(form) })
      toast.success(t('assistant.schedule.saved'))
      setEditing(null)
    } catch (e) { toast.error(errorMessage(e)) }
  }
  const toggle = async (s: AssistantSchedule, on: boolean) => {
    try {
      await save.mutateAsync({ id: s.id, input: { isActive: on } })
      toast.success(t(on ? 'assistant.schedule.resumed' : 'assistant.schedule.pausedToast'))
    } catch (e) { toast.error(errorMessage(e)) }
  }
  const runNow = async (s: AssistantSchedule) => {
    setRunningId(s.id)
    try {
      const row = await run.mutateAsync(s.id)
      toast.success(t('assistant.schedule.ran'))
      if (row.threadId) onOpenThread(row.threadId)
    } catch (e) { toast.error(errorMessage(e)) } finally { setRunningId(null) }
  }
  const del = async () => {
    if (!doomed) return
    try {
      await remove.mutateAsync(doomed.id)
      toast.success(t('assistant.schedule.deleted'))
      setDoomed(null)
    } catch (e) { toast.error(errorMessage(e)) }
  }

  const inForm = editing !== null
  const footer = inForm ? (
    <>
      <Button variant="ghost" onClick={() => setEditing(null)} disabled={save.isPending}>{t('common.cancel')}</Button>
      <Button onClick={() => void submit()} loading={save.isPending} data-schedule-save>{t(editing === 'new' ? 'assistant.schedule.create' : 'assistant.schedule.save')}</Button>
    </>
  ) : (
    <>
      <span className="mr-auto text-[12.5px] text-ink-3" data-schedule-count>{t('assistant.schedule.limit', { n: items.length, max })}</span>
      <Button leftIcon={<Plus className="size-4" />} onClick={startNew} disabled={full || list.isLoading} title={full ? t('assistant.schedule.limitReached', { max }) : undefined} data-schedule-add>{t('assistant.schedule.add')}</Button>
    </>
  )

  return (
    <>
      <Drawer open={open} onClose={onClose} width="max-w-xl" footer={footer}
        title={inForm ? (
          <span className="flex items-center gap-2">
            <button type="button" onClick={() => setEditing(null)} aria-label={t('assistant.schedule.back')} title={t('assistant.schedule.back')} className="-ml-1.5 grid size-8 place-items-center rounded-full text-ink-3 hover:bg-surface-2 hover:text-ink"><ArrowLeft className="size-4" /></button>
            {t(editing === 'new' ? 'assistant.schedule.add' : 'assistant.schedule.edit')}
          </span>
        ) : t('assistant.schedule.title')}
        description={inForm ? undefined : t('assistant.schedule.subtitle')}>
        <div data-schedules-panel data-schedules-mode={inForm ? 'form' : 'list'}>
          {inForm ? (
            <TaskForm form={form} set={(patch) => setForm((cur) => ({ ...cur, ...patch }))} fresh={editing === 'new'} unitName={editing === 'new' ? unit?.name : (editing as AssistantSchedule).unitName} />
          ) : list.isLoading ? (
            <div className="space-y-3">{[0, 1].map((i) => <Skeleton key={i} className="h-36 rounded-2xl" />)}</div>
          ) : list.isError ? (
            <EmptyState icon={<AlertTriangle />} title={errorMessage(list.error)} className="min-h-[40vh]" />
          ) : (
            <>
              {list.data?.running === false && (
                <p className="mb-3 flex items-start gap-2 rounded-xl border border-warn/40 bg-warn-soft/50 px-3 py-2 text-[12.5px] text-ink-2" data-schedule-worker-off><AlertTriangle className="mt-0.5 size-4 shrink-0 text-warn" />{t('assistant.schedule.workerOff')}</p>
              )}
              {items.length === 0 ? (
                <EmptyState icon={<CalendarClock />} title={t('assistant.schedule.empty')} description={t('assistant.schedule.emptyHint')} className="min-h-[40vh]"
                  action={<Button leftIcon={<Plus className="size-4" />} onClick={startNew} data-schedule-add="empty">{t('assistant.schedule.add')}</Button>} />
              ) : (
                <ul className="space-y-3" data-schedule-list>
                  {items.map((s) => (
                    <TaskRow key={s.id} s={s} busy={save.isPending} running={runningId === s.id} onToggle={(on) => void toggle(s, on)} onRun={() => void runNow(s)} onEdit={() => startEdit(s)} onDelete={() => setDoomed(s)} onOpenThread={onOpenThread} />
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </Drawer>
      <ConfirmDialog open={!!doomed} onClose={() => setDoomed(null)} onConfirm={() => void del()} danger loading={remove.isPending}
        title={t('assistant.schedule.deleteTitle')} description={t('assistant.schedule.deleteBody', { title: doomed?.title ?? '' })} confirmText={t('common.delete')} cancelText={t('common.cancel')} />
    </>
  )
}
