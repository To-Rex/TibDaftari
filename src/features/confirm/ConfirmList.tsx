/** Left column of the doctor's queue: selectable list of submitted/approved items. */
import { useTranslation } from 'react-i18next'
import { motion } from 'motion/react'
import { BadgeCheck } from 'lucide-react'
import type { Id } from '@/domain'
import type { WorklistRow } from '@/features/lab/WorklistTable'
import { cn } from '@/shared/lib/cn'
import { fmtRelative, fmtTime } from '@/shared/lib/format'
import { Avatar, EmptyState, Kbd, SkeletonRows, fadeUp, stagger } from '@/shared/ui'

export function ConfirmList({ rows, loading, selectedId, onSelect, categoryColor }: {
  rows: WorklistRow[]
  loading?: boolean
  selectedId: Id | null
  onSelect: (id: Id) => void
  categoryColor: (categoryId: Id) => string | undefined
}) {
  const { t } = useTranslation()
  if (loading && rows.length === 0) return <div className="p-4"><SkeletonRows rows={8} /></div>
  if (rows.length === 0) return <EmptyState icon={<BadgeCheck />} title={t('clinical.confirm.empty')} description={t('clinical.confirm.emptyHint')} />
  return (
    <motion.ul variants={stagger} initial="hidden" animate="show" className="flex flex-col divide-y divide-line/70">
      {rows.map((r) => {
        const active = r.id === selectedId
        return (
          <motion.li key={r.id} variants={fadeUp} data-item-id={r.id}>
            <button
              type="button"
              onClick={() => onSelect(r.id)}
              className={cn('relative flex w-full items-start gap-3 px-4 py-3 text-left transition-colors', active ? 'bg-brand-soft/50' : 'hover:bg-surface-2/60')}
            >
              {active && <motion.span layoutId="confirm-active" className="absolute inset-y-0 left-0 w-[3px] bg-brand" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />}
              <Avatar name={r.patientName} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-[14px] font-medium text-ink">{r.patientName}</span>
                  <span className="shrink-0 text-[11.5px] tabular text-ink-3">{r.submittedAt ? fmtTime(r.submittedAt) : ''}</span>
                </div>
                <div className="mt-0.5 flex items-center gap-1.5 text-[12.5px] text-ink-2">
                  <span className="size-1.5 shrink-0 rounded-full" style={{ background: categoryColor(r.categoryId) ?? 'var(--c-line-strong)' }} />
                  <span className="truncate">{r.serviceName}</span>
                </div>
                <div className="mt-0.5 flex items-center gap-2 text-[11.5px] text-ink-3 tabular">
                  <span className="font-mono">{r.orderNumber}</span>
                  <span className="opacity-50">·</span>
                  <span className="truncate">{r.technicianName ?? '—'}</span>
                  <span className="ml-auto">{fmtRelative(r.submittedAt ?? r.updatedAt)}</span>
                </div>
              </div>
            </button>
          </motion.li>
        )
      })}
      <li className="flex items-center justify-center gap-2 px-4 py-2.5 text-[11.5px] text-ink-3">
        <Kbd>J</Kbd><Kbd>K</Kbd> {t('clinical.confirm.kbdMove')} <span className="mx-1 opacity-40">|</span> <Kbd>A</Kbd> {t('clinical.confirm.kbdApprove')}
      </li>
    </motion.ul>
  )
}
