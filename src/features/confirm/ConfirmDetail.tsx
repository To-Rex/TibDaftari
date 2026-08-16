/** Right column: read-only values, patient block, live document preview and approve/reject actions. */
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowLeft, BadgeCheck, Check, FileText, ListChecks, Undo2 } from 'lucide-react'
import type { Id } from '@/domain'
import { DynamicForm } from '@/features/dynamic-form'
import { usePermissions } from '@/features/auth/store'
import { useItemContext } from '@/features/lab/queries'
import { ItemStatusBadge } from '@/features/lab/ItemStatusBadge'
import { ItemTimeline } from '@/features/lab/ItemTimeline'
import { PatientCard } from '@/features/lab/PatientCard'
import { cn } from '@/shared/lib/cn'
import { ageMonthsFrom } from '@/shared/lib/format'
import { Button, Card, EmptyState, Segmented, Skeleton } from '@/shared/ui'
import { DocumentPreview } from './DocumentPreview'
import { useTemplate } from './queries'
import { useQuery } from '@tanstack/react-query'
import { repos } from '@/data'

export function ConfirmDetail({ companyId, itemId, onBack, onApprove, onReject, approving, justApproved }: {
  companyId: Id
  itemId: Id | null
  /** < lg: return to the list (detail is shown full-width instead of the list) */
  onBack?: () => void
  onApprove: (templateId: string | undefined) => void
  onReject: () => void
  approving?: boolean
  /** id of the item that was just approved — triggers the success animation */
  justApproved?: Id | null
}) {
  const { t } = useTranslation()
  const { can } = usePermissions()
  const { item, order, patient, schema, loading } = useItemContext(itemId ?? undefined)
  const [templateId, setTemplateId] = useState<string | undefined>()
  const [view, setView] = useState<'values' | 'document'>('document')
  const it = item.data
  useEffect(() => setTemplateId(undefined), [itemId])
  const patientCtx = useMemo(() => ({ gender: patient.data?.gender, ageMonths: ageMonthsFrom(patient.data?.birthDate) }), [patient.data])
  const doc = useQuery({ queryKey: ['document', it?.documentId], queryFn: () => repos.orders.getDocument(it!.documentId!), enabled: !!it?.documentId })
  const docTemplate = useTemplate(doc.data?.templateId)

  if (!itemId) {
    return (
      <Card className="flex min-h-[420px] items-center justify-center">
        <EmptyState icon={<BadgeCheck />} title={t('clinical.confirm.pickItem')} description={t('clinical.confirm.pickItemHint')} />
      </Card>
    )
  }

  const submitted = it?.status === 'submitted'
  const canApprove = can('confirm.result.approve') && submitted

  return (
    <div className="relative flex flex-col gap-4">
      {/* success overlay */}
      <AnimatePresence>
        {justApproved === itemId && (
          <motion.div key="ok" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pointer-events-none absolute inset-0 z-20 grid place-items-center rounded-[var(--radius-lg)] bg-surface/70 backdrop-blur-[2px]">
            <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 380, damping: 22 }} className="grid size-20 place-items-center rounded-full bg-ok text-white shadow-3">
              <motion.span initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ delay: 0.12, type: 'spring', stiffness: 400, damping: 20 }}><Check className="size-10" strokeWidth={3} /></motion.span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {onBack && (
        <button type="button" onClick={onBack} className="inline-flex h-9 w-fit items-center gap-1.5 rounded-lg text-[13px] text-ink-3 transition-colors hover:text-ink lg:hidden">
          <ArrowLeft className="size-4" />{t('clinical.lab.backToList')}
        </button>
      )}
      <Card className="flex flex-col gap-4">
        {loading || !it ? (
          <div className="space-y-3"><Skeleton className="h-6 w-64" /><Skeleton className="h-4 w-48" /><Skeleton className="h-4 w-80" /></div>
        ) : (
          <>
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-[18px] font-semibold tracking-tight">{it.serviceName}</h2>
                  <ItemStatusBadge status={it.status} />
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-3 text-[13px] text-ink-3">
                  <span className="font-mono tabular">{order.data?.order.number}</span>
                  <span>{it.categoryName}</span>
                  {it.technicianName && <span>{t('clinical.confirm.technician')}: <span className="text-ink-2">{it.technicianName}</span></span>}
                </div>
              </div>
              <div className={cn('flex shrink-0 flex-wrap items-center gap-2', canApprove && 'max-lg:hidden')}>
                {canApprove ? (
                  <>
                    <Button variant="secondary" leftIcon={<Undo2 className="size-4" />} onClick={onReject}>{t('clinical.confirm.reject')}</Button>
                    <Button leftIcon={<BadgeCheck className="size-4" />} loading={approving} onClick={() => onApprove(templateId)}>{t('clinical.confirm.approve')}</Button>
                  </>
                ) : it.status === 'approved' ? (
                  <span className="text-[13px] text-ink-3">{t('clinical.confirm.approvedBy', { name: it.doctorName ?? '—' })}</span>
                ) : null}
              </div>
            </div>
            <ItemTimeline item={it} />
            <div className="border-t border-line pt-4">
              <PatientCard patient={patient.data} loading={patient.isLoading || order.isLoading} compact />
            </div>
            {it.labNote && <p className="rounded-lg bg-surface-2/70 px-3 py-2 text-[13px] text-ink-2"><span className="font-medium text-ink-3">{t('clinical.lab.labNote')}:</span> {it.labNote}</p>}
          </>
        )}
      </Card>

      {/* < lg: approve / reject live in a sticky bottom bar */}
      {it && canApprove && (
        <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-2 border-t border-line bg-bg-elevated/95 px-3 pb-[max(env(safe-area-inset-bottom),0.625rem)] pt-2.5 backdrop-blur lg:hidden">
          <Button variant="secondary" leftIcon={<Undo2 className="size-4" />} onClick={onReject} className="min-w-0 flex-1 max-xs:px-2"><span className="truncate">{t('clinical.confirm.reject')}</span></Button>
          <Button leftIcon={<BadgeCheck className="size-4" />} loading={approving} onClick={() => onApprove(templateId)} className="min-w-0 flex-1 max-xs:px-2"><span className="truncate">{t('clinical.confirm.approve')}</span></Button>
        </div>
      )}

      {it && (
        <Card padded={false} className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-3 py-2.5 sm:px-4">
            <Segmented<'values' | 'document'> size="sm" value={view} onChange={setView} items={[
              { value: 'document', label: t('clinical.confirm.document'), icon: <FileText /> },
              { value: 'values', label: t('clinical.confirm.values'), icon: <ListChecks /> },
            ]} />
          </div>
          <div className={cn('p-3 sm:p-5', view === 'document' && 'bg-surface-2/50')}>
            <AnimatePresence mode="wait" initial={false}>
              {view === 'values' ? (
                <motion.div key="v" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
                  {schema.data ? (
                    <DynamicForm schema={schema.data} values={it.values} onChange={() => {}} patient={patientCtx} readOnly />
                  ) : <EmptyState title={t('clinical.lab.noSchema')} />}
                </motion.div>
              ) : (
                <motion.div key="d" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} className="mx-auto max-w-[794px]">
                  <DocumentPreview
                    companyId={companyId}
                    item={it}
                    order={order.data?.order}
                    patient={patient.data}
                    schema={schema.data}
                    templateId={templateId}
                    onTemplateChange={setTemplateId}
                    fixedTemplate={it.status === 'approved' ? docTemplate.data : undefined}
                    showTemplateSelect={submitted}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </Card>
      )}
    </div>
  )
}
