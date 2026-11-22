/**
 * The composer: a rounded box that grows with the text; under it the context the assistant works in (the unit,
 * the model, what this role may ask for) and the send button. Enter sends, Shift+Enter breaks the line.
 */
import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowUp, Cpu, Eye, Loader2, SlidersHorizontal, Square, X } from 'lucide-react'
import type { AssistantStatus, AssistantTool, AssistantToolGroup, OrgUnit } from '@/domain'
import { cn } from '@/shared/lib/cn'
import { UnitIcon } from '../org/unitUi'

const MAX_HEIGHT = 208

const chip = 'inline-flex h-8 min-w-0 items-center gap-1.5 rounded-full px-2.5 text-[12.5px] text-ink-2 transition-colors'
/** the order the areas are listed in — the daily work first, the administration after */
const GROUPS: AssistantToolGroup[] = ['reception', 'lab', 'results', 'reports', 'messaging', 'files', 'units', 'staff', 'catalog', 'templates', 'general']

/** What the assistant may do for this employee here: the tools of their role, the unit, the model, the request limit. */
function Capabilities({ status, unit, onClose, place, panel }: { status: AssistantStatus; unit: OrgUnit | null; onClose: () => void; place: CSSProperties; panel: RefObject<HTMLDivElement | null> }) {
  const { t } = useTranslation()
  const source = status.effectivePlatform ? t('assistant.platformAccount') : status.effectiveUnitName
  const lineage = status.context ?? []
  const byGroup = new Map<AssistantToolGroup, AssistantTool[]>()
  for (const x of status.tools) byGroup.set(x.group ?? 'general', [...(byGroup.get(x.group ?? 'general') ?? []), x])
  const tone = (x: AssistantTool) => (x.danger ? 'border-danger/30 bg-danger-soft/50 text-ink' : x.kind === 'write' ? 'border-warn/30 bg-warn-soft/50 text-ink' : 'border-line bg-surface text-ink-2')
  return (
    <motion.div ref={panel} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
      role="dialog" aria-label={t('assistant.capabilities')} data-chat-capabilities style={place}
      className="fixed z-[90] flex flex-col overflow-hidden rounded-2xl border border-line-strong/70 bg-bg-elevated shadow-3">
      <div className="flex items-center gap-2 border-b border-line px-4 py-2.5">
        <span className="text-[13.5px] font-semibold">{t('assistant.capabilities')}</span>
        <button type="button" onClick={onClose} aria-label={t('common.close')} className="ml-auto grid size-7 place-items-center rounded-full text-ink-3 hover:bg-surface-2 hover:text-ink"><X className="size-4" /></button>
      </div>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-3.5">
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-ink-3" data-tool-legend>
          <span className="inline-flex items-center gap-1.5"><Eye className="size-3.5" />{t('assistant.readTools')}</span>
          <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-warn" />{t('assistant.writeTools')}</span>
          <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-danger" />{t('assistant.dangerTools')}</span>
        </p>
        {GROUPS.filter((g) => byGroup.has(g)).map((g) => (
          <section key={g} data-tool-group={g}>
            <h4 className="mb-1.5 flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-[0.06em] text-ink-3">{t(`assistant.groups.${g}`)}<span className="font-medium normal-case tracking-normal">· {byGroup.get(g)!.length}</span></h4>
            <ul className="flex flex-wrap gap-1.5">{byGroup.get(g)!.map((x) => <li key={x.name} className={cn('rounded-full border px-2.5 py-1 text-[12.5px] leading-tight', tone(x))} data-tool={x.name} data-tool-kind={x.danger ? 'danger' : x.kind}>{x.title}</li>)}</ul>
          </section>
        ))}
        <dl className="space-y-2 border-t border-line pt-3 text-[12.5px]">
          {(lineage.length > 0 || unit) && (
            <div className="flex gap-2.5">
              <dt className="w-24 shrink-0 text-ink-3">{t('assistant.workingIn')}</dt>
              <dd className="min-w-0">
                {lineage.length > 0 ? (
                  <ul className="space-y-0.5" data-tool-context>
                    {lineage.map((step, i) => <li key={step.id} className={cn('flex gap-1.5', i === lineage.length - 1 && 'font-medium')}><span className="w-[5.5rem] shrink-0 font-normal text-ink-3">{t(`org.level.${step.level}`)}</span><span className="min-w-0 break-words">{step.name}</span></li>)}
                  </ul>
                ) : unit && <span className="inline-flex items-center gap-1.5 font-medium"><UnitIcon unit={unit} className="size-3.5 text-brand" />{unit.name}</span>}
                <p className="mt-1 text-ink-3">{t('assistant.workingInHint')}</p>
              </dd>
            </div>
          )}
          {status.model && (
            <div className="flex gap-2.5">
              <dt className="w-24 shrink-0 text-ink-3">{t('assistant.model')}</dt>
              <dd className="min-w-0"><span className="break-all font-mono text-[12px] font-medium">{status.model}</span>{source && <p className="mt-0.5 text-ink-3">{t('assistant.configuredBy', { name: source })}</p>}</dd>
            </div>
          )}
          <p className="text-ink-3">{t('assistant.rateInfo', { n: status.rateLimit, minutes: Math.max(1, Math.round(status.rateWindowSeconds / 60)) })}</p>
        </dl>
      </div>
    </motion.div>
  )
}

export interface ComposerProps {
  value: string
  onChange: (v: string) => void
  onSubmit: () => void
  /** a reply to this conversation is on its way — typing stays possible, sending waits */
  busy: boolean
  placeholder: string
  unit: OrgUnit | null
  status: AssistantStatus
  /** the welcome screen: a little taller, with more air */
  hero?: boolean
  /** given while the wait can be stopped: the send button becomes "stop" (Esc does the same) */
  onStop?: () => void
  /** the stop was asked for and is on its way */
  stopping?: boolean
}

export const Composer = forwardRef<HTMLTextAreaElement, ComposerProps>(function Composer({ value, onChange, onSubmit, busy, placeholder, unit, status, hero, onStop, stopping }, ref) {
  const { t } = useTranslation()
  const box = useRef<HTMLTextAreaElement>(null)
  const wrap = useRef<HTMLDivElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  // where the capabilities panel opens: above the composer when there is room, below it otherwise (never off-screen)
  const [tools, setTools] = useState<CSSProperties | null>(null)
  const toggleTools = () => {
    const r = wrap.current?.getBoundingClientRect()
    if (tools || !r) { setTools(null); return }
    const width = Math.min(416, window.innerWidth - 16)
    const left = Math.max(8, Math.min(r.left, window.innerWidth - width - 8))
    const above = r.top - 16
    const below = window.innerHeight - r.bottom - 16
    setTools(above >= 300 || above >= below
      ? { left, width, bottom: window.innerHeight - r.top + 8, maxHeight: Math.min(448, above), transformOrigin: 'bottom left' }
      : { left, width, top: r.bottom + 8, maxHeight: Math.min(448, below), transformOrigin: 'top left' })
  }
  useImperativeHandle(ref, () => box.current as HTMLTextAreaElement)

  // the box is as tall as its text, up to a limit — then it scrolls
  const fit = () => {
    const el = box.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT)}px`
    el.style.overflowY = el.scrollHeight > MAX_HEIGHT ? 'auto' : 'hidden'
  }
  useLayoutEffect(fit, [value, hero])
  useEffect(() => {
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [])

  useEffect(() => {
    if (!tools) return
    const close = () => setTools(null)
    const away = (e: MouseEvent) => { const at = e.target as Node; if (!panel.current?.contains(at) && !wrap.current?.querySelector('[data-chat-tools]')?.contains(at)) close() }
    const esc = (e: globalThis.KeyboardEvent) => { if (e.key === 'Escape') close() }
    document.addEventListener('mousedown', away)
    document.addEventListener('keydown', esc)
    window.addEventListener('resize', close)
    return () => { document.removeEventListener('mousedown', away); document.removeEventListener('keydown', esc); window.removeEventListener('resize', close) }
  }, [tools])

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); onSubmit() }
    if (e.key === 'Escape' && busy && onStop && !tools) { e.preventDefault(); onStop() }
  }
  const canStop = busy && !!onStop
  const ready = !busy && !!value.trim()

  return (
    <div ref={wrap} className="relative" data-chat-composer>
      {createPortal(<AnimatePresence>{tools && <Capabilities status={status} unit={unit} onClose={() => setTools(null)} place={tools} panel={panel} />}</AnimatePresence>, document.body)}
      <div onMouseDown={(e) => { if (e.target === e.currentTarget) { e.preventDefault(); box.current?.focus() } }}
        className="cursor-text rounded-[26px] border border-line-strong/70 bg-bg-elevated shadow-2 transition-[border-color,box-shadow] duration-200 focus-within:border-brand/70 focus-within:shadow-[var(--shadow-2),0_0_0_4px_color-mix(in_oklab,var(--c-brand)_12%,transparent)]">
        <textarea ref={box} rows={1} value={value} onChange={(e) => onChange(e.target.value)} onKeyDown={onKey} placeholder={placeholder} aria-label={t('assistant.composerShort')} enterKeyHint="send"
          className={cn('block w-full resize-none bg-transparent px-4 text-[15px] leading-6 text-ink outline-none placeholder:text-ink-3 sm:px-5', hero ? 'min-h-[52px] pb-1 pt-4' : 'pb-1 pt-3.5')} data-chat-input data-search="" />
        <div className="flex items-center gap-1 px-2 pb-2 pt-1 sm:px-2.5 sm:pb-2.5" onMouseDown={(e) => { if (e.target === e.currentTarget) { e.preventDefault(); box.current?.focus() } }}>
          {unit && (
            <span className={cn(chip, 'max-w-[46%] cursor-default bg-surface-2/70 sm:max-w-[40%]')} title={`${t('assistant.workingIn')}: ${(status.context?.length ? status.context.map((x) => x.name).join(' › ') : unit.name)}\n${t('assistant.workingInHint')}`} data-chat-unit>
              <UnitIcon unit={unit} className="size-3.5 shrink-0 text-brand" /><span className="truncate font-medium text-ink">{unit.name}</span>
            </span>
          )}
          <button type="button" onClick={toggleTools} aria-expanded={!!tools} aria-haspopup="dialog" title={t('assistant.capabilities')} className={cn(chip, 'shrink-0 hover:bg-surface-2 hover:text-ink', tools && 'bg-surface-2 text-ink')} data-chat-tools>
            <SlidersHorizontal className="size-3.5" /><span className="max-xs:hidden">{t('assistant.tools')}</span>{status.tools.length > 0 && <span className="text-ink-3">{status.tools.length}</span>}
          </button>
          {status.model && <span className={cn(chip, 'cursor-default text-ink-3 max-md:hidden')} title={t('assistant.model')} data-chat-model><Cpu className="size-3.5 shrink-0" /><span className="truncate font-mono text-[11.5px]">{status.model}</span></span>}
          {canStop ? (
            <button type="button" onClick={onStop} disabled={stopping} aria-label={t('assistant.stop')} title={`${t('assistant.stop')} (Esc)`} data-chat-stop={stopping ? 'stopping' : 'ready'}
              className="ml-auto grid size-9 shrink-0 place-items-center rounded-full bg-ink text-bg shadow-1 transition-[background-color,transform,opacity] duration-200 hover:opacity-85 active:scale-95 disabled:opacity-60">
              {stopping ? <Loader2 className="size-[18px] animate-spin" /> : <Square className="size-3.5 fill-current" />}
            </button>
          ) : (
            <button type="button" onClick={onSubmit} disabled={!ready} aria-label={t('assistant.send')} title={t('assistant.send')} data-chat-send
              className={cn('ml-auto grid size-9 shrink-0 place-items-center rounded-full transition-[background-color,color,transform] duration-200', ready ? 'bg-brand text-white shadow-1 hover:bg-brand-strong active:scale-95' : busy ? 'bg-brand-soft text-brand' : 'bg-surface-2 text-ink-3')}>
              {busy ? <Loader2 className="size-[18px] animate-spin" /> : <ArrowUp className="size-[18px]" strokeWidth={2.4} />}
            </button>
          )}
        </div>
      </div>
    </div>
  )
})
