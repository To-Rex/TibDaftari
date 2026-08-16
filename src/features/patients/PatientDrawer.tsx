/**
 * Drawer that hosts PatientForm for create/edit. On create it checks for
 * probable duplicates (phone/passport/PINFL) and lets the user open the
 * existing patient instead, or proceed anyway.
 */
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion } from 'motion/react'
import { AlertTriangle, ArrowRight } from 'lucide-react'
import { repos } from '@/data'
import type { Id, Patient, PatientUpsertInput } from '@/domain'
import { Avatar, Button, Drawer, toast } from '@/shared/ui'
import { errorMessage } from '@/shared/lib/errors'
import { fmtPhone } from '@/shared/lib/format'
import { PatientForm } from './PatientForm'
import { useCreatePatient, useUpdatePatient } from './queries'

type Draft = Pick<PatientUpsertInput, 'phone' | 'passportNumber' | 'pinfl'>

export interface PatientDrawerProps {
  open: boolean
  onClose: () => void
  companyId: Id
  /** when set, the drawer edits this patient; otherwise creates a new one */
  patient?: Patient | null
  onSaved: (p: Patient) => void
  /** invoked when the user picks an existing duplicate instead of creating */
  onPickExisting?: (p: Patient) => void
}

const FORM_ID = 'patient-form'

export function PatientDrawer({ open, onClose, companyId, patient, onSaved, onPickExisting }: PatientDrawerProps) {
  const { t } = useTranslation()
  const create = useCreatePatient(companyId)
  const update = useUpdatePatient(patient?.id ?? '')
  const [dupes, setDupes] = useState<Patient[]>([])
  const [checking, setChecking] = useState(false)
  const [draft, setDraft] = useState<Draft>({ phone: '' })
  const editing = !!patient

  useEffect(() => { if (!open) { setDupes([]); setDraft({ phone: '' }) } }, [open])
  const onDraftChange = useCallback((d: Draft) => setDraft(d), [])

  // live duplicate check while typing (create mode only)
  useEffect(() => {
    if (editing || !open) return
    const has = draft.phone || (draft.passportNumber && draft.passportNumber.length >= 9) || (draft.pinfl && draft.pinfl.length === 14)
    if (!has) { setDupes([]); return }
    let alive = true
    const h = setTimeout(() => {
      void repos.patients.findDuplicates(companyId, draft).then((r) => { if (alive) setDupes(r) }).catch(() => undefined)
    }, 350)
    return () => { alive = false; clearTimeout(h) }
  }, [draft, companyId, editing, open])

  const submit = async (input: PatientUpsertInput) => {
    try {
      if (editing) {
        const p = await update.mutateAsync(input)
        toast.success(t('staff.patients.form.savedEdit'))
        onSaved(p)
      } else {
        setChecking(true)
        const found = await repos.patients.findDuplicates(companyId, input)
        setChecking(false)
        if (found.length && !dupes.length) { setDupes(found); return }
        const p = await create.mutateAsync(input)
        toast.success(t('staff.patients.form.savedNew'), p.fullName)
        onSaved(p)
      }
    } catch (e) {
      setChecking(false)
      toast.error(errorMessage(e))
    }
  }
  const busy = create.isPending || update.isPending || checking

  return (
    <Drawer open={open} onClose={onClose} width="max-w-2xl"
      title={editing ? t('staff.patients.form.titleEdit') : t('staff.patients.form.titleNew')}
      description={editing ? patient?.fullName : t('staff.patients.form.subtitleNew')}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button>
          <Button type="submit" form={FORM_ID} loading={busy} size="lg" className="min-w-40">
            {editing ? t('common.save') : dupes.length ? t('staff.patients.form.createAnyway') : t('staff.patients.form.create')}
          </Button>
        </>
      }
    >
      <AnimatePresence initial={false}>
        {!editing && dupes.length > 0 && (
          <motion.div key="dupes" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }} className="overflow-hidden">
            <div className="mb-6 rounded-[var(--radius)] border border-warn/30 bg-warn-soft/60 p-4">
              <div className="flex items-center gap-2 text-[13.5px] font-semibold text-warn">
                <AlertTriangle className="size-4" /> {t('staff.patients.form.dupTitle')}
              </div>
              <p className="mt-1 text-[12.5px] text-ink-2">{t('staff.patients.form.dupHint')}</p>
              <ul className="mt-3 flex flex-col gap-1.5">
                {dupes.slice(0, 4).map((p) => (
                  <li key={p.id}>
                    <button type="button" onClick={() => onPickExisting?.(p)} className="group flex w-full items-center gap-3 rounded-lg bg-surface px-3 py-2 text-left shadow-1 transition-[transform,box-shadow] hover:-translate-y-px hover:shadow-2">
                      <Avatar name={p.fullName} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13.5px] font-medium">{p.fullName}</span>
                        <span className="block text-[12px] text-ink-3 tabular">{fmtPhone(p.phone)}{p.passportNumber ? ` · ${p.passportNumber}` : ''}</span>
                      </span>
                      <span className="flex items-center gap-1 text-[12.5px] font-medium text-brand-ink opacity-0 transition-opacity group-hover:opacity-100">{t('staff.patients.form.openExisting')} <ArrowRight className="size-3.5" /></span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <PatientForm key={patient?.id ?? "new"} formId={FORM_ID} patient={patient} onSubmit={(v) => void submit(v)} onDraftChange={editing ? undefined : onDraftChange} />
    </Drawer>
  )
}
