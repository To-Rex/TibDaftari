/**
 * Building blocks of the header unit switcher: one row, one level column, the empty "next level" column, the
 * clickable path and the recent-picks strip. Behaviour lives in `UnitSwitcher`; these only draw and call back.
 */
import { Fragment, useEffect, useRef, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'motion/react'
import { Check, ChevronRight, Clock, Hospital } from 'lucide-react'
import type { OrgUnit, UnitLevel } from '@/domain'
import { cn } from '@/shared/lib/cn'
import { UnitIcon, UnitLevelIcon } from './unitUi'
import type { UnitShape } from './unitShape'

export const sectionLabel = 'px-2.5 pb-1 pt-2 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-3'

export interface RowProps {
  unit: OrgUnit
  shape: UnitShape
  /** the switcher's current value */
  selected: boolean
  /** its children are shown (the next column / the browsed list) */
  open?: boolean
  /** the keyboard cursor sits here */
  cursor: boolean
  selectable: boolean
  /** second line (facility kind, code, inactive) — none for a dense one-line row */
  sub?: string
  /** show the number of facilities under it */
  count?: boolean
  /** position in a flat list (drill / search) for the keyboard */
  idx?: number
  onHover?: () => void
  onOpen: () => void
  onPick: () => void
}

/** A unit row. A row with children opens on click and is picked with ✓, a double-click or Enter; a leaf is picked on click. */
export function UnitRow({ unit: u, shape, selected, open, cursor, selectable, sub, count, idx, onHover, onOpen, onPick }: RowProps) {
  const { t } = useTranslation()
  const kids = shape.hasKids(u.id)
  const fac = shape.facilities.get(u.id) ?? 0
  const inert = !selectable && !kids
  const primary = () => { if (kids) onOpen(); else if (selectable) onPick() }
  return (
    <div role="option" aria-selected={selected} data-idx={idx} data-unit-option={u.id} data-open={open || undefined} tabIndex={-1}
      title={kids ? (selectable ? t('org.switcher.rowHint') : t('org.switcher.open')) : selectable ? t('org.switcher.select') : undefined}
      onMouseEnter={onHover} onClick={primary} onDoubleClick={() => { if (selectable) onPick() }}
      className={cn('group relative flex select-none items-center gap-2.5 rounded-lg px-2 transition-colors', sub ? 'py-1.5' : 'h-9',
        inert ? 'cursor-default opacity-50' : 'cursor-pointer',
        selected ? 'bg-brand-soft/70 text-brand-ink' : open ? 'bg-surface-2 text-ink' : 'hover:bg-surface-2',
        cursor && 'ring-1 ring-inset ring-brand/60', !u.isActive && 'opacity-60')}>
      <UnitIcon unit={u} className={selected ? 'text-brand' : open ? 'text-ink-2' : 'text-ink-3'} />
      <span className="flex min-w-0 flex-1 flex-col leading-tight">
        <span className={cn('truncate text-[13.5px]', selected || open ? 'font-semibold' : 'font-medium')}>
          {u.name}
          {u.code && !sub && <span className="ml-1.5 font-mono text-[11px] font-normal text-ink-3">{u.code}</span>}
        </span>
        {sub && <span className="truncate text-[11.5px] text-ink-3">{sub}</span>}
      </span>
      <span className="ml-auto flex shrink-0 items-center gap-0.5">
        {/* one slot: the facility count at rest; on hover (mouse only) the ✓ that picks a unit with children */}
        <span className="relative grid h-6 min-w-6 place-items-center">
          {count && u.level !== 'facility' && fac > 0 && (
            <span className={cn('inline-flex items-center gap-1 px-1 text-[11.5px] tabular text-ink-3', selectable && kids && !selected && 'group-hover:invisible')} title={t('org.switcher.facilities', { count: fac })}>
              <Hospital className="size-3" />{fac}
            </span>
          )}
          {selectable && kids && !selected && (
            <button type="button" aria-label={t('org.switcher.select')} title={t('org.switcher.select')} data-unit-pick={u.id}
              onClick={(e) => { e.stopPropagation(); onPick() }}
              className="absolute inset-0 hidden place-items-center rounded-md text-ink-2 transition-colors hover:bg-brand-soft hover:text-brand group-hover:grid">
              <Check className="size-4" />
            </button>
          )}
        </span>
        {selected && <span className="grid size-6 place-items-center text-brand" title={t('org.switcher.current')}><Check className="size-4" /></span>}
        {kids && (
          <button type="button" aria-label={t('org.switcher.open')} title={t('org.switcher.open')} data-unit-drill={u.id}
            onClick={(e) => { e.stopPropagation(); onOpen() }}
            className={cn('grid size-6 place-items-center rounded-md transition-colors hover:bg-surface-3', open ? 'text-ink' : 'text-ink-3 group-hover:text-ink')}>
            <ChevronRight className="size-4" />
          </button>
        )}
      </span>
    </div>
  )
}

/** One level of the tree, side by side with the others: a sticky header and its own scroll. */
export function UnitColumn({ id, level, count, children, className }: { id: string; level: UnitLevel | null; count: number; children: ReactNode; className?: string }) {
  const { t } = useTranslation()
  const list = useRef<HTMLDivElement>(null)
  // bring the opened / current row into view once the column appears
  useEffect(() => {
    list.current?.querySelector<HTMLElement>('[data-open], [aria-selected="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [id])
  return (
    <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
      className={cn('flex min-w-0 flex-1 flex-col', className)} data-unit-column={id}>
      <div className={cn(sectionLabel, 'sticky top-0 z-[1] flex items-center justify-between border-b border-line/70 bg-bg-elevated/95 pb-1.5 pt-2 backdrop-blur')}>
        <span className="truncate">{level ? t(`org.switcher.levelPlural.${level}`) : t('org.switcher.scope')}</span>
        <span className="tabular">{count}</span>
      </div>
      <div ref={list} role="listbox" className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1.5">
        {count === 0 ? <p className="px-3 py-6 text-center text-[12.5px] text-ink-3">{t('org.switcher.empty')}</p> : children}
      </div>
    </motion.div>
  )
}

/** The column of a level nothing has been opened in yet. */
export function GhostColumn({ level }: { level: UnitLevel | null }) {
  const { t } = useTranslation()
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center justify-center gap-2 bg-surface/50 p-4 text-center" aria-hidden data-unit-column-ghost>
      {level && <span className="grid size-10 place-items-center rounded-xl bg-surface-2 text-ink-3"><UnitLevelIcon level={level} className="size-5" /></span>}
      {level && <span className="text-[12.5px] font-medium text-ink-3">{t(`org.switcher.levelPlural.${level}`)}</span>}
      <span className="text-[11.5px] text-ink-3/80">{t('org.switcher.ghostHint')}</span>
    </div>
  )
}

/** "O‘zbekiston › Xorazm viloyati" — clickable, each crumb re-opens that unit. */
export function UnitCrumbs({ path, fallback, onGo, className }: { path: OrgUnit[]; fallback?: string; onGo: (u: OrgUnit) => void; className?: string }) {
  if (!path.length) return fallback ? <span className={cn('truncate text-[11.5px] text-ink-3', className)}>{fallback}</span> : null
  return (
    <div className={cn('flex min-w-0 items-center gap-1 text-[11.5px] text-ink-3', className)}>
      {path.map((c, i) => (
        <Fragment key={c.id}>
          {i > 0 && <ChevronRight className="size-3 shrink-0" />}
          <button type="button" onClick={() => onGo(c)} className="max-w-[45%] truncate hover:text-ink hover:underline">{c.name}</button>
        </Fragment>
      ))}
    </div>
  )
}

/** The last picks as pills — one click brings the user back to where they were. */
export function RecentStrip({ units, onPick }: { units: OrgUnit[]; onPick: (u: OrgUnit) => void }) {
  const { t } = useTranslation()
  if (!units.length) return null
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto border-b border-line px-3 py-2 [scrollbar-width:none]" data-unit-switcher-recent>
      <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-medium text-ink-3"><Clock className="size-3" />{t('org.switcher.recent')}</span>
      {units.map((u) => (
        <button key={u.id} type="button" onClick={() => onPick(u)} title={u.path} data-unit-recent={u.id}
          className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 text-[12px] font-medium text-ink-2 transition-colors hover:border-brand hover:text-brand">
          <UnitIcon unit={u} className="size-3.5 text-ink-3" />{u.name}
        </button>
      ))}
    </div>
  )
}
