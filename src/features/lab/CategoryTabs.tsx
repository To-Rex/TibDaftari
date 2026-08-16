/** Top-level lab category tabs with child-category chips beneath. */
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion } from 'motion/react'
import type { Category, Id } from '@/domain'
import { cn } from '@/shared/lib/cn'
import { Skeleton, Tabs } from '@/shared/ui'

export interface CategorySelection { rootId: Id | 'all'; childId: Id | null }

export interface CategoryRoot { root: Category; children: Category[]; ids: Id[] }

export function CategoryTabs({ roots, value, onChange, loading, counts }: {
  roots: CategoryRoot[] | undefined
  value: CategorySelection
  onChange: (v: CategorySelection) => void
  loading?: boolean
  counts?: Record<string, number>
}) {
  const { t } = useTranslation()
  if (loading || !roots) return <div className="flex gap-3 border-b border-line pb-3"><Skeleton className="h-6 w-20" /><Skeleton className="h-6 w-28" /><Skeleton className="h-6 w-24" /></div>
  const cur = roots.find((r) => r.root.id === value.rootId)
  return (
    <div>
      <Tabs
        items={[
          { value: 'all', label: t('common.all'), count: counts?.all },
          ...roots.map((r) => ({
            value: r.root.id,
            label: r.root.name,
            icon: <span className="inline-block size-2.5 rounded-full ring-2 ring-surface" style={{ background: r.root.color ?? 'var(--c-brand)' }} />,
            count: counts?.[r.root.id],
          })),
        ]}
        value={value.rootId}
        onChange={(rootId) => onChange({ rootId, childId: null })}
      />
      <AnimatePresence initial={false}>
        {cur && cur.children.length > 0 && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }} className="overflow-hidden">
            <div className="flex flex-wrap gap-1.5 pt-3">
              <Chip active={value.childId === null} onClick={() => onChange({ ...value, childId: null })}>{t('common.all')}</Chip>
              {cur.children.map((c) => (
                <Chip key={c.id} active={value.childId === c.id} color={c.color} onClick={() => onChange({ ...value, childId: value.childId === c.id ? null : c.id })}>{c.name}</Chip>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Chip({ active, color, onClick, children }: { active: boolean; color?: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-[12.5px] font-medium transition-[background-color,border-color,color,transform] duration-200 active:scale-[0.97]',
        active ? 'border-brand/40 bg-brand-soft text-brand-ink' : 'border-line bg-surface text-ink-2 hover:border-line-strong hover:text-ink',
      )}
    >
      {color && <span className="size-1.5 rounded-full" style={{ background: color }} />}
      {children}
    </button>
  )
}
