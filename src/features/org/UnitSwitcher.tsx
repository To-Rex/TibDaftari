/**
 * Header switcher over the organisation tree. A drill-down — Davlat → Viloyat → Tuman/shahar → Muassasa — with a
 * path bar (back + clickable crumbs), search across the whole subtree and the last picks. The admin panel uses it
 * for the administered unit, the staff app for the facility it works in. Forms keep using `UnitPicker`.
 *
 * Mouse: a selectable row selects on click, its "›" button opens it; a non-selectable row (a district while picking
 * a facility) opens on click. Keys: ↑↓ move, Enter selects (or opens), → opens, ← / Backspace goes back, Esc closes.
 */
import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowLeft, Check, ChevronDown, ChevronRight, Clock, Search, X } from 'lucide-react'
import type { Id, OrgUnit, UnitLevel } from '@/domain'
import { cn } from '@/shared/lib/cn'
import { storage } from '@/shared/lib/storage'
import { inputBase } from '@/shared/ui'
import { UnitIcon, unitMeta, useUnitLabels } from './unitUi'

export interface UnitSwitcherProps {
  /** the visible tree, flat */
  units: OrgUnit[]
  value: Id | null
  onChange: (id: Id) => void
  /** selectable levels (default: every level); the others are only browsed through */
  levels?: UnitLevel[]
  /** trigger text when nothing is selected */
  placeholder?: string
  /** what this switcher picks — shown above the search ("Boshqaruv doirasi", "Ish joyi") */
  hint?: string
  /** localStorage key for the last picks; omitted = no "recent" section */
  recentKey?: string
  /** one choice only: the pill shows the context but does not open */
  disabled?: boolean
  className?: string
  /** extra data-attributes for the trigger (tests, styling hooks) */
  triggerProps?: { [key: `data-${string}`]: string | boolean | undefined }
}

const MAX_MATCHES = 60
const MAX_RECENT = 5

interface Shape {
  byId: Map<Id, OrgUnit>
  children: Map<Id | null, OrgUnit[]>
  /** facilities under each node (a facility counts itself) */
  facilities: Map<Id, number>
  roots: OrgUnit[]
  ancestors: (id: Id) => OrgUnit[]
}

function useShape(units: OrgUnit[]): Shape {
  return useMemo(() => {
    const byId = new Map(units.map((u) => [u.id, u] as const))
    const children = new Map<Id | null, OrgUnit[]>()
    for (const u of units) {
      const pid = u.parentId && byId.has(u.parentId) ? u.parentId : null
      const list = children.get(pid) ?? []
      list.push(u)
      children.set(pid, list)
    }
    const cmp = (a: OrgUnit, b: OrgUnit) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)
    for (const list of children.values()) list.sort(cmp)
    const facilities = new Map<Id, number>()
    const count = (u: OrgUnit): number => {
      const n = (u.level === 'facility' ? 1 : 0) + (children.get(u.id) ?? []).reduce((s, c) => s + count(c), 0)
      facilities.set(u.id, n)
      return n
    }
    const roots = children.get(null) ?? []
    roots.forEach(count)
    const ancestors = (id: Id) => {
      const out: OrgUnit[] = []
      let cur = byId.get(id)
      while (cur?.parentId && byId.has(cur.parentId)) { cur = byId.get(cur.parentId); if (cur) out.unshift(cur) }
      return out
    }
    return { byId, children, facilities, roots, ancestors }
  }, [units])
}

/** The level above, by name — from the tree when it is there, else from the geo names the API sends. */
function parentName(u: OrgUnit, shape: Shape): string | null {
  const p = u.parentId ? shape.byId.get(u.parentId) : undefined
  if (p) return p.name
  if (u.level === 'region') return u.countryName ?? null
  if (u.level === 'district') return u.regionName ?? null
  if (u.level === 'facility') return u.districtName ?? u.regionName ?? null
  return null
}

/** "O‘zbekiston › Xorazm viloyati › Bog‘ot tumani" — where a unit sits, without the unit itself. */
function parentsPath(u: OrgUnit, shape: Shape): string {
  const anc = shape.ancestors(u.id)
  if (anc.length) return anc.map((a) => a.name).join(' › ')
  const own = ` › ${u.name}`
  return u.path.endsWith(own) ? u.path.slice(0, -own.length) : u.path === u.name ? '' : u.path
}

type OptKind = 'self' | 'child' | 'recent' | 'match'
interface Opt { unit: OrgUnit; kind: OptKind }

const label = 'px-2.5 pb-1 pt-2 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-3'

export function UnitSwitcher({ units, value, onChange, levels, placeholder, hint, recentKey, disabled, className, triggerProps }: UnitSwitcherProps) {
  const { t } = useTranslation()
  const labels = useUnitLabels()
  const shape = useShape(units)
  const selectable = (u: OrgUnit) => !levels || levels.includes(u.level)
  const selected = value ? shape.byId.get(value) ?? null : null

  const [open, setOpen] = useState(false)
  /** the node whose children are listed; null = the roots (several administered units) */
  const [browse, setBrowse] = useState<Id | null>(null)
  const [q, setQ] = useState('')
  const [hi, setHi] = useState(0)
  const trigger = useRef<HTMLSpanElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ top: 0, left: 0, width: 380, maxH: 520, up: false })

  const hasKids = (id: Id) => (shape.children.get(id)?.length ?? 0) > 0
  /** a single root is never shown as a one-row list: browsing starts inside it */
  const normalize = (id: Id | null): Id | null => (id === null && shape.roots.length === 1 ? shape.roots[0]?.id ?? null : id)

  const openPanel = () => {
    if (disabled) return
    const start = selected ? (hasKids(selected.id) ? selected.id : selected.parentId && shape.byId.has(selected.parentId) ? selected.parentId : null) : null
    setBrowse(normalize(start))
    setQ('')
    setHi(0)
    setOpen(true)
  }
  const close = () => { setOpen(false); trigger.current?.focus() }

  const place = () => {
    const r = trigger.current?.getBoundingClientRect()
    if (!r) return
    const width = Math.min(Math.max(r.width, 380), window.innerWidth - 16)
    const left = Math.max(8, Math.min(r.left, window.innerWidth - width - 8))
    const below = window.innerHeight - r.bottom - 12
    const above = r.top - 12
    const up = below < 320 && above > below
    const maxH = Math.min(520, Math.max(240, up ? above : below))
    setPos({ top: up ? r.top - 6 : r.bottom + 6, left, width, maxH, up })
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
  useEffect(() => {
    if (!open) return
    listRef.current?.querySelector<HTMLElement>(`[data-idx="${hi}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [hi, open])

  const query = q.trim().toLowerCase()
  const node = browse ? shape.byId.get(browse) ?? null : null
  const kids = shape.children.get(browse) ?? []
  const crumbs = node ? [...shape.ancestors(node.id), node] : []
  const canGoBack = !!node && !(shape.roots.length === 1 && node.id === shape.roots[0]?.id)

  const matches = useMemo(() => {
    if (!query) return []
    const hit = (u: OrgUnit) => `${u.name} ${u.shortName ?? ''} ${u.code ?? ''}`.toLowerCase().includes(query)
    return units.filter(hit).sort((a, b) => a.depth - b.depth || a.name.localeCompare(b.name))
  }, [units, query])
  const recents = useMemo(() => {
    if (!recentKey || !open) return []
    const ok = (u: OrgUnit) => !levels || levels.includes(u.level)
    return storage.get<Id[]>(recentKey, []).map((id) => shape.byId.get(id)).filter((u): u is OrgUnit => !!u && u.id !== value && ok(u)).slice(0, MAX_RECENT)
  }, [recentKey, open, shape, value, levels])

  const options: Opt[] = query
    ? matches.slice(0, MAX_MATCHES).map((u) => ({ unit: u, kind: 'match' as const }))
    : [...(node && selectable(node) ? [{ unit: node, kind: 'self' as const }] : []), ...kids.map((u) => ({ unit: u, kind: 'child' as const })), ...recents.map((u) => ({ unit: u, kind: 'recent' as const }))]
  const selfIdx = !query && node && selectable(node) ? 0 : -1
  const kidsBase = selfIdx + 1
  const recentBase = kidsBase + kids.length

  const pick = (u: OrgUnit) => {
    if (recentKey) storage.set(recentKey, [u.id, ...storage.get<Id[]>(recentKey, []).filter((x) => x !== u.id)].slice(0, 8))
    setOpen(false)
    trigger.current?.focus()
    if (u.id !== value) onChange(u.id)
  }
  const drill = (u: OrgUnit) => { setBrowse(u.id); setQ(''); setHi(0) }
  const back = () => {
    if (!node || !canGoBack) return
    const pid = node.parentId && shape.byId.has(node.parentId) ? node.parentId : null
    setBrowse(normalize(pid))
    setHi(0)
  }
  const primary = (o: Opt) => {
    const u = o.unit
    if (selectable(u)) pick(u)
    else if (hasKids(u.id)) drill(u)
  }
  const onKey = (e: ReactKeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setHi((h) => Math.min(options.length - 1, h + 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHi((h) => Math.max(0, h - 1)) }
    else if (e.key === 'Enter') { e.preventDefault(); const o = options[hi]; if (o) primary(o) }
    else if (e.key === 'ArrowRight') { const o = options[hi]; if (o && o.kind !== 'self' && hasKids(o.unit.id)) { e.preventDefault(); drill(o.unit) } }
    else if ((e.key === 'ArrowLeft' || e.key === 'Backspace') && !q && canGoBack) { e.preventDefault(); back() }
  }

  /* ---- rows ---- */
  const row = (u: OrgUnit, idx: number, sub: string, opts: { chevron?: boolean; count?: boolean }) => {
    const on = u.id === value
    const kidsN = shape.children.get(u.id)?.length ?? 0
    const fac = shape.facilities.get(u.id) ?? 0
    const canPick = selectable(u)
    const inert = !canPick && kidsN === 0
    return (
      <div key={u.id} role="option" aria-selected={on} data-idx={idx} data-unit-option={u.id} tabIndex={-1}
        title={canPick ? t('org.switcher.select') : kidsN ? t('org.switcher.open') : undefined}
        onMouseEnter={() => setHi(idx)} onClick={() => { if (canPick) pick(u); else if (kidsN) drill(u) }}
        className={cn('group flex items-center gap-2.5 rounded-lg px-2.5 py-2 transition-colors', inert ? 'cursor-default opacity-50' : 'cursor-pointer', on ? 'bg-brand-soft/60 text-brand-ink' : hi === idx && !inert ? 'bg-surface-2' : '', !u.isActive && 'opacity-60')}>
        <UnitIcon unit={u} className={on ? 'text-brand' : 'text-ink-3'} />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-[13.5px] font-medium">{u.name}</span>
          <span className="truncate text-[11.5px] text-ink-3">{sub}</span>
        </span>
        {opts.count && u.level !== 'facility' && fac > 0 && <span className="shrink-0 text-[11.5px] tabular text-ink-3 max-xs:hidden">{t('org.switcher.facilities', { count: fac })}</span>}
        {on && <Check className="size-4 shrink-0 text-brand" />}
        {opts.chevron && kidsN > 0 && (
          <button type="button" aria-label={t('org.switcher.open')} title={t('org.switcher.open')} onClick={(e) => { e.stopPropagation(); drill(u) }} data-unit-drill={u.id}
            className={cn('grid size-7 shrink-0 place-items-center rounded-md text-ink-3 transition-colors hover:bg-surface-3 hover:text-ink', canPick && 'border border-line bg-surface')}>
            <ChevronRight className="size-4" />
          </button>
        )}
      </div>
    )
  }

  const panelEl = (
    <motion.div ref={panel} role="dialog" aria-label={hint} data-unit-switcher-panel
      initial={{ opacity: 0, y: pos.up ? 4 : -4, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: pos.up ? 4 : -4, scale: 0.98 }} transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
      style={{ position: 'fixed', left: pos.left, width: pos.width, maxHeight: pos.maxH, ...(pos.up ? { bottom: window.innerHeight - pos.top } : { top: pos.top }) }}
      className="app-unit-switcher z-[95] flex flex-col overflow-hidden rounded-[var(--radius)] border border-line bg-bg-elevated shadow-3"
      onKeyDown={onKey} onMouseDown={(e) => e.stopPropagation()}>
      {/* search */}
      <div className="border-b border-line p-2">
        {hint && <div className="px-1.5 pb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-3">{hint}</div>}
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-3" />
          <input autoFocus value={q} onChange={(e) => { setQ(e.target.value); setHi(0) }} placeholder={t('org.switcher.search')} className={cn(inputBase, 'h-9 pl-9 pr-8 text-[13.5px]')} data-unit-switcher-search />
          {q && <button type="button" onClick={() => { setQ(''); setHi(0) }} aria-label="clear" className="absolute right-2 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-full text-ink-3 hover:bg-surface-2"><X className="size-3.5" /></button>}
        </div>
      </div>

      {/* where we are: back · crumbs · the browsed unit · select it */}
      {!query && node && (
        <div className="flex items-center gap-2 border-b border-line bg-surface/60 px-2 py-2" data-unit-switcher-head>
          {canGoBack
            ? <button type="button" onClick={back} aria-label={t('org.switcher.back')} title={t('org.switcher.back')} className="grid size-8 shrink-0 place-items-center rounded-lg text-ink-2 transition-colors hover:bg-surface-2" data-unit-switcher-back><ArrowLeft className="size-4" /></button>
            : <span className="grid size-8 shrink-0 place-items-center"><UnitIcon unit={node} className="text-brand" /></span>}
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-1 text-[11.5px] text-ink-3">
              {crumbs.length > 1
                ? crumbs.slice(0, -1).map((c) => (
                  <Fragment key={c.id}>
                    <button type="button" onClick={() => drill(c)} className="max-w-[40%] truncate hover:text-ink hover:underline">{c.name}</button>
                    <ChevronRight className="size-3 shrink-0" />
                  </Fragment>
                ))
                : <span>{labels.of(node)}</span>}
            </div>
            <div className="truncate text-[13.5px] font-semibold">
              {node.name}{node.code && <span className="ml-1.5 font-mono text-[11.5px] font-normal text-ink-3">{node.code}</span>}
            </div>
          </div>
          {selectable(node) && (node.id === value
            ? <span className="inline-flex h-7 shrink-0 items-center gap-1 rounded-full bg-brand-soft px-2.5 text-[12px] font-medium text-brand-ink"><Check className="size-3.5" />{t('org.switcher.selected')}</span>
            : <button type="button" onClick={() => pick(node)} data-idx={selfIdx} data-unit-switcher-select-self onMouseEnter={() => setHi(selfIdx)}
                className={cn('h-7 shrink-0 rounded-full border px-2.5 text-[12px] font-medium transition-colors', hi === selfIdx ? 'border-brand bg-brand text-white' : 'border-line bg-surface hover:border-brand hover:text-brand')}>
                {t('org.switcher.selectThis')}
              </button>)}
        </div>
      )}

      <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1.5" role="listbox">
        {query ? (
          <>
            {matches.length === 0 && <p className="px-3 py-8 text-center text-[13px] text-ink-3">{t('org.switcher.noResults')}</p>}
            {matches.slice(0, MAX_MATCHES).map((u, i) => row(u, i, [parentsPath(u, shape), unitMeta(u, labels, t('org.inactive'))].filter(Boolean).join(' · '), { chevron: !selectable(u) }))}
            {matches.length > MAX_MATCHES && <p className="px-3 py-2 text-center text-[12px] text-ink-3">{t('org.switcher.more', { count: matches.length - MAX_MATCHES })}</p>}
          </>
        ) : (
          <>
            {kids.length > 0 && <div className={label}>{t(`org.switcher.levelPlural.${kids[0]!.level}`)} · {kids.length}</div>}
            {kids.length === 0 && node && <p className="px-3 py-6 text-center text-[13px] text-ink-3">{t('org.switcher.empty')}</p>}
            {kids.map((u, i) => row(u, kidsBase + i, unitMeta(u, labels, t('org.inactive')), { chevron: true, count: true }))}
            {recents.length > 0 && (
              <>
                <div className={cn(label, 'mt-1 flex items-center gap-1.5 border-t border-line pt-2.5')}><Clock className="size-3" />{t('org.switcher.recent')}</div>
                {recents.map((u, i) => row(u, recentBase + i, parentsPath(u, shape) || labels.of(u), {}))}
              </>
            )}
          </>
        )}
      </div>
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
        className={cn('app-unit-switcher-trigger inline-flex h-9 min-w-0 shrink items-center gap-2 rounded-full border border-line bg-surface px-2.5 text-left shadow-1 outline-none transition-colors sm:h-10 sm:px-3',
          disabled ? 'cursor-default' : 'cursor-pointer hover:border-line-strong focus-visible:ring-2 focus-visible:ring-brand/40', open && 'border-brand', className)}
        data-unit-switcher data-value={value ?? ''} {...triggerProps}>
        {selected ? <UnitIcon unit={selected} className="text-brand" /> : <span className="size-4 shrink-0" />}
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
