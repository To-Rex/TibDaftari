/** Lab worklist rows (server paginated). */
import { useTranslation } from 'react-i18next'
import { FlaskConical } from 'lucide-react'
import type { Id, OrderItem } from '@/domain'
import { cn } from '@/shared/lib/cn'
import { ageFrom, fmtPhone, fmtRelative, fmtTime, fmtDate } from '@/shared/lib/format'
import { Avatar, DataTable, EmptyState, type Column } from '@/shared/ui'
import { ItemStatusBadge } from './ItemStatusBadge'
import { itemStatusStripe } from './status'

export type WorklistRow = OrderItem & { orderNumber: string; patientName: string; patientPhone: string; patientGender?: 'male' | 'female'; patientBirthDate?: string }

export function WorklistTable({ rows, loading, onOpen, categoryColor, emptyHint }: {
  rows: WorklistRow[]
  loading?: boolean
  onOpen: (row: WorklistRow) => void
  categoryColor: (categoryId: Id) => string | undefined
  emptyHint?: string
}) {
  const { t } = useTranslation()
  const isToday = (iso?: string) => !!iso && iso.slice(0, 10) === new Date().toISOString().slice(0, 10)
  const when = (iso?: string) => (iso ? (isToday(iso) ? fmtTime(iso) : fmtDate(iso, 'dd.MM HH:mm')) : '—')

  const columns: Column<WorklistRow>[] = [
    {
      key: 'patient',
      header: t('clinical.lab.colPatient'),
      cell: (r) => (
        <div className="flex items-center gap-3">
          <span className={cn('absolute inset-y-0 left-0 w-[3px]', itemStatusStripe[r.status])} aria-hidden />
          <Avatar name={r.patientName} size="sm" />
          <div className="min-w-0">
            <div className="truncate font-medium text-ink">{r.patientName}</div>
            <div className="flex items-center gap-1.5 text-[12px] text-ink-3 tabular">
              <span>{fmtPhone(r.patientPhone)}</span>
              {(r.patientGender || r.patientBirthDate) && (
                <>
                  <span className="opacity-50">·</span>
                  <span>{[r.patientGender ? t(`common.${r.patientGender}`) : null, r.patientBirthDate ? t('clinical.lab.age', { n: ageFrom(r.patientBirthDate) }) : null].filter(Boolean).join(', ')}</span>
                </>
              )}
            </div>
          </div>
        </div>
      ),
      className: 'relative',
    },
    { key: 'order', header: t('clinical.lab.colOrder'), cell: (r) => <span className="font-mono text-[12.5px] tabular text-ink-2">{r.orderNumber}</span>, width: '120px', hideBelow: 'md' },
    {
      key: 'service',
      header: t('clinical.lab.colService'),
      cell: (r) => (
        <div className="flex min-w-0 items-center gap-2">
          <span className="size-2 shrink-0 rounded-full" style={{ background: categoryColor(r.categoryId) ?? 'var(--c-line-strong)' }} />
          <div className="min-w-0">
            <div className="truncate font-medium">{r.serviceName}</div>
            <div className="truncate text-[12px] text-ink-3">{r.categoryName}</div>
          </div>
        </div>
      ),
    },
    { key: 'status', header: t('common.status'), cell: (r) => <ItemStatusBadge status={r.status} />, width: '140px' },
    { key: 'tech', header: t('clinical.lab.colTechnician'), cell: (r) => <span className="text-ink-2">{r.technicianName ?? <span className="text-ink-3">—</span>}</span>, hideBelow: 'lg' },
    {
      key: 'times',
      header: t('clinical.lab.colTimes'),
      cell: (r) => (
        <div className="text-[12.5px] tabular leading-5">
          <div className="text-ink-2" title={t('clinical.lab.registered')}>{fmtRelative(r.createdAt)}</div>
          {(r.enteredAt || r.submittedAt) && (
            <div className="text-ink-3">
              {r.enteredAt && <span title={t('clinical.status.entered')}>{when(r.enteredAt)}</span>}
              {r.submittedAt && <span title={t('clinical.status.submitted')}> → {when(r.submittedAt)}</span>}
            </div>
          )}
        </div>
      ),
      hideBelow: 'md',
      width: '160px',
    },
  ]

  return (
    <DataTable
      columns={columns}
      rows={rows}
      rowKey={(r) => r.id}
      loading={loading}
      onRowClick={onOpen}
      empty={<EmptyState icon={<FlaskConical />} title={t('clinical.lab.empty')} description={emptyHint ?? t('common.emptyHint')} />}
    />
  )
}
