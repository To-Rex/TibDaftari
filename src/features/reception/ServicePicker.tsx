/**
 * "Xizmat qo‘shish" panel: top-level categories as tabs, sub-categories as chips,
 * searchable service list with branch-aware price and one-click add.
 */
import { useMemo, useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion } from 'motion/react'
import { Check, Clock, Plus, Search } from 'lucide-react'
import { repos } from '@/data'
import type { Category, Id, ServiceType } from '@/domain'
import { Badge, EmptyState, SearchInput, Skeleton, Tabs } from '@/shared/ui'
import { cn } from '@/shared/lib/cn'
import { fmtMoney } from '@/shared/lib/format'
import { useDebounce } from '@/shared/hooks/useDebounce'

export function branchPrice(st: ServiceType, branchId: Id) {
  return st.branchPrices[branchId] ?? st.price
}

export function ServicePicker({ companyId, branchId, inOrder, onAdd, adding, disabled }: { companyId: Id; branchId: Id; inOrder: Set<Id>; onAdd: (serviceTypeId: Id) => void; adding?: Id | null; disabled?: boolean }) {
  const { t } = useTranslation()
  const cats = useQuery({ queryKey: ['categories', companyId], queryFn: () => repos.catalog.listCategories(companyId), staleTime: 60_000 })
  const services = useQuery({ queryKey: ['serviceTypes', companyId, 'active'], queryFn: () => repos.catalog.listServiceTypes(companyId, { activeOnly: true }), staleTime: 60_000 })
  const [top, setTop] = useState<string>('all')
  const [sub, setSub] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const dq = useDebounce(q.trim().toLowerCase(), 200)

  const active = useMemo(() => (cats.data ?? []).filter((c) => c.isActive).sort((a, b) => a.order - b.order), [cats.data])
  const roots = useMemo(() => active.filter((c) => !c.parentId), [active])
  const children = useMemo(() => active.filter((c) => c.parentId === top), [active, top])

  const list = useMemo(() => {
    const all = services.data ?? []
    const scope = sub ? sub : top === 'all' ? null : top
    const allowed = scope ? descendants(active, scope) : null
    return all
      .filter((s) => (!allowed || allowed.has(s.categoryId)) && (!dq || s.name.toLowerCase().includes(dq) || (s.code ?? '').toLowerCase().includes(dq)))
      .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name))
  }, [services.data, sub, top, active, dq])

  const catName = (id: Id) => active.find((c) => c.id === id)?.name ?? ''

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-3">
        <SearchInput value={q} onChange={setQ} placeholder={t('staff.reception.serviceSearchPh')} className="h-10" />
      </div>
      {cats.isLoading ? <Skeleton className="mb-3 h-10" /> : (
        <Tabs size="sm" value={top} onChange={(v) => { setTop(v); setSub(null) }} items={[{ value: 'all', label: t('common.all') }, ...roots.map((c) => ({ value: c.id, label: c.name }))]} />
      )}
      <AnimatePresence initial={false}>
        {children.length > 0 && (
          <motion.div key={top} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
            <div className="flex flex-wrap gap-1.5 pt-3">
              <Chip active={sub === null} onClick={() => setSub(null)}>{t('common.all')}</Chip>
              {children.map((c) => <Chip key={c.id} active={sub === c.id} onClick={() => setSub(c.id)}>{c.name}</Chip>)}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-3 min-h-0 flex-1 overflow-y-auto -mx-1 px-1">
        {services.isLoading ? (
          <div className="flex flex-col gap-2">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-14 rounded-[var(--radius)]" />)}</div>
        ) : list.length === 0 ? (
          <EmptyState icon={<Search />} title={t('common.empty')} description={t('common.emptyHint')} className="py-10" />
        ) : (
          <ul className="flex flex-col gap-1.5">
            {list.map((s, i) => {
              const added = inOrder.has(s.id)
              const busy = adding === s.id
              return (
                <motion.li key={s.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: Math.min(i * 0.02, 0.25) }}>
                  <button type="button" disabled={disabled || busy} onClick={() => onAdd(s.id)}
                    className={cn('group flex w-full items-center gap-3 rounded-[var(--radius)] border px-3 py-2.5 text-left transition-[background-color,border-color,box-shadow,transform] active:scale-[0.995] disabled:opacity-60',
                      added ? 'border-ok/30 bg-ok-soft/40' : 'border-line bg-surface hover:border-brand/40 hover:shadow-1')}>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-medium">{s.name}</span>
                      <span className="mt-0.5 flex items-center gap-2 text-[12px] text-ink-3">
                        <span className="truncate">{catName(s.categoryId)}</span>
                        {s.turnaroundDays > 0 && <span className="inline-flex items-center gap-1 tabular"><Clock className="size-3" />{s.turnaroundDays} {t('common.days')}</span>}
                      </span>
                    </span>
                    <span className="text-[14px] font-semibold tabular">{fmtMoney(branchPrice(s, branchId))}</span>
                    <span className={cn('grid size-8 shrink-0 place-items-center rounded-full transition-colors', added ? 'bg-ok text-white' : 'bg-brand-soft text-brand-ink group-hover:bg-brand group-hover:text-white')}>
                      {added ? <Check className="size-4" /> : <Plus className="size-4" />}
                    </span>
                  </button>
                </motion.li>
              )
            })}
          </ul>
        )}
      </div>
      {list.length > 0 && <div className="mt-2 text-right text-[12px] text-ink-3 tabular">{list.length} {t('staff.reception.servicesCount')} {inOrder.size > 0 && <Badge size="sm" tone="ok" className="ml-2">{inOrder.size} {t('staff.reception.inOrder')}</Badge>}</div>}
    </div>
  )
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={cn('h-7 rounded-full border px-3 text-[12.5px] font-medium transition-colors', active ? 'border-brand bg-brand-soft text-brand-ink' : 'border-line text-ink-2 hover:bg-surface-2')}>{children}</button>
  )
}

function descendants(all: Category[], rootId: Id): Set<Id> {
  const out = new Set<Id>([rootId])
  let grew = true
  while (grew) {
    grew = false
    for (const c of all) if (c.parentId && out.has(c.parentId) && !out.has(c.id)) { out.add(c.id); grew = true }
  }
  return out
}
