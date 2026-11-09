/**
 * Header switcher over the organisation tree — Davlat → Viloyat → Tuman/shahar → Muassasa.
 *
 * Wide screens: the levels sit side by side as columns (like a file browser): opening a viloyat fills the tumanlar
 * column, opening a tuman fills the muassasalar column, and the footer names the opened unit with one button to
 * make it the current scope. Narrow screens: one column at a time with a path bar and "back". Both share the
 * search across the whole subtree (results grouped by level) and the recent picks.
 *
 * Mouse: a row with children opens on click and is picked with its ✓, a double-click or the footer button; a leaf
 * (or a row with nothing to open) is picked on click. Keys: ↑↓ move, → opens, ← / Backspace goes back, Enter
 * picks (or opens what cannot be picked), Esc closes.
 */
import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowLeft, Check, ChevronDown, ChevronRight, Search, X } from 'lucide-react'
import type { Id, OrgUnit, UnitLevel } from '@/domain'
import { cn } from '@/shared/lib/cn'
import { storage } from '@/shared/lib/storage'
import { Button, inputBase } from '@/shared/ui'
import { UnitIcon, useUnitLabels } from './unitUi'
import { parentName, parentsPath, useUnitShape } from './unitShape'
import { GhostColumn, RecentStrip, UnitColumn, UnitCrumbs, UnitRow, sectionLabel } from './UnitSwitcherParts'

export interface UnitSwitcherProps {
  /** the visible tree, flat */
  units: OrgUnit[]
  value: Id | null
  onChange: (id: Id) => void
  /** selectable levels (default: every level); the others are only browsed through */
  levels?: UnitLevel[]
  /** trigger text when nothing is selected; also the footer hint while an unselectable unit is open */
  placeholder?: string
  /** what this switcher picks — the panel title ("Boshqaruv doirasi", "Ish joyi") */
  hint?: string
  /** localStorage key for the last picks; omitted = no "recent" strip */
  recentKey?: string
  /** one choice only: the pill shows the context but does not open */
  disabled?: boolean
  className?: string
  /** extra data-attributes for the trigger (tests, styling hooks) */
  triggerProps?: { [key: `data-${string}`]: string | boolean | undefined }
}

const MAX_MATCHES = 60
const MAX_RECENT = 5
/** a column is at least this wide; narrower screens fall back to one column at a time */
const MIN_COL = 230
const COL_W = 284

interface Col { parent: OrgUnit | null; items: OrgUnit[] }
type OptKind = 'self' | 'child' | 'match'
interface Opt { unit: OrgUnit; kind: OptKind }

export function UnitSwitcher({ units, value, onChange, levels, placeholder, hint, recentKey, disabled, className, triggerProps }: UnitSwitcherProps) {
  const { t } = useTranslation()
  const labels = useUnitLabels()
  const shape = useUnitShape(units)
  const shapeRef = useRef(shape)
  shapeRef.current = shape
  const selectable = (u: OrgUnit) => !levels || levels.includes(u.level)
  const selected = value ? shape.byId.get(value) ?? null : null

  const [open, setOpen] = useState(false)
  /** the node whose children fill the last column (the browsed list); null = the roots */
  const [browse, setBrowse] = useState<Id | null>(null)
  const [q, setQ] = useState('')
  /** keyboard cursor in the column view */
  const [cursor, setCursor] = useState<Id | null>(null)
  /** keyboard / hover cursor in a flat list (one-column view, search results) */
  const [hi, setHi] = useState(0)
  const trigger = useRef<HTMLSpanElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ top: 0, left: 0, width: 380, maxH: 520, up: false, multi: false, nCols: 1 })

  /** a sole root is never shown as a one-row list: browsing starts inside it */
  const norm = (id: Id | null): Id | null => id ?? shape.soleRoot?.id ?? null

  const openPanel = () => {
    if (disabled) return
    setBrowse(norm(selected ? (shape.hasKids(selected.id) ? selected.id : shape.parentOf(selected)) : null))
    setCursor(selected?.id ?? null)
    setQ('')
    setHi(0)
    setOpen(true)
  }
  const close = () => { setOpen(false); trigger.current?.focus() }

  const place = () => {
    const r = trigger.current?.getBoundingClientRect()
    if (!r) return
    const vw = window.innerWidth
    const fit = Math.floor((vw - 16) / MIN_COL)
    const depth = shapeRef.current.levels.length
    const multi = depth >= 2 && fit >= 2
    const nCols = multi ? Math.min(depth, fit) : 1
    const width = multi ? Math.min(vw - 16, nCols * COL_W) : Math.min(Math.max(r.width, 380), vw - 16)
    const left = Math.max(8, Math.min(r.left, vw - width - 8))
    const below = window.innerHeight - r.bottom - 12
    const above = r.top - 12
    const up = below < 320 && above > below
    const maxH = Math.min(multi ? 600 : 520, Math.max(260, up ? above : below))
    setPos({ top: up ? r.top - 6 : r.bottom + 6, left, width, maxH, up, multi, nCols })
  }
  useLayoutEffect(() => { if (open) place() }, [open])
  useEffect(() => {
    if (!open) return
    const outside = (e: MouseEvent) => { const n = e.target as Node; if (!trigger.current?.contains(n) && !panel.current?.contains(n)) setOpen(false) }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); close() } }
    const move = () => place()
    document.addEventListener('mousedown', outside)
    document.addEventListener('keydown', esc, true)
    window.addEventListener('resize', move)
    window.addEventListener('scroll', move, true)
    return () => { document.removeEventListener('mousedown', outside); document.removeEventListener('keydown', esc, true); window.removeEventListener('resize', move); window.removeEventListener('scroll', move, true) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])
  // keep the keyboard cursor in view (column view by id, list views by index)
  useEffect(() => {
    if (!open) return
    const sel = pos.multi && !q ? (cursor ? `[data-unit-option="${cursor}"]` : null) : `[data-idx="${hi}"]`
    if (sel) panel.current?.querySelector<HTMLElement>(sel)?.scrollIntoView({ block: 'nearest' })
  }, [cursor, hi, open, pos.multi, q])

  /* ---- what is shown ---- */
  const query = q.trim().toLowerCase()
  const node = browse ? shape.byId.get(browse) ?? null : null
  // the opened units, top → down, without the sole root (its children are the first column already)
  const lineage = useMemo(() => (node ? [...shape.ancestors(node.id), node].filter((u) => u.id !== shape.soleRoot?.id) : []), [node, shape])
  const cols: Col[] = useMemo(() => [
    { parent: shape.soleRoot, items: shape.children.get(shape.soleRoot?.id ?? null) ?? [] },
    ...lineage.map((n) => ({ parent: n, items: shape.children.get(n.id) ?? [] })),
  ], [shape, lineage])
  const last = cols[cols.length - 1]!
  const canGoBack = lineage.length > 0

  const matches = useMemo(() => {
    if (!query) return []
    const hit = (u: OrgUnit) => `${u.name} ${u.shortName ?? ''} ${u.code ?? ''}`.toLowerCase().includes(query)
    return units.filter(hit).sort((a, b) => a.depth - b.depth || a.name.localeCompare(b.name)).slice(0, MAX_MATCHES)
  }, [units, query])
  const matchesTotal = useMemo(() => (query ? units.filter((u) => `${u.name} ${u.shortName ?? ''} ${u.code ?? ''}`.toLowerCase().includes(query)).length : 0), [units, query])
  const recents = useMemo(() => {
    if (!recentKey || !open) return []
    return storage.get<Id[]>(recentKey, []).map((id) => shape.byId.get(id)).filter((u): u is OrgUnit => !!u && u.id !== value && selectable(u)).slice(0, MAX_RECENT)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recentKey, open, shape, value, levels])

  /* ---- actions ---- */
  const pick = (u: OrgUnit) => {
    if (recentKey) storage.set(recentKey, [u.id, ...storage.get<Id[]>(recentKey, []).filter((x) => x !== u.id)].slice(0, 8))
    setOpen(false)
    trigger.current?.focus()
    if (u.id !== value) onChange(u.id)
  }
  /** open a unit: its children fill the next column / the list */
  const openUnit = (u: OrgUnit) => { setBrowse(u.id); setCursor(u.id); setQ(''); setHi(0) }
  /** put the keyboard cursor on a unit (column view): its children show when it has any */
  const focusTo = (u: OrgUnit) => { setCursor(u.id); setBrowse(shape.hasKids(u.id) ? u.id : norm(shape.parentOf(u))) }
  const back = () => {
    if (!node || !canGoBack) return
    setBrowse(norm(shape.parentOf(node)))
    setCursor(node.id)
    setHi(0)
  }
  /** keyboard confirm on a row: pick what can be picked, open the rest */
  const confirm = (u: OrgUnit) => { if (selectable(u)) pick(u); else if (shape.hasKids(u.id)) openUnit(u) }

  /* ---- flat lists (one-column view, search) ---- */
  const options: Opt[] = query
    ? matches.map((u) => ({ unit: u, kind: 'match' as const }))
    : [...(node && selectable(node) ? [{ unit: node, kind: 'self' as const }] : []), ...last.items.map((u) => ({ unit: u, kind: 'child' as const }))]
  const selfIdx = !query && node && selectable(node) ? 0 : -1
  const kidsBase = selfIdx + 1

  const onKeyList = (e: ReactKeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setHi((h) => Math.min(options.length - 1, h + 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHi((h) => Math.max(0, h - 1)) }
    else if (e.key === 'Enter') { e.preventDefault(); const o = options[hi]; if (o) { if (o.kind === 'self') pick(o.unit); else confirm(o.unit) } }
    else if (e.key === 'ArrowRight') { const o = options[hi]; if (o && o.kind !== 'self' && shape.hasKids(o.unit.id)) { e.preventDefault(); openUnit(o.unit) } }
    else if ((e.key === 'ArrowLeft' || e.key === 'Backspace') && !q && canGoBack) { e.preventDefault(); back() }
  }
  const onKeyColumns = (e: ReactKeyboardEvent) => {
    const cur = (cursor && shape.byId.get(cursor)) || last.items[0] || null
    if (!cur) return
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      if (!cursor) { focusTo(cur); return }
      const pid = shape.parentOf(cur)
      const sib = cols.find((c) => (c.parent?.id ?? null) === (pid ?? shape.soleRoot?.id ?? null))?.items ?? last.items
      const i = sib.findIndex((x) => x.id === cur.id)
      const next = sib[Math.max(0, Math.min(sib.length - 1, i + (e.key === 'ArrowDown' ? 1 : -1)))]
      if (next) focusTo(next)
    } else if (e.key === 'ArrowRight') {
      const first = shape.children.get(cur.id)?.[0]
      if (first) { e.preventDefault(); focusTo(first) }
    } else if (e.key === 'ArrowLeft' || (e.key === 'Backspace' && !q)) {
      const pid = shape.parentOf(cur)
      const p = pid ? shape.byId.get(pid) : undefined
      if (p && p.id !== shape.soleRoot?.id) { e.preventDefault(); focusTo(p) }
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (selectable(cur)) pick(cur)
      else { const first = shape.children.get(cur.id)?.[0]; if (first) focusTo(first) }
    }
  }
  const multi = pos.multi && !query

  /* ---- rows ---- */
  const inactive = t('org.inactive')
  /** second line: a facility shows its kind and code; anything inactive says so */
  const rowSub = (u: OrgUnit) => [u.level === 'facility' && u.kind ? labels.kind(u.kind) : '', u.level === 'facility' ? u.code ?? '' : '', u.isActive ? '' : inactive].filter(Boolean).join(' · ') || undefined
  const row = (u: OrgUnit, extra: { open?: boolean; cursor: boolean; sub?: string; count?: boolean; idx?: number; onHover?: () => void }) => (
    <UnitRow key={u.id} unit={u} shape={shape} selected={u.id === value} selectable={selectable(u)} onOpen={() => openUnit(u)} onPick={() => pick(u)} {...extra} />
  )

  /* ---- panel parts ---- */
  const searchBox = (
    <div className="relative min-w-0 flex-1">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-3" />
      <input autoFocus value={q} onChange={(e) => { setQ(e.target.value); setHi(0) }} placeholder={t('org.switcher.search')} className={cn(inputBase, 'h-9 pl-9 pr-8 text-[13.5px]')} data-unit-switcher-search />
      {q && <button type="button" onClick={() => { setQ(''); setHi(0) }} aria-label="clear" className="absolute right-2 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-full text-ink-3 hover:bg-surface-2"><X className="size-3.5" /></button>}
    </div>
  )
  const closeBtn = <button type="button" onClick={close} aria-label={t('org.switcher.close')} className="grid size-8 shrink-0 place-items-center rounded-full text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink"><X className="size-4" /></button>

  const searchResults = (
    <div role="listbox" className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1.5" data-unit-switcher-results>
      {matches.length === 0 && <p className="px-3 py-8 text-center text-[13px] text-ink-3">{t('org.switcher.noResults')}</p>}
      {matches.map((u, i) => (
        <Fragment key={u.id}>
          {(i === 0 || matches[i - 1]!.level !== u.level) && <div className={cn(sectionLabel, i > 0 && 'mt-1')}>{t(`org.switcher.levelPlural.${u.level}`)}</div>}
          {row(u, { cursor: hi === i, idx: i, sub: [parentsPath(u, shape), rowSub(u)].filter(Boolean).join(' · '), onHover: () => setHi(i) })}
        </Fragment>
      ))}
      {matchesTotal > MAX_MATCHES && <p className="px-3 py-2 text-center text-[12px] text-ink-3">{t('org.switcher.more', { count: matchesTotal - MAX_MATCHES })}</p>}
    </div>
  )

  // columns: the last `nCols` opened levels, then the levels nothing is opened in yet
  const firstCol = Math.max(0, cols.length - pos.nCols)
  const columns = (
    <div className="flex min-h-[280px] min-w-0 flex-1 divide-x divide-line overflow-hidden" data-unit-switcher-columns>
      {cols.slice(firstCol).map((c, i) => {
        const ci = firstCol + i
        const openId = lineage[ci]?.id
        return (
          <UnitColumn key={c.parent?.id ?? 'roots'} id={c.parent?.id ?? 'roots'} level={c.items[0]?.level ?? shape.levels[ci] ?? null} count={c.items.length}>
            {c.items.map((u) => row(u, { open: u.id === openId, cursor: u.id === cursor, sub: rowSub(u), count: true }))}
          </UnitColumn>
        )
      })}
      {Array.from({ length: Math.max(0, pos.nCols - (cols.length - firstCol)) }, (_, g) => <GhostColumn key={`ghost-${g}`} level={shape.levels[cols.length + g] ?? null} />)}
    </div>
  )
  const footer = (
    <div className="flex items-center gap-3 border-t border-line bg-surface/60 px-3 py-2" data-unit-switcher-foot>
      {node ? (
        <>
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand"><UnitIcon unit={node} className="size-[18px]" /></span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13.5px] font-semibold">{node.name}{node.code && <span className="ml-1.5 font-mono text-[11.5px] font-normal text-ink-3">{node.code}</span>}</div>
            <UnitCrumbs path={shape.ancestors(node.id)} fallback={labels.of(node)} onGo={openUnit} />
          </div>
          {pos.nCols >= 3 && <span className="hidden shrink-0 whitespace-nowrap text-[11px] text-ink-3/80 xl:block">{t('org.switcher.keys')}</span>}
          {selectable(node)
            ? node.id === value
              ? <span className="inline-flex h-8 shrink-0 items-center gap-1 rounded-full bg-brand-soft px-3 text-[12.5px] font-medium text-brand-ink"><Check className="size-3.5" />{t('org.switcher.selected')}</span>
              : <Button size="sm" onClick={() => pick(node)} leftIcon={<Check className="size-4" />} data-unit-switcher-select-self>{t('org.switcher.selectThis')}</Button>
            : <span className="shrink-0 rounded-full border border-dashed border-line px-3 py-1.5 text-[12px] text-ink-3">{placeholder ?? t('org.switcher.pickHint')}</span>}
        </>
      ) : <span className="text-[12.5px] text-ink-3">{t('org.switcher.pickHint')}</span>}
    </div>
  )

  // one column at a time: where we are (back · crumbs · the opened unit · pick it), then its children
  const head = node && (
    <div className="flex items-center gap-2 border-b border-line bg-surface/60 px-2 py-2" data-unit-switcher-head>
      {canGoBack
        ? <button type="button" onClick={back} aria-label={t('org.switcher.back')} title={t('org.switcher.back')} className="grid size-8 shrink-0 place-items-center rounded-lg text-ink-2 transition-colors hover:bg-surface-2" data-unit-switcher-back><ArrowLeft className="size-4" /></button>
        : <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand-soft"><UnitIcon unit={node} className="text-brand" /></span>}
      <div className="min-w-0 flex-1">
        <UnitCrumbs path={shape.ancestors(node.id)} fallback={labels.of(node)} onGo={openUnit} />
        <div className="truncate text-[13.5px] font-semibold">{node.name}{node.code && <span className="ml-1.5 font-mono text-[11.5px] font-normal text-ink-3">{node.code}</span>}</div>
      </div>
      {selectable(node) && (node.id === value
        ? <span className="inline-flex h-7 shrink-0 items-center gap-1 rounded-full bg-brand-soft px-2.5 text-[12px] font-medium text-brand-ink"><Check className="size-3.5" />{t('org.switcher.selected')}</span>
        : <button type="button" onClick={() => pick(node)} data-idx={selfIdx} data-unit-switcher-select-self onMouseEnter={() => setHi(selfIdx)}
            className={cn('h-7 shrink-0 rounded-full border px-2.5 text-[12px] font-medium transition-colors', hi === selfIdx ? 'border-brand bg-brand text-white' : 'border-line bg-surface hover:border-brand hover:text-brand')}>
            {t('org.switcher.selectThis')}
          </button>)}
    </div>
  )
  const list = (
    <div role="listbox" className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1.5">
      {last.items.length > 0 && <div className={sectionLabel}>{t(`org.switcher.levelPlural.${last.items[0]!.level}`)} · {last.items.length}</div>}
      {last.items.length === 0 && <p className="px-3 py-6 text-center text-[13px] text-ink-3">{t('org.switcher.empty')}</p>}
      {last.items.map((u, i) => row(u, { cursor: hi === kidsBase + i, idx: kidsBase + i, sub: rowSub(u), count: true, onHover: () => setHi(kidsBase + i) }))}
    </div>
  )

  const panelEl = (
    <motion.div ref={panel} role="dialog" aria-label={hint} data-unit-switcher-panel data-unit-switcher-mode={multi ? 'columns' : 'list'}
      initial={{ opacity: 0, y: pos.up ? 6 : -6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: pos.up ? 6 : -6, scale: 0.98 }} transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
      style={{ position: 'fixed', left: pos.left, width: pos.width, maxHeight: pos.maxH, ...(pos.up ? { bottom: window.innerHeight - pos.top } : { top: pos.top }) }}
      className="app-unit-switcher z-[95] flex flex-col overflow-hidden rounded-[var(--radius-lg)] border border-line bg-bg-elevated shadow-3"
      onKeyDown={multi ? onKeyColumns : onKeyList} onMouseDown={(e) => e.stopPropagation()}>
      <div className={cn('border-b border-line', pos.multi ? 'flex items-center gap-3 px-3 py-2' : 'space-y-1.5 p-2')}>
        {hint && <div className={cn('text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-3', pos.multi ? 'shrink-0' : 'px-1.5')}>{hint}</div>}
        {pos.multi ? <>{searchBox}{closeBtn}</> : <div className="flex items-center gap-1.5">{searchBox}{closeBtn}</div>}
      </div>
      {!query && <RecentStrip units={recents} onPick={pick} />}
      {query ? searchResults : multi ? <>{columns}{footer}</> : <>{head}{list}</>}
    </motion.div>
  )

  const sub = selected
    ? selected.level === 'facility'
      ? [parentName(selected, shape), labels.of(selected)].filter(Boolean).join(' · ')
      : [labels.level(selected.level), parentName(selected, shape)].filter(Boolean).join(' · ')
    : ''

  return (
    <>
      <span ref={trigger} role="combobox" tabIndex={disabled ? -1 : 0} aria-expanded={open} aria-haspopup="dialog" aria-disabled={disabled || undefined} title={selected?.path ?? placeholder}
        onClick={() => (open ? setOpen(false) : openPanel())}
        onKeyDown={(e) => { if (!open && (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown')) { e.preventDefault(); openPanel() } }}
        className={cn('app-unit-switcher-trigger inline-flex h-9 min-w-0 shrink items-center gap-2 rounded-full border border-line bg-surface py-0.5 pl-1 pr-2.5 text-left shadow-1 outline-none transition-colors sm:h-10 sm:pr-3',
          disabled ? 'cursor-default' : 'cursor-pointer hover:border-line-strong focus-visible:ring-2 focus-visible:ring-brand/40', open && 'border-brand', className)}
        data-unit-switcher data-value={value ?? ''} {...triggerProps}>
        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-brand-soft text-brand sm:size-8">
          {selected ? <UnitIcon unit={selected} /> : <ChevronRight className="size-4" />}
        </span>
        <span className="flex min-w-0 flex-col leading-tight max-sm:hidden">
          <span className="max-w-[150px] truncate text-[13px] font-semibold md:max-w-[220px] 2xl:max-w-[300px]">{selected?.name ?? placeholder}</span>
          {sub && <span className="max-w-[150px] truncate text-[11px] text-ink-3 md:max-w-[220px] 2xl:max-w-[300px]">{sub}</span>}
        </span>
        {!disabled && <ChevronDown className={cn('size-3.5 shrink-0 text-ink-3 transition-transform', open && 'rotate-180')} />}
      </span>
      {createPortal(<AnimatePresence>{open && panelEl}</AnimatePresence>, document.body)}
    </>
  )
}
