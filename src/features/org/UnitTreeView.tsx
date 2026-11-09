/**
 * The organisation tree as expandable rows: level icon, name + code, level label, inactive badge, counts of
 * facilities / employees, and a slot for row actions. `search` keeps matching nodes and their ancestors (expanded).
 */
import { useMemo, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronRight, Hospital, Users } from 'lucide-react'
import type { Id, OrgUnit, UnitNode } from '@/domain'
import { buildUnitTree, unitsUnder } from '@/domain'
import { cn } from '@/shared/lib/cn'
import { fmtNumber } from '@/shared/lib/format'
import { Badge } from '@/shared/ui'
import { UnitIcon, useUnitLabels } from './unitUi'

export interface UnitTreeViewProps {
  units: OrgUnit[]
  /** show this unit and its subtree only (default: every root) */
  rootId?: Id
  selectedId?: Id | null
  onSelect?: (u: OrgUnit) => void
  search?: string
  /** inactive units are listed by default; false hides them (and whatever is under them) */
  showInactive?: boolean
  /** actions at the right of a row (stopPropagation is handled: clicks there do not select) */
  renderActions?: (u: OrgUnit) => ReactNode
  /** levels expanded at first paint, counted from the shown root (default 2: root + its children open) */
  expandDepth?: number
  className?: string
  dense?: boolean
}

const matches = (u: OrgUnit, q: string) => `${u.name} ${u.shortName ?? ''} ${u.code ?? ''}`.toLowerCase().includes(q)

/** Nodes that match `q` plus their ancestors; empty `q` = the tree as it is. */
function prune(nodes: UnitNode[], q: string, showInactive: boolean): UnitNode[] {
  const out: UnitNode[] = []
  for (const n of nodes) {
    if (!showInactive && !n.isActive) continue
    const children = prune(n.children, q, showInactive)
    if (!q || matches(n, q) || children.length) out.push({ ...n, children })
  }
  return out
}

export function UnitTreeView({ units, rootId, selectedId, onSelect, search, showInactive = true, renderActions, expandDepth = 2, className, dense }: UnitTreeViewProps) {
  const { t } = useTranslation()
  const labels = useUnitLabels()
  const q = (search ?? '').trim().toLowerCase()
  const roots = useMemo(() => {
    const list = rootId ? unitsUnder(units, rootId) : units
    return prune(buildUnitTree(list), q, showInactive)
  }, [units, rootId, q, showInactive])
  const baseDepth = roots[0]?.depth ?? 0
  // folded by default: everything deeper than `expandDepth`; a search opens every branch that has a match.
  // The user's own flips are kept apart (XOR) so a new search or tree does not lose them needlessly.
  const defaultCollapsed = useMemo(() => {
    const init = new Set<Id>()
    if (q) return init
    const walk = (n: UnitNode) => { if (n.depth - baseDepth >= expandDepth - 1 && n.children.length) init.add(n.id); n.children.forEach(walk) }
    roots.forEach(walk)
    return init
  }, [roots, baseDepth, expandDepth, q])
  const [flipped, setFlipped] = useState<Set<Id>>(() => new Set())
  const isOpen = (id: Id) => defaultCollapsed.has(id) === flipped.has(id)
  const toggle = (id: Id) => setFlipped((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })

  if (!roots.length) return <p className="px-4 py-8 text-center text-[13.5px] text-ink-3" data-unit-tree-empty>{q ? t('admin.units.noMatch') : t('admin.units.empty')}</p>

  const row = (n: UnitNode): ReactNode => {
    const depth = n.depth - baseDepth
    const open = isOpen(n.id)
    const selected = n.id === selectedId
    const hasKids = n.children.length > 0
    return (
      <li key={n.id} data-unit-row={n.id} data-unit-level={n.level}>
        <div
          role={onSelect ? 'button' : undefined}
          tabIndex={onSelect ? 0 : undefined}
          onClick={onSelect ? () => onSelect(n) : undefined}
          onKeyDown={onSelect ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(n) } } : undefined}
          className={cn('group flex min-w-0 items-center gap-2 border-b border-line/70 pr-3 transition-colors', dense ? 'min-h-10 py-1' : 'min-h-12 py-1.5', onSelect && 'cursor-pointer hover:bg-surface-2/70', selected && 'bg-brand-soft/50', !n.isActive && 'opacity-70')}
          style={{ paddingLeft: 8 + depth * 20 }}
        >
          <button type="button" aria-label={open ? 'collapse' : 'expand'} aria-expanded={open} disabled={!hasKids} onClick={(e) => { e.stopPropagation(); toggle(n.id) }}
            className={cn('grid size-7 shrink-0 place-items-center rounded-md text-ink-3 transition-colors hover:bg-surface-3 hover:text-ink', !hasKids && 'invisible')}>
            <ChevronRight className={cn('size-4 transition-transform', open && 'rotate-90')} />
          </button>
          <span className={cn('grid size-8 shrink-0 place-items-center rounded-lg', n.level === 'facility' ? 'bg-ok-soft text-ok' : 'bg-brand-soft text-brand-ink')}>
            <UnitIcon unit={n} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-[14px] font-medium leading-5">
              <span className="truncate">{n.name}</span>
              {n.code && <span className="font-mono text-[12px] font-normal text-ink-3">{n.code}</span>}
              {!n.isActive && <Badge size="sm" tone="neutral" dot>{t('org.inactive')}</Badge>}
            </p>
            <p className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-0.5 text-[12px] text-ink-3">
              <span>{labels.of(n)}</span>
              {n.level !== 'facility' && n.counts.facilities > 0 && <span className="inline-flex items-center gap-1 tabular"><Hospital className="size-3.5" />{fmtNumber(n.counts.facilities)}</span>}
              {n.counts.employees > 0 && <span className="inline-flex items-center gap-1 tabular"><Users className="size-3.5" />{fmtNumber(n.counts.employees)}</span>}
            </p>
          </div>
          {renderActions && <div className="flex shrink-0 items-center gap-1" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>{renderActions(n)}</div>}
        </div>
        {hasKids && open && <ul>{n.children.map(row)}</ul>}
      </li>
    )
  }

  return <ul className={cn('app-unit-tree', className)} data-unit-tree>{roots.map(row)}</ul>
}
