import { type ReactNode } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import { cn } from '@/shared/lib/cn'
import { Skeleton } from './Surface'

/**
 * Lightweight, server-driven data table (sorting/pagination handled by the caller
 * — matches how the FastAPI backend will page large datasets). For very long
 * client-side lists use `@tanstack/react-virtual` inside `renderRow`.
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
}

const hide = { sm: 'max-sm:hidden', md: 'max-md:hidden', lg: 'max-lg:hidden' }

export function DataTable<T>({ columns, rows, rowKey, loading, skeletonRows = 8, sortBy, sortDir, onSort, onRowClick, selectedKey, empty, dense, className, stickyHeader = true, rowClassName }: DataTableProps<T>) {
  const py = dense ? 'py-2' : 'py-3'
  return (
    <div className={cn('w-full overflow-x-auto', className)}>
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
          {loading && rows.length === 0
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
  )
}
