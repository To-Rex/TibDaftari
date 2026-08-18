import { useEffect, useRef, useState, type KeyboardEvent, type RefObject } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion } from 'motion/react'
import { UserPlus, Search, Sparkles, X } from 'lucide-react'
import type { Id, Patient } from '@/domain'
import { Avatar, Badge, Button, EmptyState, Input, Kbd, SkeletonRows } from '@/shared/ui'
import { cn } from '@/shared/lib/cn'
import { fmtPhone, fmtRelative } from '@/shared/lib/format'
import { useDebounce } from '@/shared/hooks/useDebounce'
import { usePatientSearch } from '@/features/patients/queries'

export function PatientSearchPanel({ companyId, selectedId, onSelect, onNew, inputRef, canCreate }: { companyId: Id; selectedId?: Id; onSelect: (p: Patient) => void; onNew: () => void; inputRef: RefObject<HTMLInputElement | null>; canCreate: boolean }) {
  const { t } = useTranslation()
  const [q, setQ] = useState('')
  const dq = useDebounce(q.trim(), 250)
  const search = usePatientSearch(companyId, dq)
  const [cursor, setCursor] = useState(0)
  const listRef = useRef<HTMLUListElement>(null)
  const results = search.data ?? []
  useEffect(() => setCursor(0), [dq])

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor((c) => Math.min(results.length - 1, c + 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setCursor((c) => Math.max(0, c - 1)) }
    else if (e.key === 'Enter') { const p = results[cursor]; if (p) onSelect(p); else if (dq.length >= 2 && !search.isFetching && canCreate) onNew() }
  }
  useEffect(() => { listRef.current?.children[cursor]?.scrollIntoView({ block: 'nearest' }) }, [cursor])

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKey} placeholder={t('staff.reception.searchPh')} className="h-11 text-[15px]" autoFocus leftIcon={<Search />}
            rightSlot={q ? <button type="button" onClick={() => { setQ(''); inputRef.current?.focus() }} className="size-6 grid place-items-center rounded-full text-ink-3 hover:bg-surface-2 hover:text-ink" aria-label="clear"><X className="size-3.5" /></button> : <Kbd>/</Kbd>} />
        </div>
        {canCreate && <Button variant="secondary" className="h-11 shrink-0 max-[359px]:w-11 max-[359px]:px-0" leftIcon={<UserPlus className="size-4" />} onClick={onNew} aria-label={t('staff.reception.newPatient')} title={t('staff.reception.newPatient')}><span className="max-[359px]:hidden">{t('staff.reception.newPatient')}</span></Button>}
      </div>

      <div className="mt-3 min-h-0 flex-1 overflow-y-auto -mx-1 px-1">
        {dq.length < 2 ? (
          <EmptyState icon={<Search />} title={t('staff.reception.searchHintTitle')} description={t('staff.reception.searchHint')} className="py-16" />
        ) : search.isLoading ? (
          <SkeletonRows rows={6} className="pt-2" />
        ) : results.length === 0 ? (
          <EmptyState icon={<Sparkles />} title={t('staff.reception.noMatch')} description={t('staff.reception.noMatchHint')} action={canCreate ? <Button leftIcon={<UserPlus className="size-4" />} onClick={onNew}>{t('staff.reception.newPatient')}</Button> : undefined} />
        ) : (
          <ul ref={listRef} className={cn('flex flex-col gap-1 transition-opacity', search.isFetching && 'opacity-70')}>
            <AnimatePresence initial={false}>
              {results.map((p, i) => (
                <motion.li key={p.id} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2, delay: Math.min(i * 0.025, 0.2) }}>
                  <button type="button" onClick={() => onSelect(p)} onMouseEnter={() => setCursor(i)}
                    className={cn('flex w-full items-center gap-3 rounded-[var(--radius)] border px-3 py-2.5 text-left transition-[background-color,border-color,box-shadow]', selectedId === p.id ? 'border-brand/50 bg-brand-soft/50 shadow-1' : i === cursor ? 'border-line bg-surface-2/70' : 'border-transparent hover:bg-surface-2/60')}>
                    <Avatar name={p.fullName} size="md" className="max-xs:hidden" />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span className="truncate text-[14px] font-medium">{p.fullName}</span>
                        {p.tags.map((tg) => <Badge key={tg} size="sm" tone={tg === 'VIP' ? 'accent' : 'brand'}>{tg}</Badge>)}
                      </span>
                      <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12.5px] text-ink-3 tabular">
                        <span>{fmtPhone(p.phone)}</span>
                        {p.stats.lastVisitAt && <><span className="opacity-40">•</span><span>{t('staff.reception.lastVisit')}: {fmtRelative(p.stats.lastVisitAt)}</span></>}
                        <span className="xs:hidden">· {p.stats.orders} {t('staff.reception.ordersShort')}</span>
                      </span>
                    </span>
                    <span className="shrink-0 text-right text-[12px] text-ink-3 tabular max-xs:hidden">{p.stats.orders} {t('staff.reception.ordersShort')}</span>
                  </button>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>
    </div>
  )
}
