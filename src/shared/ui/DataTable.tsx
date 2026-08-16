import { type ReactNode } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import { cn } from '@/shared/lib/cn'
import { Skeleton } from './Surface'

/**
 * Server-driven data table (sorting/pagination handled by the caller — matches how the
 * FastAPI backend will page large datasets). Responsive by design:
 *   ≥ md  → classic table
 *   < md  → each row becomes a card (first column = title, `primary` columns emphasised,
 *           the rest as label/value pairs). Nothing is lost on phones or watches.
 */
export interface Column<T> {
  key: string
  header: ReactNode
  cell: (row: T, index: number) => ReactNode
  width?: string
  align?: 'left' | 'right' | 'center'
  sortable?: boolean
  className?: string
  hideBelow?: 'sm' | 'md' | 'lg'
  /** card mode: 'title' (top line), 'meta' (second line, no label), 'actions' (bottom row), 'hidden' */
  card?: 'title' | 'meta' | 'actions' | 'hidden' | 'field'
}
export interface DataTableProps<T> {
  columns: Column<T>[]
  rows: T[]
  rowKey: (row: T) => string
  loading?: boolean
  skeletonRows?: number
  sortBy?: string
  sortDir?: 'asc' | 'desc'
  onSort?: (key: string) => void
  onRowClick?: (row: T) => void
  selectedKey?: string
  empty?: ReactNode
  dense?: boolean
  className?: string
  stickyHeader?: boolean
  rowClassName?: (row: T) => string | undefined
  /** breakpoint below which cards are used (default md) */
  cardBelow?: 'sm' | 'md' | 'lg' | 'never'
}

const hide = { sm: 'max-sm:hidden', md: 'max-md:hidden', lg: 'max-lg:hidden' }
const tableAt = { sm: 'max-sm:hidden', md: 'max-md:hidden', lg: 'max-lg:hidden', never: '' }
const cardsAt = { sm: 'sm:hidden', md: 'md:hidden', lg: 'lg:hidden', never: 'hidden' }

export function DataTable<T>({ columns, rows, rowKey, loading, skeletonRows = 8, sortBy, sortDir, onSort, onRowClick, selectedKey, empty, dense, className, stickyHeader = true, rowClassName, cardBelow = 'md' }: DataTableProps<T>) {
  const py = dense ? 'py-2' : 'py-3'
  const showSkeleton = loading && rows.length === 0
  return (
    <div className={cn('w-full', className)}>
      {/* ---------- table (≥ breakpoint) ---------- */}
      <div className={cn('w-full overflow-x-auto', tableAt[cardBelow])}>
        <table className="w-full border-collapse text-[13.5px]">
          <thead className={cn(stickyHeader && 'sticky top-0 z-10')}>
            <tr className="bg-surface-2/80 backdrop-blur text-left text-[12px] uppercase tracking-[0.05em] text-ink-3">
              {columns.map((c) => (
                <th key={c.key} style={{ width: c.width }} className={cn('px-4 py-2.5 font-medium first:rounded-tl-[var(--radius)] last:rounded-tr-[var(--radius)] whitespace-nowrap', c.align === 'right' && 'text-right', c.align === 'center' && 'text-center', c.hideBelow && hide[c.hideBelow], c.className)}>
                  {c.sortable && onSort ? (
                    <button onClick={() => onSort(c.key)} className={cn('inline-flex items-center gap-1 hover:text-ink transition-colors', sortBy === c.key && 'text-ink')}>
                      {c.header}
                      {sortBy === c.key ? (sortDir === 'asc' ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />) : <ArrowUpDown className="size-3 opacity-50" />}
                    </button>
                  ) : c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {showSkeleton
              ? Array.from({ length: skeletonRows }).map((_, i) => (
                  <tr key={i} className="border-b border-line/70">
                    {columns.map((c) => (
                      <td key={c.key} className={cn('px-4', py, c.hideBelow && hide[c.hideBelow])}><Skeleton className={cn('h-3.5', i % 3 === 0 ? 'w-3/4' : i % 3 === 1 ? 'w-1/2' : 'w-2/3')} /></td>
                    ))}
                  </tr>
                ))
              : rows.length === 0
                ? <tr><td colSpan={columns.length}>{empty}</td></tr>
                : rows.map((r, i) => {
                    const k = rowKey(r)
                    return (
                      <tr key={k} onClick={onRowClick ? () => onRowClick(r) : undefined}
                        className={cn('border-b border-line/70 last:border-b-0 transition-colors', onRowClick && 'cursor-pointer hover:bg-surface-2/60', selectedKey === k && 'bg-brand-soft/40', loading && 'opacity-60', rowClassName?.(r))}>
                        {columns.map((c) => (
                          <td key={c.key} className={cn('px-4 align-middle', py, c.align === 'right' && 'text-right tabular', c.align === 'center' && 'text-center', c.hideBelow && hide[c.hideBelow], c.className)}>{c.cell(r, i)}</td>
                        ))}
                      </tr>
                    )
                  })}
          </tbody>
        </table>
      </div>

      {/* ---------- cards (< breakpoint) ---------- */}
      <div className={cn('flex flex-col gap-2.5', cardsAt[cardBelow])}>
        {showSkeleton
          ? Array.from({ length: Math.min(skeletonRows, 5) }).map((_, i) => (
              <div key={i} className="rounded-[var(--radius)] border border-line bg-surface p-3.5 space-y-2.5">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/3" />
                <div className="grid grid-cols-2 gap-2 pt-1"><Skeleton className="h-3 w-full" /><Skeleton className="h-3 w-full" /></div>
              </div>
            ))
          : rows.length === 0
            ? <div>{empty}</div>
            : rows.map((r, i) => <RowCard key={rowKey(r)} row={r} index={i} columns={columns} onClick={onRowClick} selected={selectedKey === rowKey(r)} loading={loading} className={rowClassName?.(r)} />)}
      </div>
    </div>
  )
}

function RowCard<T>({ row, index, columns, onClick, selected, loading, className }: { row: T; index: number; columns: Column<T>[]; onClick?: (r: T) => void; selected: boolean; loading?: boolean; className?: string }) {
  const visible = columns.filter((c) => c.card !== 'hidden')
  const title = visible.find((c) => c.card === 'title') ?? visible[0]
  const metas = visible.filter((c) => c.card === 'meta')
  const actions = visible.filter((c) => c.card === 'actions')
  const fields = visible.filter((c) => c !== title && !metas.includes(c) && !actions.includes(c))
  return (
    <div
      onClick={onClick ? () => onClick(row) : undefined}
      className={cn('rounded-[var(--radius)] border border-line bg-surface p-3.5 shadow-1 transition-colors', onClick && 'cursor-pointer active:bg-surface-2/70', selected && 'border-brand bg-brand-soft/30', loading && 'opacity-60', className)}
    >
      {title && <div className="text-[14px] font-medium leading-5 min-w-0 [&_*]:min-w-0">{title.cell(row, index)}</div>}
      {metas.length > 0 && <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-ink-3">{metas.map((c) => <span key={c.key} className="min-w-0">{c.cell(row, index)}</span>)}</div>}
      {fields.length > 0 && (
        <dl className="mt-2.5 grid grid-cols-[minmax(0,auto)_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-[13px]">
          {fields.map((c) => (
            <div key={c.key} className="contents">
              <dt className="text-[11.5px] uppercase tracking-[0.05em] text-ink-3 self-center whitespace-nowrap">{c.header}</dt>
              <dd className={cn('min-w-0 break-words', c.align === 'right' && 'text-right tabular justify-self-end')}>{c.cell(row, index)}</dd>
            </div>
          ))}
        </dl>
      )}
      {actions.length > 0 && <div className="mt-3 flex flex-wrap items-center justify-end gap-2 border-t border-line/70 pt-2.5" onClick={(e) => e.stopPropagation()}>{actions.map((c) => <span key={c.key}>{c.cell(row, index)}</span>)}</div>}
    </div>
  )
}
