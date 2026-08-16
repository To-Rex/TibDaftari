import { memo, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowDown, ArrowUp, ChevronRight, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react'
import type { Category, Id } from '@/domain'
import { cn } from '@/shared/lib/cn'
import { Badge, Menu, Skeleton } from '@/shared/ui'
import { categoryIcon } from './icons'
import { buildCategoryTree, flattenTree, type CategoryNode } from './tree'

export interface CategoryTreeProps {
  categories: Category[]
  loading?: boolean
  selectedId: Id | null
  onSelect: (id: Id | null) => void
  canWrite: boolean
  onAddChild: (parentId: Id | null) => void
  onEdit: (cat: Category) => void
  onDelete: (cat: Category) => void
  onMove: (cat: Category, dir: -1 | 1) => void
  counts?: Record<Id, number>
}

export function CategoryTree({ categories, loading, selectedId, onSelect, canWrite, onAddChild, onEdit, onDelete, onMove, counts }: CategoryTreeProps) {
  const { t } = useTranslation()
  const tree = useMemo(() => buildCategoryTree(categories), [categories])
  const [collapsed, setCollapsed] = useState<Set<Id>>(new Set())
  const expanded = useMemo(() => new Set(categories.filter((c) => !collapsed.has(c.id)).map((c) => c.id)), [categories, collapsed])
  const rows = useMemo(() => flattenTree(tree, expanded), [tree, expanded])

  const toggle = (id: Id) => setCollapsed((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })

  if (loading) return <div className="p-3 space-y-2">{Array.from({ length: 7 }).map((_, i) => <div key={i} style={{ width: `${70 - (i % 3) * 12}%` }}><Skeleton className="h-8" /></div>)}</div>

  return (
    <div className="p-2">
      <button
        onClick={() => onSelect(null)}
        className={cn('w-full flex items-center gap-2 h-10 lg:h-9 px-2.5 rounded-lg text-[13.5px] font-medium transition-colors', selectedId === null ? 'bg-brand-soft text-brand-ink' : 'text-ink-2 hover:bg-surface-2')}
      >
        <span className="size-5 grid place-items-center rounded-md bg-surface-2 text-ink-3 text-[11px]">∗</span>
        {t('catalog.tree.all')}
        <span className="ml-auto text-[12px] tabular text-ink-3">{Object.values(counts ?? {}).reduce((a, b) => a + b, 0) || ''}</span>
      </button>
      <AnimatePresence initial={false}>
        {rows.map((n) => (
          <TreeRow
            key={n.cat.id}
            node={n}
            selected={selectedId === n.cat.id}
            expanded={expanded.has(n.cat.id)}
            onToggle={() => toggle(n.cat.id)}
            onSelect={() => onSelect(n.cat.id)}
            canWrite={canWrite}
            onAddChild={() => onAddChild(n.cat.id)}
            onEdit={() => onEdit(n.cat)}
            onDelete={() => onDelete(n.cat)}
            onMove={(d) => onMove(n.cat, d)}
            count={counts?.[n.cat.id]}
          />
        ))}
      </AnimatePresence>
    </div>
  )
}

interface RowProps {
  node: CategoryNode; selected: boolean; expanded: boolean; onToggle: () => void; onSelect: () => void; canWrite: boolean
  onAddChild: () => void; onEdit: () => void; onDelete: () => void; onMove: (d: -1 | 1) => void; count?: number
}
const TreeRow = memo(function TreeRow({ node, selected, expanded, onToggle, onSelect, canWrite, onAddChild, onEdit, onDelete, onMove, count }: RowProps) {
  const { t } = useTranslation()
  const { cat, depth, children } = node
  const Icon = categoryIcon(cat.icon)
  const hasKids = children.length > 0
  return (
    <motion.div initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -6 }} transition={{ duration: 0.18 }} className="group relative">
      <div
        role="button"
        tabIndex={0}
        onClick={onSelect}
        onKeyDown={(e) => { if (e.key === 'Enter') onSelect(); if (e.key === 'ArrowRight' && !expanded && hasKids) onToggle(); if (e.key === 'ArrowLeft' && expanded) onToggle() }}
        className={cn('flex items-center gap-1.5 h-10 lg:h-9 pr-1.5 rounded-lg text-[13.5px] transition-colors cursor-pointer', selected ? 'bg-brand-soft text-brand-ink' : 'text-ink hover:bg-surface-2', !cat.isActive && 'opacity-55', canWrite && 'max-lg:pr-10')}
        style={{ paddingLeft: 6 + depth * 16 }}
      >
        <button
          onClick={(e) => { e.stopPropagation(); if (hasKids) onToggle() }}
          className={cn('size-5 grid place-items-center rounded text-ink-3 transition-transform', hasKids ? 'hover:bg-surface-3 hover:text-ink' : 'opacity-0 pointer-events-none', expanded && 'rotate-90')}
          aria-label={expanded ? 'collapse' : 'expand'}
        >
          <ChevronRight className="size-3.5" />
        </button>
        <span className="relative grid size-6 place-items-center rounded-md" style={{ background: `${cat.color ?? '#7c8b86'}1f`, color: cat.color ?? undefined }}>
          <Icon className="size-3.5" />
        </span>
        <span className="truncate flex-1 font-medium">{cat.name}</span>
        {cat.workflow !== 'lab' && <Badge size="sm" tone="neutral">{t('catalog.tree.nextPhase')}</Badge>}
        {count != null && count > 0 && <span className="text-[12px] tabular text-ink-3 transition-opacity group-hover:opacity-0">{count}</span>}
        {canWrite && (
          <span className="absolute right-1 flex items-center max-lg:opacity-100 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
            <Menu
              align="end"
              trigger={() => <span className="grid size-8 lg:size-7 place-items-center rounded-md text-ink-3 hover:bg-surface-3 hover:text-ink"><MoreHorizontal className="size-4" /></span>}
              items={[
                { key: 'add', label: t('catalog.tree.addChild'), icon: <Plus />, onSelect: onAddChild },
                { key: 'edit', label: t('common.edit'), icon: <Pencil />, onSelect: onEdit },
                { key: 'up', label: t('catalog.tree.moveUp'), icon: <ArrowUp />, onSelect: () => onMove(-1), separatorBefore: true },
                { key: 'down', label: t('catalog.tree.moveDown'), icon: <ArrowDown />, onSelect: () => onMove(1) },
                { key: 'del', label: t('common.delete'), icon: <Trash2 />, danger: true, onSelect: onDelete, separatorBefore: true },
              ]}
            />
          </span>
        )}
      </div>
    </motion.div>
  )
})
