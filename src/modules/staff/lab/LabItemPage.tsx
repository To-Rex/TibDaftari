/** Lab result entry: DynamicForm bound to an order item + sticky action panel. */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowLeft, FileCheck2, FileText, Save, Send, ShieldCheck, Undo2, AlertTriangle } from 'lucide-react'
import type { ValueMap } from '@/domain'
import { DynamicForm, validateValues } from '@/features/dynamic-form'
import { usePermissions } from '@/features/auth/store'
import { useStaffSession } from '@/features/session/useSession'
import { useItemContext, useSaveValues, useSubmitItem } from '@/features/lab/queries'
import { useUnsavedGuard } from '@/features/lab/useUnsavedGuard'
import { ItemStatusBadge } from '@/features/lab/ItemStatusBadge'
import { ItemTimeline } from '@/features/lab/ItemTimeline'
import { PatientCard } from '@/features/lab/PatientCard'
import { DocumentPreview } from '@/features/confirm/DocumentPreview'
import { useTemplate } from '@/features/confirm/queries'
import { routes } from '@/shared/config/routes'
import { errorMessage } from '@/shared/lib/errors'
import { ageMonthsFrom } from '@/shared/lib/format'
import { cn } from '@/shared/lib/cn'
import { Button, Card, ConfirmDialog, EmptyState, Field, Modal, Page, Skeleton, Textarea, toast } from '@/shared/ui'
import { repos } from '@/data'
import { useQuery } from '@tanstack/react-query'

export default function LabItemPage() {
  const { t } = useTranslation()
  const { itemId = '' } = useParams()
  const { employeeId, companyId } = useStaffSession()
  const { can } = usePermissions()
  const { item, order, patient, schema, loading } = useItemContext(itemId)

  const [values, setValues] = useState<ValueMap>({})
  const [note, setNote] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [docOpen, setDocOpen] = useState(false)

  const it = item.data
  // reset local state whenever the server copy changes (load / after save / other user)
  useEffect(() => {
    if (it) { setValues(it.values); setNote(it.labNote ?? '') }
  }, [it?.id, it?.updatedAt]) // eslint-disable-line react-hooks/exhaustive-deps

  const dirty = !!it && (JSON.stringify(values) !== JSON.stringify(it.values) || note !== (it.labNote ?? ''))
  const approved = it?.status === 'approved'
  const submitted = it?.status === 'submitted'
  const canWrite = can('lab.result.write') && !approved
  const canSubmit = can('lab.result.submit') && !approved
  const readOnly = !canWrite

  const guard = useUnsavedGuard(dirty)
  const save = useSaveValues(itemId)
  const submit = useSubmitItem(itemId)

  const patientCtx = useMemo(() => ({ gender: patient.data?.gender, ageMonths: ageMonthsFrom(patient.data?.birthDate) }), [patient.data])

  const doSave = useCallback(async () => {
    if (!canWrite || !it) return
    try {
      await save.mutateAsync({ employeeId, values, labNote: note || undefined })
      toast.success(t('clinical.messages.saved'))
    } catch (e) { toast.error(errorMessage(e)) }
  }, [canWrite, it, save, employeeId, values, note, t])

  const doSubmit = async () => {
    if (!it || !canSubmit) return
    if (!submitted && schema.data) {
      const errs = validateValues(schema.data, values)
      setErrors(errs)
      if (Object.keys(errs).length) { toast.warning(t('clinical.messages.fixErrors'), Object.values(errs)[0]); return }
    }
    try {
      if (dirty && canWrite) await save.mutateAsync({ employeeId, values, labNote: note || undefined })
      const res = await submit.mutateAsync({ employeeId })
      toast.success(res.status === 'submitted' ? t('clinical.messages.submitted') : t('clinical.messages.unsubmitted'))
    } catch (e) { toast.error(errorMessage(e)) }
  }

  // Ctrl/Cmd+S
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); if (dirty) void doSave() }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [dirty, doSave])

  const doc = useQuery({ queryKey: ['document', it?.documentId], queryFn: () => repos.orders.getDocument(it!.documentId!), enabled: !!it?.documentId })
  const docTemplate = useTemplate(doc.data?.templateId)

  if (item.isError) {
    return <Page><EmptyState icon={<AlertTriangle />} title={errorMessage(item.error)} action={<Link to={routes.app.lab}><Button variant="secondary">{t('common.back')}</Button></Link>} /></Page>
  }

  return (
    <Page width="full">
      {/* Header */}
      <div className="mb-5 flex flex-col gap-3">
        <Link to={routes.app.lab} className="inline-flex w-fit items-center gap-1.5 text-[13px] text-ink-3 transition-colors hover:text-ink"><ArrowLeft className="size-3.5" />{t('clinical.lab.backToList')}</Link>
        {it ? (
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-[22px] font-semibold tracking-tight sm:text-[24px]">{it.serviceName}</h1>
                <ItemStatusBadge status={it.status} />
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13.5px] text-ink-3">
                <span className="font-medium text-ink-2">{order.data?.order.patientName ?? patient.data?.fullName}</span>
                <span className="font-mono tabular">{order.data?.order.number}</span>
                <span>{it.categoryName}</span>
              </div>
            </div>
            <ItemTimeline item={it} />
          </div>
        ) : (
          <div className="space-y-2"><Skeleton className="h-7 w-72" /><Skeleton className="h-4 w-48" /></div>
        )}
      </div>

      <AnimatePresence>
        {it?.status === 'rejected' && it.rejectReason && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mb-4 flex items-start gap-3 rounded-[var(--radius)] border border-danger/30 bg-danger-soft/60 px-4 py-3 text-[13.5px]">
            <Undo2 className="mt-0.5 size-4 shrink-0 text-danger" />
            <div><span className="font-semibold text-danger">{t('clinical.lab.rejectedBanner')}</span> <span className="text-ink-2">{it.rejectReason}</span></div>
          </motion.div>
        )}
        {approved && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="mb-4 flex flex-wrap items-center gap-3 rounded-[var(--radius)] border border-ok/30 bg-ok-soft/60 px-4 py-3 text-[13.5px]">
            <ShieldCheck className="size-4 shrink-0 text-ok" />
            <span className="font-semibold text-ok">{t('clinical.lab.approvedBanner')}</span>
            <span className="text-ink-2">{it.doctorName}</span>
            <span className="ml-auto flex items-center gap-2">
              {it.documentId && <Button size="sm" variant="secondary" leftIcon={<FileText className="size-4" />} onClick={() => setDocOpen(true)}>{t('clinical.lab.viewDocument')}</Button>}
              <Link to={routes.app.order(it.orderId)}><Button size="sm" variant="ghost">{t('clinical.lab.openOrder')}</Button></Link>
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* Form */}
        <Card className={cn('p-5 sm:p-6', readOnly && 'bg-surface/70')}>
          {loading || !it ? (
            <div className="space-y-5">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="grid gap-2 sm:grid-cols-[220px_1fr]"><Skeleton className="h-4 w-40" /><Skeleton className="h-10 w-full max-w-md" /></div>)}</div>
          ) : !schema.data ? (
            <EmptyState icon={<FileText />} title={t('clinical.lab.noSchema')} description={t('clinical.lab.noSchemaHint')} />
          ) : (
            <DynamicForm schema={schema.data} values={values} onChange={(v) => { setValues(v); if (Object.keys(errors).length) setErrors(validateValues(schema.data!, v)) }} patient={patientCtx} readOnly={readOnly} errors={errors} autoFocusFirst={canWrite && it.status !== 'submitted'} />
          )}
        </Card>

        {/* Side panel */}
        <div className="lg:sticky lg:top-20 lg:self-start">
          <Card className="flex flex-col gap-5">
            <PatientCard patient={patient.data} loading={patient.isLoading || order.isLoading} />
            <Field label={t('clinical.lab.labNote')} optionalText={t('common.optional')}>
              {(id) => <Textarea id={id} value={note} onChange={(e) => setNote(e.target.value)} readOnly={readOnly} placeholder={t('clinical.lab.labNotePlaceholder')} rows={3} className="min-h-[72px]" />}
            </Field>
            {it && (it.technicianName || it.enteredAt) && (
              <div className="text-[12.5px] text-ink-3">{t('clinical.lab.enteredBy', { name: it.technicianName ?? '—' })}</div>
            )}
            {!approved && (
              <div className="flex flex-col gap-2 border-t border-line pt-4">
                {canWrite && (
                  <Button onClick={() => void doSave()} loading={save.isPending} disabled={!dirty} leftIcon={<Save className="size-4" />} block>
                    <span className="flex-1 text-left">{t('common.save')}</span>
                    <span className="rounded border border-white/25 px-1.5 text-[10.5px] font-normal tabular opacity-80">Ctrl+S</span>
                  </Button>
                )}
                {canSubmit && (
                  <Button variant={submitted ? 'secondary' : 'soft'} onClick={() => void doSubmit()} loading={submit.isPending} disabled={!it || (it.status === 'pending' && !dirty)} leftIcon={submitted ? <Undo2 className="size-4" /> : <Send className="size-4" />} block>
                    {submitted ? t('clinical.lab.unsubmit') : t('clinical.lab.submit')}
                  </Button>
                )}
                {!canWrite && !canSubmit && <p className="text-[12.5px] text-ink-3">{t('common.noAccess')}</p>}
                <AnimatePresence>
                  {dirty && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center text-[12px] text-warn">{t('common.unsaved')}</motion.p>}
                </AnimatePresence>
              </div>
            )}
            {approved && it && (
              <div className="flex items-center gap-2 rounded-lg bg-ok-soft/60 px-3 py-2 text-[13px] text-ok"><FileCheck2 className="size-4" />{t('clinical.lab.readOnlyApproved')}</div>
            )}
          </Card>
        </div>
      </div>

      <ConfirmDialog open={guard.blocked} onClose={guard.reset} onConfirm={guard.proceed} title={t('common.unsaved')} description={t('common.leaveConfirm')} confirmText={t('clinical.lab.leave')} cancelText={t('clinical.lab.stay')} danger />

      <Modal open={docOpen} onClose={() => setDocOpen(false)} title={doc.data?.title ?? t('clinical.lab.viewDocument')} size="xl">
        {it && (
          <DocumentPreview companyId={companyId} item={it} order={order.data?.order} patient={patient.data} schema={schema.data} fixedTemplate={docTemplate.data} showTemplateSelect={false} />
        )}
      </Modal>
    </Page>
  )
}
