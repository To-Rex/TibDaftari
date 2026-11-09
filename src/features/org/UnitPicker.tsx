/**
 * Pickers over the organisation tree.
 *  - `UnitPicker`: a select-like dropdown listing the tree depth-first (indented, level icon); `levels` says which
 *    levels may be chosen (the others are shown as group headers), `rootId` limits it to one subtree.
 *  - `UnitMultiPicker`: the same tree as checkboxes (extra units of an employee, units of a template).
 * Other features code against these props — keep them stable.
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { Check, ChevronDown, ChevronRight, Search, X } from 'lucide-react'
import type { Id, OrgUnit, UnitLevel, UnitNode } from '@/domain'
import { buildUnitTree, flattenUnitTree, unitsUnder } from '@/domain'
import { cn } from '@/shared/lib/cn'
import { Checkbox, inputBase } from '@/shared/ui'
import { UnitIcon, useUnitLabels } from './unitUi'

export interface UnitPickerProps {
  units: OrgUnit[]
  value: Id | null
  onChange: (id: Id | null) => void
  /** selectable levels (default: every level) */
  levels?: UnitLevel[]
  /** only this unit and its subtree */
  rootId?: Id
  placeholder?: string
  /** a "no unit" row at the top that calls `onChange(null)` */
  allowEmpty?: boolean
  disabled?: boolean
  className?: string
  'data-testid'?: string
  /** draw the trigger yourself (a header pill, a breadcrumb…); the picker still handles open/close, keys and a11y */
  renderTrigger?: (state: { open: boolean; selected: OrgUnit | null }) => ReactNode
  /** the popover is at least this wide (default 260) */
  menuWidth?: number
}

interface Row { unit: UnitNode; depth: number; selectable: boolean }

/** Depth-first rows; a non-selectable node is kept only when something selectable sits under it. */
function useRows(units: OrgUnit[], rootId: Id | undefined, levels: UnitLevel[] | undefined): Row[] {
  return useMemo(() => {
    const list = rootId ? unitsUnder(units, rootId) : units
    const roots = buildUnitTree(list)
    const base = roots[0]?.depth ?? 0
    const ok = (u: OrgUnit) => !levels || levels.includes(u.level)
    const keep = (n: UnitNode): UnitNode | null => {
      const children = n.children.map(keep).filter((c): c is UnitNode => !!c)
      return ok(n) || children.length ? { ...n, children } : null
    }
    const kept = roots.map(keep).filter((n): n is UnitNode => !!n)
    return flattenUnitTree(kept).map((u) => ({ unit: u, depth: u.depth - base, selectable: ok(u) }))
  }, [units, rootId, levels])
}

const SEARCH_FROM = 8

export function UnitPicker({ units, value, onChange, levels, rootId, placeholder, allowEmpty, disabled, className, 'data-testid': testId, renderTrigger, menuWidth = 260 }: UnitPickerProps) {
  const { t } = useTranslation()
  const labels = useUnitLabels()
  const rows = useRows(units, rootId, levels)
  const selected = useMemo(() => units.find((u) => u.id === value) ?? null, [units, value])
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [hi, setHi] = useState(-1)
  const btn = useRef<HTMLElement | null>(null)
  const pop = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ top: 0, left: 0, width: 240, up: false })
  const ph = placeholder ?? t('org.allUnits')

  const query = q.trim().toLowerCase()
  const visible = useMemo(() => {
    if (!query) return rows
    // matching rows plus their ancestors (for context)
    const keepIdx = new Set<number>()
    rows.forEach((r, i) => {
      if (`${r.unit.name} ${r.unit.code ?? ''}`.toLowerCase().includes(query)) {
        keepIdx.add(i)
        let d = r.depth
        for (let j = i - 1; j >= 0 && d > 0; j--) if (rows[j]!.depth < d) { keepIdx.add(j); d = rows[j]!.depth }
      }
    })
    return rows.filter((_, i) => keepIdx.has(i))
  }, [rows, query])
  const options = useMemo(() => visible.filter((r) => r.selectable), [visible])

  const place = () => {
    const r = btn.current?.getBoundingClientRect()
    if (!r) return
    const width = Math.min(Math.max(r.width, menuWidth), window.innerWidth - 16)
    const left = Math.min(r.left, window.innerWidth - width - 8)
    const spaceBelow = window.innerHeight - r.bottom
    const up = spaceBelow < 280 && r.top > spaceBelow
    setPos({ top: up ? r.top - 6 : r.bottom + 6, left: Math.max(8, left), width, up })
  }
  useLayoutEffect(() => { if (open) place() }, [open])
  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => { const n = e.target as Node; if (!btn.current?.contains(n) && !pop.current?.contains(n)) setOpen(false) }
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); btn.current?.focus() } }
    const move = () => place()
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', key, true)
    window.addEventListener('resize', move)
    window.addEventListener('scroll', move, true)
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', key, true); window.removeEventListener('resize', move); window.removeEventListener('scroll', move, true) }
  }, [open])
  useEffect(() => { if (!open) { setQ(''); setHi(-1) } }, [open])

  const pick = (id: Id | null) => { onChange(id); setOpen(false); btn.current?.focus() }
  const onKey = (e: React.KeyboardEvent) => {
    if (!open) { if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(true) } return }
    if (e.key === 'ArrowDown') { e.preventDefault(); setHi((h) => Math.min(options.length - 1, h + 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHi((h) => Math.max(0, h - 1)) }
    else if (e.key === 'Enter') { e.preventDefault(); const o = options[hi]; if (o) pick(o.unit.id) }
  }

  const list = (
    <div ref={pop} role="listbox" data-unit-picker-list onKeyDown={onKey}
      style={{ position: 'fixed', left: pos.left, width: pos.width, ...(pos.up ? { bottom: window.innerHeight - pos.top } : { top: pos.top }) }}
      className="app-unit-picker z-[95] flex max-h-[min(360px,70vh)] flex-col overflow-hidden rounded-[var(--radius)] border border-line bg-bg-elevated shadow-3">
      {rows.length > SEARCH_FROM && (
        <div className="relative border-b border-line p-2">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-ink-3" />
          <input autoFocus value={q} onChange={(e) => { setQ(e.target.value); setHi(0) }} placeholder={t('common.searchPlaceholder')} className={cn(inputBase, 'h-9 pl-9 pr-8 text-[13.5px]')} data-unit-picker-search />
          {q && <button type="button" onClick={() => setQ('')} aria-label="clear" className="absolute right-4 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-full text-ink-3 hover:bg-surface-2"><X className="size-3.5" /></button>}
        </div>
      )}
      <div className="min-h-0 flex-1 overflow-y-auto p-1.5">
        {allowEmpty && !query && (
          <button type="button" role="option" aria-selected={value === null} onClick={() => pick(null)} className={cn('flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13.5px] text-ink-2 hover:bg-surface-2', value === null && 'bg-brand-soft/50 text-brand-ink')} data-unit-option="">
            <span className="size-4" />{ph}{value === null && <Check className="ml-auto size-4 text-brand" />}
          </button>
        )}
        {visible.length === 0 && <p className="px-3 py-6 text-center text-[13px] text-ink-3">{t('common.empty')}</p>}
        {visible.map((r) => {
          const u = r.unit
          const on = u.id === value
          const idx = options.indexOf(r)
          const indent = 10 + r.depth * 14
          if (!r.selectable) {
            return (
              <div key={u.id} className="flex items-center gap-2 px-2.5 py-1.5 text-[12px] font-medium uppercase tracking-[0.04em] text-ink-3" style={{ paddingLeft: indent }} data-unit-group={u.id}>
                <UnitIcon unit={u} className="size-3.5" /><span className="truncate">{u.name}</span>
              </div>
            )
          }
          return (
            <button key={u.id} type="button" role="option" aria-selected={on} onClick={() => pick(u.id)} onMouseEnter={() => setHi(idx)}
              className={cn('flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors', on ? 'bg-brand-soft/60 text-brand-ink' : 'hover:bg-surface-2', hi === idx && !on && 'bg-surface-2', !u.isActive && 'opacity-60')}
              style={{ paddingLeft: indent }} data-unit-option={u.id}>
              <UnitIcon unit={u} className={cn(on ? 'text-brand' : 'text-ink-3')} />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-[13.5px] font-medium">{u.name}</span>
                <span className="truncate text-[11.5px] text-ink-3">{labels.of(u)}{u.code ? ` · ${u.code}` : ''}{u.isActive ? '' : ` · ${t('org.inactive')}`}</span>
              </span>
              {on && <Check className="size-4 shrink-0 text-brand" />}
            </button>
          )
        })}
      </div>
    </div>
  )

  if (renderTrigger) {
    return (
      <>
        <span ref={(el) => { btn.current = el }} role="combobox" tabIndex={disabled ? -1 : 0} aria-expanded={open} aria-haspopup="listbox" aria-disabled={disabled || undefined}
          onClick={() => { if (!disabled) setOpen((o) => !o) }} onKeyDown={onKey}
          className={cn('inline-flex min-w-0 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-brand/40 rounded-full', disabled && 'cursor-default', className)} data-unit-picker data-testid={testId} data-value={value ?? ''}>
          {renderTrigger({ open, selected })}
        </span>
        {open && createPortal(list, document.body)}
      </>
    )
  }

  return (
    <>
      <button ref={(el) => { btn.current = el }} type="button" role="combobox" aria-expanded={open} aria-haspopup="listbox" disabled={disabled} onClick={() => setOpen((o) => !o)} onKeyDown={onKey}
        className={cn(inputBase, 'flex items-center gap-2 text-left', !selected && 'text-ink-3', className)} data-unit-picker data-testid={testId} data-value={value ?? ''}>
        {selected ? <UnitIcon unit={selected} className="text-brand" /> : <span className="size-4 shrink-0" />}
        <span className="min-w-0 flex-1 truncate">{selected ? selected.name : ph}</span>
        {selected?.code && <span className="shrink-0 font-mono text-[12px] text-ink-3">{selected.code}</span>}
        <ChevronDown className={cn('size-4 shrink-0 text-ink-3 transition-transform', open && 'rotate-180')} />
      </button>
      {open && createPortal(list, document.body)}
    </>
  )
}

/* ------------------------------------------------------------------------------------------------ */

export interface UnitMultiPickerProps {
  units: OrgUnit[]
  value: Id[]
  onChange: (ids: Id[]) => void
  levels?: UnitLevel[]
  rootId?: Id
  className?: string
  /** show the tree but take no changes */
  disabled?: boolean
}

/** Checkbox tree: selectable levels get a checkbox, the others are collapsible group rows. */
export function UnitMultiPicker({ units, value, onChange, levels, rootId, className, disabled }: UnitMultiPickerProps) {
  const { t } = useTranslation()
  const labels = useUnitLabels()
  const nodes = useMemo(() => {
    const list = rootId ? unitsUnder(units, rootId) : units
    const ok = (u: OrgUnit) => !levels || levels.includes(u.level)
    const keep = (n: UnitNode): UnitNode | null => {
      const children = n.children.map(keep).filter((c): c is UnitNode => !!c)
      return ok(n) || children.length ? { ...n, children } : null
    }
    return buildUnitTree(list).map(keep).filter((n): n is UnitNode => !!n)
  }, [units, rootId, levels])
  const base = nodes[0]?.depth ?? 0
  const total = useMemo(() => flattenUnitTree(nodes).length, [nodes])
  const [q, setQ] = useState('')
  const query = q.trim().toLowerCase()
  const [collapsed, setCollapsed] = useState<Set<Id>>(() => new Set())
  const toggleOpen = (id: Id) => setCollapsed((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })
  const set = new Set(value)
  const toggle = (id: Id, on: boolean) => onChange(on ? [...value, id] : value.filter((x) => x !== id))
  const ok = (u: OrgUnit) => !levels || levels.includes(u.level)
  const match = (u: OrgUnit) => !query || `${u.name} ${u.code ?? ''}`.toLowerCase().includes(query)
  const hasMatch = (n: UnitNode): boolean => match(n) || n.children.some(hasMatch)

  const row = (n: UnitNode): ReactNode => {
    if (query && !hasMatch(n)) return null
    const depth = n.depth - base
    const open = query ? true : !collapsed.has(n.id)
    const kids = n.children.length > 0
    return (
      <div key={n.id} data-unit-multi-row={n.id}>
        <div className="flex min-h-9 items-center gap-1.5 rounded-md pr-2 hover:bg-surface-2" style={{ paddingLeft: 4 + depth * 18 }}>
          <button type="button" aria-label={open ? 'collapse' : 'expand'} disabled={!kids || !!query} onClick={() => toggleOpen(n.id)} className={cn('grid size-6 shrink-0 place-items-center rounded text-ink-3 hover:text-ink', (!kids || query) && 'invisible')}>
            <ChevronRight className={cn('size-3.5 transition-transform', open && 'rotate-90')} />
          </button>
          {ok(n) ? (
            <Checkbox className="min-w-0 flex-1 text-[13.5px]" disabled={disabled} checked={set.has(n.id)} onChange={(e) => toggle(n.id, e.target.checked)} data-unit-check={n.id}
              label={<span className="inline-flex min-w-0 items-center gap-1.5"><UnitIcon unit={n} className="text-ink-3" /><span className="truncate">{n.name}</span>{n.code && <span className="font-mono text-[11.5px] text-ink-3">{n.code}</span>}{!n.isActive && <span className="text-[11.5px] text-ink-3">· {t('org.inactive')}</span>}</span>} />
          ) : (
            <span className="inline-flex min-w-0 flex-1 items-center gap-1.5 text-[12.5px] font-medium text-ink-2"><UnitIcon unit={n} className="text-ink-3" /><span className="truncate">{n.name}</span><span className="text-[11.5px] font-normal text-ink-3">· {labels.of(n)}</span></span>
          )}
        </div>
        {kids && open && n.children.map(row)}
      </div>
    )
  }

  return (
    <div className={cn('rounded-[var(--radius-sm)] border border-line bg-surface', className)} data-unit-multi-picker>
      {total > 10 && (
        <div className="relative border-b border-line p-2">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-ink-3" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('common.searchPlaceholder')} className={cn(inputBase, 'h-9 pl-9 text-[13.5px]')} />
        </div>
      )}
      <div className="max-h-64 overflow-y-auto p-1.5">
        {nodes.length === 0 && <p className="px-3 py-4 text-center text-[13px] text-ink-3">{t('common.empty')}</p>}
        {nodes.map(row)}
      </div>
      {value.length > 0 && <div className="border-t border-line px-3 py-1.5 text-[12px] text-ink-3 tabular">{t('admin.units.selected', { count: value.length })}</div>}
    </div>
  )
}
