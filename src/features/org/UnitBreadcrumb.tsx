/**
 * The path of a unit — Davlat › Viloyat › Tuman › Muassasa — from the flat tree (`unitAncestors`). Ancestors the
 * caller cannot see (above their scope) are still named, from the unit's `path` string, as plain text.
 */
import { Fragment } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import type { Id, OrgUnit } from '@/domain'
import { unitAncestors } from '@/domain'
import { cn } from '@/shared/lib/cn'
import { UnitIcon } from './unitUi'

const SEP = ' › '

export function UnitBreadcrumb({ units, unitId, linkTo, className, compact }: {
  units: OrgUnit[]
  unitId: Id
  /** a route for an ancestor (undefined = plain text); the unit itself is never a link */
  linkTo?: (u: OrgUnit) => string | undefined
  className?: string
  /** icons only for the current unit, smaller text */
  compact?: boolean
}) {
  const chain = unitAncestors(units, unitId)
  const unit = chain[chain.length - 1]
  if (!unit) return null
  // names above the visible chain (the caller's scope starts lower than the root)
  const names = unit.path ? unit.path.split(SEP) : []
  const hidden = names.slice(0, Math.max(0, names.length - chain.length))
  return (
    <nav aria-label="path" className={cn('flex min-w-0 flex-wrap items-center gap-x-1 gap-y-0.5 text-ink-3', compact ? 'text-[12px]' : 'text-[12.5px]', className)} data-unit-breadcrumb>
      {hidden.map((n, i) => (
        <Fragment key={`h${i}`}>
          <span className="truncate max-w-[200px]">{n}</span>
          <ChevronRight className="size-3 shrink-0" aria-hidden />
        </Fragment>
      ))}
      {chain.map((u, i) => {
        const last = i === chain.length - 1
        const to = last ? undefined : linkTo?.(u)
        const body = (
          <span className={cn('inline-flex min-w-0 items-center gap-1', last && 'text-ink-2 font-medium')}>
            {(!compact || last) && <UnitIcon unit={u} className={cn('size-3.5', last ? 'text-brand' : 'text-ink-3')} />}
            <span className="truncate max-w-[220px]">{u.name}</span>
          </span>
        )
        return (
          <Fragment key={u.id}>
            {to ? <Link to={to} className="min-w-0 transition-colors hover:text-ink">{body}</Link> : body}
            {!last && <ChevronRight className="size-3 shrink-0" aria-hidden />}
          </Fragment>
        )
      })}
    </nav>
  )
}
